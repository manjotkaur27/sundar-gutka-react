import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Pressable, Platform, ActivityIndicator } from "react-native";
import { useSelector } from "react-redux";
import TrackPlayer from "react-native-track-player";
import { BlurView } from "@react-native-community/blur";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { ArrowRightIcon, CloseIcon } from "@common/icons";
import { STRINGS, CustomText } from "@common";
import { audioTrackDialogStyles } from "../../style";
import ScrollViewComponent from "../ScrollViewComponent";

const PREVIEW_DURATION_MS = 30000;
const PREVIEW_START_TIMEOUT_MS = 5000;
const ACTIVE_TRACK_POLL_MS = 150;
const ACTIVE_TRACK_WAIT_MS = 2200;

const AudioTrackDialog = ({
  handleTrackSelect,
  title = "",
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
  const { theme } = useTheme();
  const [selectedTrack, setSelectedTrack] = useState(null);
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
  const previewStartedSessionRef = useRef(0);

  const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

  const startPreviewTicker = useCallback(() => {
    clearPreviewInterval();
    previewStartedAtRef.current = Date.now();
    setPreviewProgress(0);
    setPreviewRemainingSec(PREVIEW_DURATION_MS / 1000);

    previewIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - previewStartedAtRef.current;
      const clampedElapsed = Math.min(elapsed, PREVIEW_DURATION_MS);
      const remainingMs = Math.max(0, PREVIEW_DURATION_MS - clampedElapsed);

      setPreviewProgress(clampedElapsed / PREVIEW_DURATION_MS);
      setPreviewRemainingSec(Math.ceil(remainingMs / 1000));

      if (clampedElapsed >= PREVIEW_DURATION_MS) {
        clearPreviewInterval();
      }
    }, 250);
  }, [clearPreviewInterval]);

  const stopPreview = useCallback(async () => {
    previewSessionRef.current += 1;
    previewStartedSessionRef.current = 0;
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
    resetPreviewProgress,
  ]);

  const startPreviewWindow = useCallback(
    (track, sessionId) => {
      if (!track?.id) {
        return;
      }

      setPreviewActiveTrackId(track.id);
      startPreviewTicker();
      clearPreviewTimeout();
      previewTimeoutRef.current = setTimeout(async () => {
        if (previewSessionRef.current !== sessionId) {
          return;
        }
        try {
          await stop();
        } catch (_) {
          // Preview timeout stop should never block UI.
        }
        try {
          await reset();
        } catch (_) {
          // Best effort hard reset for consistent preview stop.
        }
        clearPreviewInterval();
        resetPreviewProgress();
        setPreviewLoadingTrackId(null);
        setPreviewActiveTrackId(null);
        setPlayingTrack((current) => (current?.id === track.id ? null : current));
      }, PREVIEW_DURATION_MS);
    },
    [startPreviewTicker, clearPreviewTimeout, stop, reset, clearPreviewInterval, resetPreviewProgress]
  );

  useEffect(() => {
    if (!isPlaying || !playingTrack?.id || !previewLoadingTrackId) {
      return;
    }

    if (previewLoadingTrackId !== playingTrack.id) {
      return;
    }

    const activeSessionId = previewSessionRef.current;
    if (previewStartedSessionRef.current === activeSessionId) {
      return;
    }

    previewStartedSessionRef.current = activeSessionId;
    clearPreviewStartTimeout();
    setPreviewLoadingTrackId(null);
    startPreviewWindow(playingTrack, activeSessionId);
  }, [
    isPlaying,
    playingTrack,
    previewLoadingTrackId,
    clearPreviewStartTimeout,
    startPreviewWindow,
  ]);

  useEffect(() => {
    return () => {
      clearPreviewTimeout();
      clearPreviewStartTimeout();
      clearPreviewInterval();
    };
  }, [clearPreviewTimeout, clearPreviewStartTimeout, clearPreviewInterval]);

  const handleSelectTrack = async (track) => {
    if (isNextLoading) return;
    if (previewLoadingTrackId && previewLoadingTrackId === track?.id) {
      return;
    }
    const sessionId = previewSessionRef.current + 1;
    previewSessionRef.current = sessionId;
    previewStartedSessionRef.current = 0;
    setSelectedTrack(track);
    setPreviewActiveTrackId(null);

    if (!isHeader) {
      await handleTrackSelect(track);
      return;
    }

    if (playingTrack?.id === track.id && isPlaying) {
      await stopPreview();
      setSelectedTrack(null);
      return;
    }

    try {
      setPreviewLoadingTrackId(track.id);
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

      await addAndPlayTrack(
        track.id,
        track.audioUrl,
        track.displayName,
        track.displayName,
        track.lyricsUrl,
        track.trackLengthSec,
        track.trackSizeMB,
        true,
        track.remoteUrl || track.audioUrl
      );

      if (previewSessionRef.current !== sessionId) {
        return;
      }

      setPlayingTrack(track);

      // Prefer concrete player state over UI state propagation. On some devices
      // isPlaying can lag behind queue updates, so this avoids "stuck loading".
      let isSelectedTrackActive = false;
      const startWait = Date.now();
      while (Date.now() - startWait < ACTIVE_TRACK_WAIT_MS) {
        const activeTrack = await TrackPlayer.getActiveTrack();
        isSelectedTrackActive =
          activeTrack?.id != null && String(activeTrack.id) === String(track.id);
        if (isSelectedTrackActive) {
          break;
        }
        await wait(ACTIVE_TRACK_POLL_MS);
      }

      if (isSelectedTrackActive) {
        try {
          await TrackPlayer.play();
        } catch (_) {
          // Best effort explicit play; queue is already set for the selected preview track.
        }
        previewStartedSessionRef.current = sessionId;
        clearPreviewStartTimeout();
        setPreviewLoadingTrackId(null);
        startPreviewWindow(track, sessionId);
        return;
      }

      // Fallback path for devices where wrapper playback does not become active.
      try {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.id,
          url: track.remoteUrl || track.audioUrl,
          title: track.displayName,
          artist: track.displayName,
          duration: track.trackLengthSec,
        });
        await TrackPlayer.play();
      } catch (_) {
        // Keep loading until startup timeout while attempting fallback.
      }

      let isFallbackActive = false;
      const fallbackWaitStart = Date.now();
      while (Date.now() - fallbackWaitStart < ACTIVE_TRACK_WAIT_MS) {
        const activeTrack = await TrackPlayer.getActiveTrack();
        isFallbackActive =
          activeTrack?.id != null && String(activeTrack.id) === String(track.id);
        if (isFallbackActive) {
          break;
        }
        await wait(ACTIVE_TRACK_POLL_MS);
      }

      if (isFallbackActive && previewSessionRef.current === sessionId) {
        previewStartedSessionRef.current = sessionId;
        clearPreviewStartTimeout();
        setPreviewLoadingTrackId(null);
        startPreviewWindow(track, sessionId);
        return;
      }

      previewStartTimeoutRef.current = setTimeout(() => {
        if (previewSessionRef.current !== sessionId) {
          return;
        }
        setPreviewLoadingTrackId(null);
        setPreviewActiveTrackId(null);
        setPlayingTrack(null);
        resetPreviewProgress();
      }, PREVIEW_START_TIMEOUT_MS);
    } catch (_) {
      clearPreviewTimeout();
      clearPreviewStartTimeout();
      clearPreviewInterval();
      resetPreviewProgress();
      setPreviewLoadingTrackId(null);
      setPreviewActiveTrackId(null);
      setPlayingTrack(null);
    }
  };

  const handlePlay = async () => {
    if (selectedTrack) {
      setIsNextLoading(true);
      try {
        await stopPreview();
        await handleTrackSelect(selectedTrack);
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
              Tap an artist to hear a 30s preview, then press Next.
            </CustomText>
          </View>
        )}

        <ScrollViewComponent
          tracks={tracks}
          selectedTrack={selectedTrack}
          playingTrack={playingTrack}
          isPlaying={isPlaying}
          previewLoadingTrackId={previewLoadingTrackId}
          handleSelectTrack={handleSelectTrack}
        />

        {isFooter && tracks.length > 0 && (
          <Pressable
            testID="play-button"
            style={[styles.playButton, !selectedTrack && styles.playButtonDisabled]}
            onPress={handlePlay}
            disabled={!selectedTrack || isNextLoading}
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
              {isNextLoading ? "Opening Player..." : nextButtonLabel}
            </CustomText>
            <ArrowRightIcon size={24} color={theme.staticColors.WHITE_COLOR} />
          </Pressable>
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
