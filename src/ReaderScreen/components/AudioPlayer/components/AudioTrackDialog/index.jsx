import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Pressable, Platform, ActivityIndicator } from "react-native";
import { useSelector } from "react-redux";
import { BlurView } from "@react-native-community/blur";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { ArrowRightIcon, CloseIcon } from "@common/icons";
import { STRINGS, CustomText } from "@common";
import { audioTrackDialogStyles } from "../../style";
import ScrollViewComponent from "../ScrollViewComponent";

const PREVIEW_DURATION_MS = 30000;

const AudioTrackDialog = ({
  handleTrackSelect,
  title = "",
  tracks = [],
  onCloseTrackModal,
  isHeader = true,
  isFooter = true,
  addAndPlayTrack,
  stop,
  isPlaying,
}) => {
  const styles = useThemedStyles(audioTrackDialogStyles);
  const fontFace = useSelector((state) => state.fontFace);
  const { theme } = useTheme();
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [previewLoadingTrackId, setPreviewLoadingTrackId] = useState(null);
  const [isNextLoading, setIsNextLoading] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewRemainingSec, setPreviewRemainingSec] = useState(
    PREVIEW_DURATION_MS / 1000
  );
  const previewTimeoutRef = useRef(null);
  const previewIntervalRef = useRef(null);
  const previewStartedAtRef = useRef(0);

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
    clearPreviewTimeout();
    clearPreviewInterval();
    try {
      await stop();
    } catch (_) {
      // Best effort stop for preview cleanup.
    }
    resetPreviewProgress();
    setPlayingTrack(null);
  }, [clearPreviewTimeout, clearPreviewInterval, stop, resetPreviewProgress]);

  useEffect(() => {
    return () => {
      clearPreviewTimeout();
      clearPreviewInterval();
    };
  }, [clearPreviewTimeout, clearPreviewInterval]);

  const handleSelectTrack = async (track) => {
    if (isNextLoading) return;
    setSelectedTrack(track);

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

      if (isPlaying) {
        await stop();
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

      setPlayingTrack(track);
      startPreviewTicker();
      previewTimeoutRef.current = setTimeout(async () => {
        try {
          await stop();
        } catch (_) {
          // Preview timeout stop should never block UI.
        }
        clearPreviewInterval();
        resetPreviewProgress();
        setPlayingTrack((current) => (current?.id === track.id ? null : current));
      }, PREVIEW_DURATION_MS);
    } catch (_) {
      clearPreviewTimeout();
      clearPreviewInterval();
      resetPreviewProgress();
      setPlayingTrack(null);
    } finally {
      setPreviewLoadingTrackId(null);
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
    selectedTrack && playingTrack?.id === selectedTrack?.id && isPlaying
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
  isPlaying: PropTypes.bool.isRequired,
};

export default AudioTrackDialog;
