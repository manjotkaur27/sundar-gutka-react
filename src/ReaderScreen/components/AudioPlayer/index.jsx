import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Linking } from "react-native";
import TrackPlayer from "react-native-track-player";
import { useIsFocused } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import {
  toggleAudio,
  setDefaultAudio,
  setAudioProgress,
} from "@common/actions";
import { showErrorToast } from "@common/toast";
import { STRINGS, logError, trackAudioEvent } from "@common";
import { AudioTrackDialog, AudioControlBar, ErrorFallback, Loading } from "./components";
import { useTrackPlayer, useAudioSyncScroll, useAudioManifest } from "./hooks";
import { getSequenceFromPosition } from "./utils/getSequenceFromPosition";

const AudioPlayer = ({ baniID, title, notificationTitle, webViewRef }) => {
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const defaultAudio = useSelector((state) => state.defaultAudio);
  const hasSavedTrackForCurrentBani = Boolean(defaultAudio?.[baniID]?.id);
  const [showTrackModal, setShowTrackModal] = useState(!hasSavedTrackForCurrentBani);
  const [isPlayerActionLoading, setIsPlayerActionLoading] = useState(false);
  const [seekSyncRequest, setSeekSyncRequest] = useState(null);
  // Guard ref: prevents the safe-exit effect from reopening the modal during
  // an active handleTrackSelect transition (React state + Redux dispatch can
  // commit in separate render batches, causing a false-positive defaultAudioWiped).
  const isSelectingTrackRef = useRef(false);
  const isAudioAutoPlay = useSelector((state) => state.isAudioAutoPlay);
  const audioPlaybackSpeed = useSelector((state) => state.audioPlaybackSpeed);
  const [hasAutoRestoredView, setHasAutoRestoredView] = useState(false);
  const {
    isPlaying,
    isBuffering,
    progress,
    play,
    pause,
    stop,
    addAndPlayTrack,
    seekTo,
    setRate,
    isAudioEnabled,
    isInitialized,
    reset,
    isInitializing,
    retryInitialization,
    skipNextLoadRef,
  } = useTrackPlayer();
  const {
    tracks,
    currentPlaying,
    setCurrentPlaying,
    isTracksLoading,
    addTrackToManifest,
    isTrackDownloaded,
    manifestError,
    refetchManifest,
    isAudioUnavailableForCurrentLengthOnly,
  } = useAudioManifest(baniID);

  // Disable sync scroll while preview modal is open to prevent stale lyrics
  // from a previously selected track driving WebView scroll.
  useAudioSyncScroll(
    progress,
    !showTrackModal && isPlaying,
    webViewRef,
    showTrackModal ? null : currentPlaying?.lyricsUrl,
    seekSyncRequest
  );

  // Apply saved playback speed when initialized
  useEffect(() => {
    if (isInitialized && audioPlaybackSpeed && setRate) {
      setRate(audioPlaybackSpeed);
    }
  }, [isInitialized, audioPlaybackSpeed, setRate]);

  const handlePlayPause = async () => {
    if (!isInitialized || !isAudioEnabled || !currentPlaying) {
      return;
    }

    try {
      setIsPlayerActionLoading(true);
      if (isPlaying) {
        await pause();
      } else {
        // Check if there's already a track loaded in the queue
        const currentTrack = await TrackPlayer.getActiveTrack();
        // If the current track matches what we want to play, just resume
        if (currentTrack && currentTrack.id === currentPlaying.id) {
          await play();
          return;
        }

        // Track not loaded, add and play it
        await addAndPlayTrack(
          currentPlaying.id,
          currentPlaying.audioUrl,
          notificationTitle || title,
          currentPlaying.displayName,
          currentPlaying.lyricsUrl,
          currentPlaying.trackLengthSec,
          currentPlaying.trackSizeMB,
          true,
          currentPlaying.remoteUrl || currentPlaying.audioUrl
        );
      }
    } catch (error) {
      logError("Error in handlePlayPause:", error);
      showErrorToast(`${STRINGS.UNABLE_TO_PLAY} ${STRINGS.PLEASE_TRY_AGAIN}`);
    } finally {
      setIsPlayerActionLoading(false);
    }
  };

  const onCloseTrackModal = useCallback(async () => {
    if (isPlaying) {
      await stop();
    }
    dispatch(toggleAudio(false));
  }, [isPlaying]);

  useEffect(() => {
    const autoStartFirstTrack = async () => {
      // Don't auto-start playback while the screen is not focused (e.g. user
      // is on Settings and changed bani length). Playback will start when
      // the user navigates back and isFocused flips to true.
      if (!isFocused || !isAudioAutoPlay || !showTrackModal || !isAudioEnabled || isTracksLoading) {
        return;
      }
      if (currentPlaying || (defaultAudio[baniID] && defaultAudio[baniID].audioUrl)) {
        return;
      }
      if (!tracks || tracks.length === 0) {
        return;
      }

      const firstPlayableTrack = tracks.find((track) => track?.audioUrl);
      if (!firstPlayableTrack) {
        return;
      }

      try {
        setIsPlayerActionLoading(true);
        await handleTrackSelect(firstPlayableTrack);
        await addAndPlayTrack(
          firstPlayableTrack.id,
          firstPlayableTrack.audioUrl,
          notificationTitle || title,
          firstPlayableTrack.displayName,
          firstPlayableTrack.lyricsUrl,
          firstPlayableTrack.trackLengthSec,
          firstPlayableTrack.trackSizeMB,
          true,
          firstPlayableTrack.remoteUrl || firstPlayableTrack.audioUrl
        );
      } catch (error) {
        logError("Error auto-starting first track:", error);
      } finally {
        setIsPlayerActionLoading(false);
      }
    };

    autoStartFirstTrack();
  }, [
    isFocused,
    isAudioAutoPlay,
    showTrackModal,
    isAudioEnabled,
    isTracksLoading,
    tracks,
    currentPlaying,
    defaultAudio,
    baniID,
    handleTrackSelect,
    addAndPlayTrack,
  ]);

  useEffect(() => {
    if (hasAutoRestoredView || !showTrackModal) {
      return;
    }

    const hasTracks = Array.isArray(tracks) && tracks.length > 0;
    const hasCurrentTrack = Boolean(currentPlaying?.id);
    const hasSavedDefaultTrack = Boolean(
      defaultAudio?.[baniID]?.id &&
      tracks?.some((t) => String(t.artistID) === String(defaultAudio[baniID].artistID))
    );

    if (hasTracks && (hasCurrentTrack || hasSavedDefaultTrack)) {
      setShowTrackModal(false);
      setHasAutoRestoredView(true);
    }
  }, [
    hasAutoRestoredView,
    showTrackModal,
    tracks,
    currentPlaying?.id,
    defaultAudio,
    baniID,
  ]);

  // Safe-exit: fires when bani length changes and the new track list no longer
  // includes the currently playing artist (e.g. InderMohan on Long/XL) or is
  // empty (XL — no artist recorded the opening Dohra). In both cases we stop
  // audio, clear currentPlaying, and return to the track-selection modal so the
  // user sees either the unavailable message or the valid artists for this length.
  useEffect(() => {
    if (isTracksLoading) return;
    // Skip while a track selection is in progress — React state (currentPlaying)
    // may have committed before the Redux dispatch (setDefaultAudio) propagates
    // through useSelector, which would cause a false-positive defaultAudioWiped.
    if (isSelectingTrackRef.current) return;

    const tracksEmpty = !Array.isArray(tracks) || tracks.length === 0;
    const currentArtistTrackInNewManifest = 
      currentPlaying?.artistID != null && Array.isArray(tracks)
        ? tracks.find((t) => String(t.artistID) === String(currentPlaying.artistID))
        : null;

    const currentArtistGone =
      currentPlaying?.artistID != null &&
      Array.isArray(tracks) &&
      tracks.length > 0 &&
      !currentArtistTrackInNewManifest;

    const currentTrackUrlChanged =
      currentArtistTrackInNewManifest != null &&
      currentPlaying?.audioUrl != null &&
      currentArtistTrackInNewManifest.audioUrl !== currentPlaying.audioUrl;

    // If the component remounted (e.g. returning from Settings), currentPlaying 
    // initializes to null. If the modal is hidden (because the app expected 
    // defaultAudio to be valid), but the saved artist is actually invalid for 
    // this length, we are stuck on a blank player. Force the modal open.
    const isStuckOnBlankPlayer =
      !showTrackModal &&
      !currentPlaying?.id &&
      Array.isArray(tracks) &&
      tracks.length > 0 &&
      !Boolean(
        defaultAudio?.[baniID]?.id &&
        tracks.some((t) => String(t.artistID) === String(defaultAudio[baniID].artistID))
      );

    // If defaultAudio for this bani was wiped from Redux (e.g., due to a bani length change),
    // we must exit and reset the player to show the modal again.
    const defaultAudioWiped = currentPlaying?.id != null && !defaultAudio?.[baniID]?.id;

    const needsExit = tracksEmpty || currentArtistGone || currentTrackUrlChanged || isStuckOnBlankPlayer || defaultAudioWiped;

    // Only execute if we actually need to change state (prevents infinite loop of stop/reset)
    if (needsExit && (!showTrackModal || currentPlaying != null)) {
      // Stop and reset the player silently, then surface the selection UI.
      (async () => {
        try { await stop(); } catch (_) {}
        try { await reset(); } catch (_) {}
      })();
      setCurrentPlaying(null);
      setShowTrackModal(true);
      setHasAutoRestoredView(true); // prevent autoRestore from hiding the modal immediately
    }
  }, [tracks, isTracksLoading, showTrackModal, currentPlaying?.id, defaultAudio, baniID]);


  const handleSeek = async (value) => {
    if (!isAudioEnabled || !isInitialized) return;
    try {
      setSeekSyncRequest({
        position: value,
        ts: Date.now(),
      });
      await seekTo(value);
    } catch (error) {
      logError("Error seeking:", error);
      showErrorToast(`${STRINGS.UNABLE_TO_SEEK} ${STRINGS.PLEASE_TRY_AGAIN}`);
    }
  };

  const handleReopenPreviewModal = useCallback(async () => {
    try {
      await stop();
    } catch (_) {
      // Best effort shutdown before returning to preview chooser.
    }
    try {
      await reset();
    } catch (_) {
      // Best effort hard reset so no stale queue/notification survives.
    }
    // Mark as restored so the autoRestoreView effect doesn't immediately
    // close the dialog it was just asked to open (first-tap blink fix).
    setHasAutoRestoredView(true);
    setShowTrackModal(true);
  }, [stop, reset]);

  const handleTrackSelect = useCallback(
    async (selectedTrack) => {
      try {
        // Early return if selectedTrack is null or undefined
        if (!selectedTrack) {
          return;
        }

        isSelectingTrackRef.current = true;

        const previousTrack = currentPlaying;
        const previousPosition = progress?.position;

        // Stop current playback and reset queue so same-track reopening
        // doesn't retain old timeline/state (critical for preview -> full play transition)
        await stop();
        await reset();

        // Save current sequence before switching artists
        if (previousTrack?.id && previousPosition != null) {
          let currentSequence = null;
          if (previousTrack?.lyricsUrl) {
            currentSequence = await getSequenceFromPosition(previousTrack.lyricsUrl, previousPosition);
          }

          dispatch(
            setAudioProgress(baniID, previousTrack.id, previousPosition, currentSequence)
          );
        }

        // Dispatch Redux action BEFORE setting React state so that when the
        // safe-exit effect runs, defaultAudio is already up-to-date and the
        // defaultAudioWiped check doesn't false-positive.
        dispatch(setDefaultAudio(selectedTrack, baniID));

        // Set the new track as current and close modal together
        setCurrentPlaying(selectedTrack);
        setShowTrackModal(false);
        setHasAutoRestoredView(true);

        // After selecting a track (including from preview -> Next), enter full player
        // with playback already running so no extra Play tap is required.
        // Don't actually start playback if screen is not focused (e.g. bani
        // length changed while on Settings) — defer to focus-based auto-resume.
        if (isAudioEnabled) {
          const shouldPlay = isAudioAutoPlay && isFocused;
          setIsPlayerActionLoading(true);
          await addAndPlayTrack(
            selectedTrack.id,
            selectedTrack.audioUrl,
            notificationTitle || title,
            selectedTrack.displayName,
            selectedTrack.lyricsUrl,
            selectedTrack.trackLengthSec,
            selectedTrack.trackSizeMB,
            shouldPlay,
            selectedTrack.remoteUrl || selectedTrack.audioUrl
          );
          setIsPlayerActionLoading(false);
        }

      } catch (error) {
        logError("Error switching track:", error);
        showErrorToast(`${STRINGS.UNABLE_TO_SWITCH_TRACK} ${STRINGS.PLEASE_TRY_AGAIN}`);
        setIsPlayerActionLoading(false);
      } finally {
        isSelectingTrackRef.current = false;
      }
    },
    [baniID, isAudioEnabled, isAudioAutoPlay, isFocused, currentPlaying, progress?.position]
  );

  // Memoize error fallback renderer to prevent recreation
  const renderErrorFallback = useCallback(
    (message, retryFn) => (
      <ErrorFallback
        title={message}
        buttonPress={retryFn}
        buttonText={STRINGS.RETRY}
        handleClose={onCloseTrackModal}
      />
    ),
    []
  );

  // Memoize audio track dialog to prevent unnecessary re-renders
  const audioTrackDialog = useMemo(() => {
    if (!tracks || tracks.length === 0) {
      const titleString = isAudioUnavailableForCurrentLengthOnly
        ? STRINGS.WE_DO_NOT_HAVE_AUDIOS_FOR_THIS_LENGTH
        : STRINGS.WE_DO_NOT_HAVE_AUDIOS_FOR;

      return (
        <ErrorFallback
          title={titleString}
          baniTitle={title}
          buttonPress={async () => {
            try {
              await trackAudioEvent("requestAudioLink", title || "unknown");
              await Linking.openURL("https://khalisfoundation.org");
            } catch (error) {
              // Fallback: try opening the URL again if first attempt fails
              try {
                await Linking.openURL("https://khalisfoundation.org");
              } catch (fallbackError) {
                // Silently handle error - user may have no browser/app to handle URL
                console.warn("Failed to open URL:", fallbackError);
              }
            }
          }}
          buttonText={STRINGS.REQUEST_AUDIO_FOR_THIS_PAATH}
          handleClose={onCloseTrackModal}
        />
      );
    }
    return (
      <AudioTrackDialog
        baniID={baniID}
        handleTrackSelect={handleTrackSelect}
        title={title}
        notificationTitle={notificationTitle || title}
        tracks={tracks}
        onCloseTrackModal={onCloseTrackModal}
        addAndPlayTrack={addAndPlayTrack}
        stop={stop}
        reset={reset}
        isPlaying={isPlaying}
      />
    );
  }, [tracks, title, baniID, isPlaying, isAudioUnavailableForCurrentLengthOnly]);

  // Don't render if TrackPlayer is not initialized
  if (!isInitialized && !isInitializing) {
    return renderErrorFallback(STRINGS.INITIALIZING_AUDIO_PLAYER, retryInitialization);
  }

  if (manifestError) {
    return renderErrorFallback(STRINGS.NETWORK_ERROR, refetchManifest);
  }

  if (isInitializing || isTracksLoading) {
    return <Loading />;
  }

  return showTrackModal ? (
    audioTrackDialog
  ) : (
    <AudioControlBar
      baniID={baniID}
      handleTrackSelect={handleTrackSelect}
      isPlaying={isPlaying}
      isBuffering={isBuffering}
      handlePlayPause={handlePlayPause}
      progress={progress}
      handleSeek={handleSeek}
      isAudioEnabled={isAudioEnabled}
      title={title}
      notificationTitle={notificationTitle || title}
      currentPlaying={currentPlaying}
      onCloseTrackModal={onCloseTrackModal}
      addTrackToManifest={addTrackToManifest}
      isTrackDownloaded={isTrackDownloaded}
      tracks={tracks}
      seekTo={seekTo}
      reset={reset}
      pause={pause}
      setRate={setRate}
      isInitialized={isInitialized}
      addAndPlayTrack={addAndPlayTrack}
      play={play}
      isPlayerActionLoading={isPlayerActionLoading}
      onReopenPreviewModal={handleReopenPreviewModal}
      skipNextLoadRef={skipNextLoadRef}
    />
  );
};

AudioPlayer.propTypes = {
  baniID: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  webViewRef: PropTypes.shape({
    current: PropTypes.shape({
      postMessage: PropTypes.func,
    }),
  }).isRequired,
};

export default AudioPlayer;
