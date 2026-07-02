import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Pressable, Platform, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSelector } from "react-redux";
import TrackPlayer, { State } from "react-native-track-player";
import { BlurView } from "@react-native-community/blur";
import PropTypes from "prop-types";
import useTheme, { useNetwork } from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { ArrowRightIcon, CloseIcon } from "@common/icons";
import { STRINGS, CustomText } from "@common";
import { audioTrackDialogStyles } from "../../style";
import ScrollViewComponent, { isOfflineAvailable } from "../ScrollViewComponent";

const PREVIEW_DURATION_MS = 15000;
const ACTIVE_TRACK_POLL_MS = 150;
// M4A containers require moov atom parsing before ExoPlayer can begin
// buffering. On mobile networks this can take 10-20+ seconds for 15-20MB files.
// 30s accommodates slow 3G connections; MP3 would start within 1-2s.
const PREVIEW_LOAD_TIMEOUT_MS = 30000;

const AudioTrackDialog = ({
  handleTrackSelect,
  title = "",
  notificationTitle = "",
  tracks = [],
  onCloseTrackModal,
  isHeader = true,
  isFooter = true,
  addAndPlayTrack,
  stop,
  reset,
  isPlaying,
}) => {
  const styles = useThemedStyles(audioTrackDialogStyles);
  const fontFace = useSelector((state) => state.fontFace);
  const downloadRegistry = useSelector((state) => state.downloadRegistry);
  const { theme } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  // Single source of truth (NetworkProvider): real-time and captive-portal
  // aware. `isOffline` stays false during the unknown startup window, so tracks
  // are never falsely greyed.
  const { isOffline } = useNetwork();
  // Banner shows only when offline AND at least one track can't be played offline.
  const hasUnplayableOffline =
    isOffline && tracks.some((t) => !isOfflineAvailable(t, downloadRegistry));
  const [selectedTrack, setSelectedTrack] = useState(null);
  const selectedTrackRef = useRef(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [previewLoadingTrackId, setPreviewLoadingTrackId] = useState(null);
  const [previewActiveTrackId, setPreviewActiveTrackId] = useState(null);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewRemainingSec, setPreviewRemainingSec] = useState(
    PREVIEW_DURATION_MS / 1000
  );
  const previewTimeoutRef = useRef(null);
  const previewStartTimeoutRef = useRef(null);
  const previewIntervalRef = useRef(null);
  const previewStartedAtRef = useRef(0);
  const previewSessionRef = useRef(0);
  const previewActionInFlightRef = useRef(false);

  const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

  /**
   * Check the track's current load state. Returns:
   * - 'playing'  — audio is audible to the user (State.Playing)
   * - 'loading'  — track is active and buffering/ready (M4A moov parsing, data streaming)
   * - 'inactive' — track is not active or in a non-progress state (None/Stopped/etc.)
   */
  const getTrackLoadState = async (trackId) => {
    try {
      const [activeTrack, playbackState] = await Promise.all([
        TrackPlayer.getActiveTrack(),
        TrackPlayer.getPlaybackState(),
      ]);

      const isTargetActive =
        activeTrack?.id != null && String(activeTrack.id) === String(trackId);
      if (!isTargetActive) {
        return "inactive";
      }

      const currentState = playbackState?.state;

      if (currentState === State.Playing) {
        return "playing";
      }

      // Buffering/Ready = the track is actively loading (M4A moov parse,
      // data streaming). The load is alive — don't kill it with a timeout,
      // but don't start the preview countdown yet either.
      if (
        currentState === State.Buffering ||
        currentState === State.Ready ||
        currentState === "ready"
      ) {
        return "loading";
      }

      return "inactive";
    } catch (_) {
      return "inactive";
    }
  };

  /**
   * Wait for the track to reach State.Playing (audio audible).
   * While the track is in Buffering/Ready ("loading"), the timeout resets
   * so M4A moov atom parsing doesn't get killed prematurely.
   * The timeout only fires when the track is truly inactive (not loading at all).
   */
  const waitForPlaybackStart = async (trackId, sessionId, timeoutMs = PREVIEW_LOAD_TIMEOUT_MS) => {
    let lastProgressAt = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (previewSessionRef.current !== sessionId) {
        return false;
      }
      const elapsed = Date.now() - lastProgressAt;
      if (elapsed >= timeoutMs) {
        return false;
      }

      // eslint-disable-next-line no-await-in-loop
      const loadState = await getTrackLoadState(trackId);

      if (previewSessionRef.current !== sessionId) {
        return false;
      }

      if (loadState === "playing") {
        return true; // Audio is audible — start the preview timer now
      }

      if (loadState === "loading") {
        // Track is alive and buffering — reset timeout so we don't kill
        // a healthy M4A moov parse that's just slow on mobile network.
        lastProgressAt = Date.now();
      }
      // If 'inactive': don't reset — let the timeout count down.

      // eslint-disable-next-line no-await-in-loop
      await wait(ACTIVE_TRACK_POLL_MS);
    }
  };

  const clearPreviewTimeout = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  const clearPreviewInterval = useCallback(() => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
  }, []);

  const clearPreviewStartTimeout = useCallback(() => {
    if (previewStartTimeoutRef.current) {
      clearTimeout(previewStartTimeoutRef.current);
      previewStartTimeoutRef.current = null;
    }
  }, []);

  const resetPreviewProgress = useCallback(() => {
    setPreviewProgress(0);
    setPreviewRemainingSec(PREVIEW_DURATION_MS / 1000);
  }, []);

  /**
   * The preview ticker is the single source of truth for both the visual
   * countdown AND the 15-second stop. When elapsed reaches PREVIEW_DURATION_MS,
   * the interval itself stops the audio. This guarantees the countdown shows 0
   * at exactly the moment audio stops — no separate setTimeout that can drift.
   */
  const startPreviewTicker = useCallback(
    (track, sessionId) => {
      clearPreviewInterval();
      previewStartedAtRef.current = Date.now();
      setPreviewProgress(0);
      setPreviewRemainingSec(PREVIEW_DURATION_MS / 1000);

      previewIntervalRef.current = setInterval(async () => {
        const elapsed = Date.now() - previewStartedAtRef.current;
        const clampedElapsed = Math.min(elapsed, PREVIEW_DURATION_MS);
        const remainingMs = Math.max(0, PREVIEW_DURATION_MS - clampedElapsed);

        setPreviewProgress(clampedElapsed / PREVIEW_DURATION_MS);
        setPreviewRemainingSec(Math.ceil(remainingMs / 1000));

        // Time's up — stop audio from within the same tick that shows 0
        if (clampedElapsed >= PREVIEW_DURATION_MS) {
          clearPreviewInterval();
          if (previewSessionRef.current !== sessionId) return;
          try { await stop(); } catch (_) {}
          try { await reset(); } catch (_) {}
          await restoreNotificationCapabilities();
          resetPreviewProgress();
          setPreviewLoadingTrackId(null);
          setPreviewActiveTrackId(null);
          setPlayingTrack((current) => (current?.id === track.id ? null : current));
        }
      }, 250);
    },
    [clearPreviewInterval, stop, reset, restoreNotificationCapabilities, resetPreviewProgress]
  );

  // Restore full notification capabilities after a preview ends.
  // Called after stop()+reset() so there is no queue left to show controls for,
  // but this also guards against any race where the notification lingers.
  const restoreNotificationCapabilities = useCallback(async () => {
    try {
      const { Capability } = require("react-native-track-player"); // eslint-disable-line
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      });
    } catch (_) {
      // Non-critical: full controls will be restored on next normal playback setup.
    }
  }, []);

  const stopPreview = useCallback(async () => {
    previewSessionRef.current += 1;
    clearPreviewTimeout();
    clearPreviewStartTimeout();
    clearPreviewInterval();
    try {
      await stop();
    } catch (_) {
      // Best effort stop for preview cleanup.
    }
    try {
      await reset();
    } catch (_) {
      // Best effort hard reset for stale notification/queue cleanup.
    }
    // Restore full capabilities so normal playback keeps its notification controls.
    await restoreNotificationCapabilities();
    resetPreviewProgress();
    setPreviewLoadingTrackId(null);
    setPreviewActiveTrackId(null);
    setPlayingTrack(null);
  }, [
    clearPreviewTimeout,
    clearPreviewStartTimeout,
    clearPreviewInterval,
    stop,
    reset,
    restoreNotificationCapabilities,
    resetPreviewProgress,
  ]);

  /**
   * Start the 15-second preview window. Called only AFTER audio is confirmed
   * playing (State.Playing + position > 0). The ticker handles both the visual
   * countdown and the auto-stop — no separate timeout needed.
   */
  const startPreviewWindow = useCallback(
    (track, sessionId) => {
      if (!track?.id) {
        return;
      }

      setPreviewActiveTrackId(track.id);
      clearPreviewTimeout();
      startPreviewTicker(track, sessionId);
    },
    [startPreviewTicker, clearPreviewTimeout]
  );

  useEffect(() => {
    return () => {
      clearPreviewTimeout();
      clearPreviewStartTimeout();
      clearPreviewInterval();
    };
  }, [clearPreviewTimeout, clearPreviewStartTimeout, clearPreviewInterval]);

  const handleSelectTrack = async (track) => {
    if (isNextLoading) return;
    if (!track?.id || previewActionInFlightRef.current) {
      return;
    }
    if (previewLoadingTrackId && previewLoadingTrackId === track?.id) {
      return;
    }
    previewActionInFlightRef.current = true;
    const sessionId = previewSessionRef.current + 1;
    previewSessionRef.current = sessionId;
    
    selectedTrackRef.current = track;
    setSelectedTrack(track);
    
    setPreviewActiveTrackId(null);

    if (!isHeader) {
      await handleTrackSelect(track);
      return;
    }

    if (playingTrack?.id === track.id && isPlaying) {
      await stopPreview();
      setSelectedTrack(null);
      previewActionInFlightRef.current = false;
      return;
    }

    try {
      // ── Guaranteed clean slate before every preview ──────────────────────
      // A previously aborted preview (e.g. tapping Play then instantly Next)
      // can leave stale in-flight native stop/reset/add calls and preview
      // state behind, which then wedges the next preview of the same
      // (downloaded) track. Deterministically clear every piece of preview
      // state and hard-reset the player so each preview starts from zero.
      setPreviewLoadingTrackId(track.id);
      setPreviewActiveTrackId(null);
      setPlayingTrack(null);
      resetPreviewProgress();
      clearPreviewTimeout();
      clearPreviewStartTimeout();
      clearPreviewInterval();

      try {
        await stop();
      } catch (_) {
        // Best effort stop before starting a new preview.
      }

      try {
        await reset();
      } catch (_) {
        // Best effort reset before starting a new preview.
      }

      // If a newer action (another tap, or Next) superseded this one during
      // the stop/reset awaits, bail before touching playback further.
      if (previewSessionRef.current !== sessionId) {
        setPreviewLoadingTrackId(null);
        return;
      }

      // Strip all notification-bar controls so the user cannot interact
      // with pause/play/seek from the OS notification during a preview.
      try {
        await TrackPlayer.updateOptions({ capabilities: [], compactCapabilities: [] });
      } catch (_) {
        // Non-critical — preview audio still plays without notification controls.
      }

      await addAndPlayTrack(
        track.id,
        track.audioUrl,
        notificationTitle || title,
        track.displayName,
        track.lyricsUrl,
        track.trackLengthSec,
        track.trackSizeMB,
        true,
        track.remoteUrl || track.audioUrl
      );

      if (previewSessionRef.current !== sessionId) {
        // Superseded mid-load — clear the loading flag so the same track can
        // be previewed again later (otherwise the guard above blocks it).
        setPreviewLoadingTrackId(null);
        return;
      }

      // Wait for audio to start buffering or playing.
      // M4A containers need longer to parse moov atom + buffer on Android.
      const playbackStarted = await waitForPlaybackStart(track.id, sessionId);

      if (playbackStarted && previewSessionRef.current === sessionId) {
        clearPreviewStartTimeout();
        setPreviewLoadingTrackId(null);
        setPlayingTrack(track);
        startPreviewWindow(track, sessionId);
      } else if (previewSessionRef.current === sessionId) {
        // Playback didn't start within the timeout — clean up
        setPreviewLoadingTrackId(null);
        setPreviewActiveTrackId(null);
        setPlayingTrack(null);
        resetPreviewProgress();
        try { await stop(); } catch (_) {}
        try { await reset(); } catch (_) {}
        await restoreNotificationCapabilities();
      }
    } catch (_) {
      clearPreviewTimeout();
      clearPreviewStartTimeout();
      clearPreviewInterval();
      resetPreviewProgress();
      setPreviewLoadingTrackId(null);
      setPreviewActiveTrackId(null);
      setPlayingTrack(null);
    } finally {
      previewActionInFlightRef.current = false;
    }
  };

  const handlePlay = async () => {
    const trackToPlay = selectedTrackRef.current || selectedTrack;
    if (trackToPlay) {
      setIsNextLoading(true);
      try {
        // Eagerly increment session ID so that if a preview is currently in `waitForPlaybackStart`,
        // it aborts immediately.
        previewSessionRef.current += 1;

        // Spin-wait for handleSelectTrack to finish its critical TrackPlayer operations (addAndPlayTrack)
        // so we don't cause a race condition with stopPreview()'s reset().
        while (previewActionInFlightRef.current) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        await stopPreview();
        await handleTrackSelect(trackToPlay);
      } finally {
        setIsNextLoading(false);
      }
    }
  };

  const isPreviewRunning = Boolean(
    selectedTrack && previewActiveTrackId && previewActiveTrackId === selectedTrack?.id
  );
  const nextButtonLabel = isPreviewRunning
    ? `${STRINGS.NEXT} (${previewRemainingSec}s)`
    : STRINGS.NEXT;

  return (
    <View style={styles.modalWrapper}>
      <View
        style={[
          styles.container,
          Platform.OS === "ios" ? styles.containerIOS : styles.containerAndroid,
          { maxHeight: windowHeight * 0.7 },
        ]}
      >
        {Platform.OS === "ios" && (
          <BlurView
            style={styles.blurOverlay}
            blurType={theme.mode === "dark" ? "dark" : "light"}
            blurAmount={10}
            reducedTransparencyFallbackColor={theme.colors.transparentOverlay}
          />
        )}

        <Pressable
          testID="close-button"
          style={styles.closeButton}
          onPress={() => {
            clearPreviewTimeout();
            setSelectedTrack(null);
            onCloseTrackModal();
          }}
        >
          <CloseIcon size={30} color={theme.colors.audioTitleText} />
        </Pressable>

        {isHeader && tracks.length > 0 && (
          <View style={styles.header}>
            <CustomText style={styles.welcomeText}>{STRINGS.welcome_to_sundar_gutka}</CustomText>
            <CustomText style={styles.subtitleText}>
              {STRINGS.please_choose_a_track} <CustomText style={{ fontFamily: fontFace }}>{title}</CustomText>
            </CustomText>
            <CustomText style={styles.previewHintText}>
              {STRINGS.AUDIO_PREVIEW_HINT}
            </CustomText>
          </View>
        )}

        {hasUnplayableOffline && (
          <View style={styles.offlineBanner}>
            <CustomText style={styles.offlineBannerText}>
              {STRINGS.OFFLINE_TRACKS_NOTICE}
            </CustomText>
          </View>
        )}

        <ScrollViewComponent
          tracks={tracks}
          selectedTrack={selectedTrack}
          playingTrack={playingTrack}
          isPlaying={isPlaying}
          previewLoadingTrackId={previewLoadingTrackId}
          isOffline={isOffline}
          handleSelectTrack={handleSelectTrack}
        />

        {isFooter && tracks.length > 0 && (
          <View style={styles.footerRow}>
            <Pressable
              testID="play-button"
              style={[styles.playButton, !selectedTrack && styles.playButtonDisabled]}
              onPress={handlePlay}
              disabled={isNextLoading}
              activeOpacity={0.8}
            >
              {isNextLoading && (
                <ActivityIndicator
                  size="small"
                  color={theme.staticColors.WHITE_COLOR}
                  style={styles.nextLoadingSpinner}
                />
              )}
              {isPreviewRunning && (
                <View style={styles.previewProgressTrack}>
                  <View
                    style={[
                      styles.previewProgressFill,
                      { width: `${Math.round(previewProgress * 100)}%` },
                    ]}
                  />
                </View>
              )}
              <CustomText style={styles.playButtonText}>
                {isNextLoading ? STRINGS.OPENING_PLAYER : nextButtonLabel}
              </CustomText>
              <ArrowRightIcon size={24} color={theme.staticColors.WHITE_COLOR} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

AudioTrackDialog.defaultProps = {
  title: "",
  isHeader: true,
  isFooter: true,
};

AudioTrackDialog.propTypes = {
  title: PropTypes.string,
  tracks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      displayName: PropTypes.string.isRequired,
      audioUrl: PropTypes.string.isRequired,
      lyricsUrl: PropTypes.string.isRequired,
      trackLengthSec: PropTypes.number.isRequired,
      trackSizeMB: PropTypes.number.isRequired,
    })
  ).isRequired,
  handleTrackSelect: PropTypes.func.isRequired,
  isHeader: PropTypes.bool,
  isFooter: PropTypes.bool,
  onCloseTrackModal: PropTypes.func.isRequired,
  addAndPlayTrack: PropTypes.func.isRequired,
  stop: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool.isRequired,
};

export default AudioTrackDialog;
