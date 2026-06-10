/**
 * DownloadButton — compact circular download indicator for the player row.
 *
 * States:
 *  • idle           — cloud-download icon; tap starts download
 *  • queued         — pulsing cloud icon; waiting for slot
 *  • downloading    — animated ring + "XX%" label; tap pauses; long-press cancels
 *  • paused_user    — frozen ring + ▶ centered; tap resumes; long-press cancels
 *  • paused_retry   — pulsing cloud icon (backoff)
 *  • paused_wifi    — wifi icon; tap → settings
 *  • paused_no_net  — cloud-off icon
 *  • failed         — error icon; tap retries (or shows storage dialog)
 *  • completed      — offline-pin icon; tap → remove confirm
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable, Animated, Vibration, StyleSheet, Text } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { Icon } from '@rneui/themed';
import { DownloadIcon } from '@common/icons';
import PropTypes from 'prop-types';
import { exists, unlink } from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import useTheme from '@common/context';
import { STRINGS, showConfirm } from '@common';
import {
  enqueueDownload,
  retryDownload,
  removeDownloadQueueEntry,
  removeDownloadEntries,
} from '@common/actions';
import { downloadControls } from '@common/services/globalDownloadManager';
import { getLocalTrackPath, AUDIO_DIRECTORY_PATH } from '../../utils/audioDownloader';

// Ring geometry — 40×40 canvas, large enough to read the % label clearly.
const SIZE    = 40;
const CX      = SIZE / 2;
const RADIUS  = 16;
const STROKE  = 2.5;
const CIRC    = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DownloadButton = ({ track, baniTitle, baniNameUni, baniId }) => {
  const { theme }    = useTheme();
  const dispatch     = useDispatch();
  const navigation   = useNavigation();

  const downloadQueue           = useSelector((s) => s.downloadQueue);
  const downloadRegistry        = useSelector((s) => s.downloadRegistry);
  const downloadWifiOnly        = useSelector((s) => s.downloadWifiOnly);
  const downloadWarnMobileData  = useSelector((s) => s.downloadWarnMobileData);

  const trackKey   = track?.audioUrl ? getLocalTrackPath(track.audioUrl) : null;
  const queueEntry = trackKey ? downloadQueue[trackKey] : null;
  const inRegistry = Boolean(trackKey && downloadRegistry[trackKey]);

  const status   = queueEntry?.status ?? (inRegistry ? 'completed' : 'idle');
  const progress = queueEntry?.progress ?? 0;

  // ── Animation state ────────────────────────────────────────────────────────
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const animatedToRef = useRef(0);
  const prevStatusRef = useRef(status);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const pulseLoopRef  = useRef(null);

  useEffect(() => {
    if (status === 'downloading' || status === 'completed' || status === 'paused_user') {
      const target = status === 'completed' ? 100 : progress;
      if (target === animatedToRef.current) return;
      const gap = target - animatedToRef.current;
      animatedToRef.current = target;
      Animated.timing(progressAnim, {
        toValue: target,
        duration: Math.min(900, Math.max(200, gap * 10)),
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
      animatedToRef.current = 0;
    }
  }, [progress, status, progressAnim]);

  // Haptic on download completion.
  useEffect(() => {
    if (prevStatusRef.current === 'downloading' && status === 'completed') {
      Vibration.vibrate(12);
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status === 'queued' || status === 'paused_retry') {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange:  [0,    100],
    outputRange: [CIRC, 0],
  });

  // ── Tap handlers ───────────────────────────────────────────────────────────
  const onTapIdle = useCallback(async () => {
    if (!track?.audioUrl || !trackKey) return;
    const net = await NetInfo.fetch();
    if (downloadWifiOnly && net.type !== 'wifi') {
      showConfirm({
        title: STRINGS.WIFI_ONLY_ALERT_TITLE,
        message: STRINGS.WIFI_ONLY_ALERT_BODY,
        cancelText: STRINGS.ok,
        confirmText: STRINGS.WIFI_ONLY_GO_SETTINGS,
        onConfirm: () => navigation.navigate('Settings'),
      });
      return;
    }
    if (!downloadWifiOnly && downloadWarnMobileData && net.type === 'cellular') {
      const sizeMB = track.trackSizeMB;
      const sizeStr = sizeMB != null ? `~${Math.round(sizeMB)} MB` : '';
      showConfirm({
        title: STRINGS.MOBILE_DATA_ALERT_TITLE,
        message: STRINGS.MOBILE_DATA_ALERT_BODY
          .replace('{title}', track.displayName ?? '')
          .replace('{size}', sizeStr),
        cancelText: STRINGS.cancel,
        confirmText: STRINGS.MOBILE_DATA_DOWNLOAD_ANYWAY,
        onConfirm: () => dispatch(enqueueDownload({
          trackKey,
          audioUrl: track.remoteUrl || track.audioUrl,
          displayName: track.displayName,
          baniTitle,
          baniNameUni: baniNameUni || baniTitle,
          baniId,
          sizeMB: track.trackSizeMB,
        })),
      });
      return;
    }
    dispatch(enqueueDownload({
      trackKey,
      audioUrl: track.remoteUrl || track.audioUrl,
      displayName: track.displayName,
      baniTitle,
      baniNameUni: baniNameUni || baniTitle,
      baniId,
      sizeMB: track.trackSizeMB,
    }));
  }, [track, trackKey, downloadWifiOnly, downloadWarnMobileData, baniTitle, baniNameUni, baniId, dispatch, navigation]);

  const onLongPressActive = useCallback(() => {
    if (!trackKey) return;
    showConfirm({
      title: STRINGS.CANCEL_DOWNLOAD_TITLE,
      message: STRINGS.CANCEL_DOWNLOAD_BODY.replace('{title}', track?.displayName ?? ''),
      cancelText: STRINGS.CANCEL_DOWNLOAD_KEEP,
      confirmText: STRINGS.CANCEL_DOWNLOAD_CONFIRM,
      destructive: true,
      onConfirm: async () => {
        dispatch(removeDownloadQueueEntry(trackKey));
        const parts = (track?.audioUrl ?? '').split('/');
        const artistName = parts[parts.length - 2];
        const fileName = parts[parts.length - 1];
        const tempPath = `${AUDIO_DIRECTORY_PATH}/${artistName}/.tmp_${fileName}`;
        if (await exists(tempPath).catch(() => false)) await unlink(tempPath).catch(() => {});
      },
    });
  }, [track, trackKey, dispatch]);

  const onTapCompleted = useCallback(() => {
    if (!trackKey) return;
    showConfirm({
      title: STRINGS.REMOVE_DOWNLOAD_TITLE,
      message: STRINGS.REMOVE_DOWNLOAD_BODY.replace('{title}', track?.displayName ?? ''),
      cancelText: STRINGS.cancel,
      confirmText: STRINGS.REMOVE_DOWNLOAD_CONFIRM,
      destructive: true,
      onConfirm: async () => {
        const base = `${AUDIO_DIRECTORY_PATH}/${trackKey}`;
        await unlink(base).catch(() => {});
        await unlink(base.replace(/\.m4a$/, '.json')).catch(() => {});
        dispatch(removeDownloadEntries([trackKey]));
        dispatch(removeDownloadQueueEntry(trackKey));
      },
    });
  }, [track, trackKey, dispatch]);

  const onTapWifiOnly = useCallback(() => {
    showConfirm({
      title: STRINGS.WIFI_ONLY_ALERT_TITLE,
      message: STRINGS.WIFI_ONLY_ALERT_BODY,
      cancelText: STRINGS.ok,
      confirmText: STRINGS.WIFI_ONLY_GO_SETTINGS,
      onConfirm: () => navigation.navigate('Settings'),
    });
  }, [navigation]);

  if (!track?.audioUrl) return null;

  const primary   = theme.colors.primary;
  const trackRing = theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const mutedIcon = theme.colors.audioTitleText;
  const HIT       = { top: 8, bottom: 8, left: 8, right: 8 };

  // Shared SVG ring (downloading + paused_user).
  const renderRing = () => (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={StyleSheet.absoluteFill}
    >
      {/* track */}
      <Circle cx={CX} cy={CX} r={RADIUS} stroke={trackRing} strokeWidth={STROKE} fill="none" />
      {/* fill */}
      <AnimatedCircle
        cx={CX} cy={CX} r={RADIUS}
        stroke={primary}
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={`${CIRC} ${CIRC}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${CX}, ${CX}`}
      />
    </Svg>
  );

  // ── COMPLETED ──────────────────────────────────────────────────────────────
  if (status === 'completed') {
    return (
      <Pressable style={s.wrap} onPress={onTapCompleted} hitSlop={HIT}>
        <Icon name="offline-pin" type="material" size={22} color={primary} />
      </Pressable>
    );
  }

  // ── DOWNLOADING ────────────────────────────────────────────────────────────
  if (status === 'downloading') {
    const pct = Math.round(Math.min(100, Math.max(0, progress)));
    return (
      <Pressable
        style={s.wrap}
        onPress={() => trackKey && downloadControls.pause(trackKey)}
        onLongPress={onLongPressActive}
        hitSlop={HIT}
        delayLongPress={400}
      >
        {renderRing()}
        {/* % label inside the ring */}
        <Text style={[s.pct, { color: primary }]}>{`${pct}%`}</Text>
        {/* ‖ pause hint — tiny lines at bottom-right, unambiguous affordance */}
        <View style={s.pauseHint}>
          <View style={[s.pauseBar, { backgroundColor: primary }]} />
          <View style={[s.pauseBar, { backgroundColor: primary }]} />
        </View>
      </Pressable>
    );
  }

  // ── PAUSED BY USER ─────────────────────────────────────────────────────────
  if (status === 'paused_user') {
    return (
      <Pressable
        style={s.wrap}
        onPress={() => trackKey && downloadControls.resume(trackKey)}
        onLongPress={onLongPressActive}
        hitSlop={HIT}
        delayLongPress={400}
      >
        {renderRing()}
        {/* Solid ▶ centered in the ring — unmistakably "tap to resume" */}
        <View style={s.resumeIcon}>
          <Icon name="play-arrow" type="material" size={18} color={primary} />
        </View>
      </Pressable>
    );
  }

  // ── QUEUED / RETRY-BACKOFF ─────────────────────────────────────────────────
  if (status === 'queued' || status === 'paused_retry') {
    return (
      <View style={s.wrap}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Icon name="cloud-download" type="material" size={22} color={primary} />
        </Animated.View>
      </View>
    );
  }

  // ── PAUSED_WIFI_ONLY ───────────────────────────────────────────────────────
  if (status === 'paused_wifi_only') {
    return (
      <Pressable style={s.wrap} onPress={onTapWifiOnly} hitSlop={HIT}>
        <Icon name="wifi" type="material" size={22} color={mutedIcon} />
      </Pressable>
    );
  }

  // ── PAUSED_NO_NETWORK ──────────────────────────────────────────────────────
  if (status === 'paused_no_network') {
    return (
      <View style={s.wrap}>
        <Icon name="cloud-off" type="material" size={22} color={mutedIcon} />
      </View>
    );
  }

  // ── FAILED ─────────────────────────────────────────────────────────────────
  if (status === 'failed') {
    const isStorageError = queueEntry?.errorMessage === 'NOT_ENOUGH_STORAGE';
    return (
      <Pressable
        style={s.wrap}
        hitSlop={HIT}
        onPress={() => {
          if (isStorageError) {
            showConfirm({
              title: STRINGS.NOT_ENOUGH_STORAGE_TITLE,
              message: STRINGS.NOT_ENOUGH_STORAGE_BODY,
              confirmText: STRINGS.ok,
            });
          } else if (trackKey) {
            dispatch(retryDownload(trackKey));
          }
        }}
      >
        <Icon name="error-outline" type="material" size={22} color="#D32F2F" />
      </Pressable>
    );
  }

  // ── IDLE ───────────────────────────────────────────────────────────────────
  return (
    <Pressable style={s.wrap} onPress={onTapIdle} hitSlop={HIT}>
      <DownloadIcon size={22} color={mutedIcon} strokeWidth={1.5} />
    </Pressable>
  );
};

const s = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 10,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
    // Nudge up slightly so it sits in the visual centre of the ring.
    marginTop: -2,
  },
  // Two small vertical bars (‖) at bottom-right of the ring, conveying "tap = pause".
  pauseHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 2,
  },
  pauseBar: {
    width: 2,
    height: 6,
    borderRadius: 1,
  },
  // Absolutely centred ▶ glyph — guarantees pixel-perfect centre independent of
  // how the Icon component measures itself (which varies by platform).
  resumeIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

DownloadButton.propTypes = {
  track: PropTypes.shape({
    audioUrl: PropTypes.string,
    remoteUrl: PropTypes.string,
    displayName: PropTypes.string,
    trackSizeMB: PropTypes.number,
  }),
  baniTitle: PropTypes.string,
  baniNameUni: PropTypes.string,
  baniId: PropTypes.string,
};

DownloadButton.defaultProps = {
  track: null,
  baniTitle: '',
  baniNameUni: '',
  baniId: '',
};

export default DownloadButton;
