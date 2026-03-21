import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Linking } from "react-native";
import TrackPlayer from "react-native-track-player";
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

const AudioPlayer = ({ baniID, title, webViewRef }) => {
  const dispatch = useDispatch();
  const defaultAudio = useSelector((state) => state.defaultAudio);
  const hasSavedTrackForCurrentBani = Boolean(defaultAudio?.[baniID]?.id);
  const [showTrackModal, setShowTrackModal] = useState(!hasSavedTrackForCurrentBani);
  const [isPlayerActionLoading, setIsPlayerActionLoading] = useState(false);
  const [seekSyncRequest, setSeekSyncRequest] = useState(null);
  const isAudioAutoPlay = useSelector((state) => state.isAudioAutoPlay);
  const audioPlaybackSpeed = useSelector((state) => state.audioPlaybackSpeed);
  const [hasAutoRestoredView, setHasAutoRestoredView] = useState(false);
  const {
    isPlaying,
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
          currentPlaying.displayName,
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
      if (!isAudioAutoPlay || !showTrackModal || !isAudioEnabled || isTracksLoading) {
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
          firstPlayableTrack.displayName,
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
    const hasSavedDefaultTrack = Boolean(defaultAudio?.[baniID]?.id);

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
    setShowTrackModal(true);
  }, [stop, reset]);

  const handleTrackSelect = useCallback(
    async (selectedTrack) => {
      try {
        // Early return if selectedTrack is null or undefined
        if (!selectedTrack) {
          return;
        }

        const previousTrack = currentPlaying;
        const previousPosition = progress?.position;

        // Stop current playback
        await stop();

        // Set the new track as current and close modal together
        setCurrentPlaying(selectedTrack);
        setShowTrackModal(false);
        setHasAutoRestoredView(true);
        // Set the new track as current
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

        // Dispatch action
        dispatch(setDefaultAudio(selectedTrack, baniID));

        // After selecting a track (including from preview -> Next), enter full player
        // with playback already running so no extra Play tap is required.
        if (isAudioEnabled) {
          setIsPlayerActionLoading(true);
          await addAndPlayTrack(
            selectedTrack.id,
            selectedTrack.audioUrl,
            selectedTrack.displayName,
            selectedTrack.displayName,
            selectedTrack.lyricsUrl,
            selectedTrack.trackLengthSec,
            selectedTrack.trackSizeMB,
            isAudioAutoPlay, // Respect autoplay setting — don't start if autoplay is off
            selectedTrack.remoteUrl || selectedTrack.audioUrl
          );
          setIsPlayerActionLoading(false);
        }

      } catch (error) {
        logError("Error switching track:", error);
        showErrorToast(`${STRINGS.UNABLE_TO_SWITCH_TRACK} ${STRINGS.PLEASE_TRY_AGAIN}`);
        setIsPlayerActionLoading(false);
      }
    },
    [baniID, isAudioEnabled, isAudioAutoPlay, currentPlaying, progress?.position]
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
      return (
        <ErrorFallback
          title={STRINGS.WE_DO_NOT_HAVE_AUDIOS_FOR}
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
        tracks={tracks}
        onCloseTrackModal={onCloseTrackModal}
        addAndPlayTrack={addAndPlayTrack}
        stop={stop}
        reset={reset}
        isPlaying={isPlaying}
      />
    );
  }, [tracks, title, baniID, isPlaying]);

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
      handlePlayPause={handlePlayPause}
      progress={progress}
      handleSeek={handleSeek}
      isAudioEnabled={isAudioEnabled}
      title={title}
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
