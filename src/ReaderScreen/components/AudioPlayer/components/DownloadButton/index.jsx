/**
 * DownloadButton — compact circular download indicator for the player row.
 *
 * Follows Spotify / YT Music conventions:
 *  • Icon-only (no external text labels) — fits without disrupting the row.
 *  • DOWNLOADING: SVG ring fills clockwise; percentage printed inside.
 *  • Animated.timing interpolates between Redux progress checkpoints →
 *    always looks smooth regardless of how often the native side reports.
 *  • All state icons are 20 dp visual / 44 dp touch target via hitSlop.
 *  • AnimatedCircle drives strokeDashoffset through JS (native driver can't
 *    animate SVG props), but with progressDivider:20 there are only ~5 Redux
 *    dispatches per download so JS-thread load is negligible.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable, Alert, Animated, Vibration, ActivityIndicator, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { Icon } from '@rneui/themed';
import PropTypes from 'prop-types';
import { exists, unlink } from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import useTheme from '@common/context';
import { STRINGS, CustomText } from '@common';
import {
  enqueueDownload,
  retryDownload,
  removeDownloadQueueEntry,
} from '@common/actions';
import { getLocalTrackPath, AUDIO_DIRECTORY_PATH } from '../../utils/audioDownloader';

// Ring geometry — 28×28 canvas, 11 dp radius leaves 3 dp margin for stroke.
const SIZE    = 28;
const CX      = SIZE / 2;
const RADIUS  = 11;
const STROKE  = 2.5;
const CIRC    = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DownloadButton = ({ track, baniTitle, baniId }) => {
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
  // Redux progress is the "target" value; the Animated.Value interpolates toward it.
  const progress = queueEntry?.progress ?? 0;

  // ── Animation state ────────────────────────────────────────────────────────
  // Single Animated.Value for the ring fill (0→100).
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Ref tracks last animated-to value so we can animate the delta, not jump.
  const animatedToRef = useRef(0);
  const prevStatusRef = useRef(status);
  // Pulse loop for QUEUED state.
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);

  // Smooth-interpolate to the new progress target on each Redux update.
  useEffect(() => {
    if (status === 'downloading' || status === 'completed') {
      const target = status === 'completed' ? 100 : progress;
      if (target === animatedToRef.current) return;
      const gap = target - animatedToRef.current;
      animatedToRef.current = target;
      Animated.timing(progressAnim, {
        toValue: target,
        // Duration proportional to gap so large resume-jumps don't animate
        // forever and small incremental ticks don't look jerky.
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

  // QUEUED pulse animation — subtle opacity oscillation.
  useEffect(() => {
    if (status === 'queued') {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  // strokeDashoffset: CIRC (empty) → 0 (full).
  const strokeDashoffset = progressAnim.interpolate({
    inputRange:  [0,    100],
    outputRange: [CIRC, 0],
  });

  // ── Tap handlers ───────────────────────────────────────────────────────────
  const onTapIdle = useCallback(async () => {
    if (!track?.audioUrl || !trackKey) return;
    const net = await NetInfo.fetch();
    if (downloadWifiOnly && net.type !== 'wifi') {
      Alert.alert(STRINGS.WIFI_ONLY_ALERT_TITLE, STRINGS.WIFI_ONLY_ALERT_BODY, [
        { text: STRINGS.WIFI_ONLY_GO_SETTINGS, onPress: () => navigation.navigate('Settings') },
        { text: STRINGS.ok },
      ]);
      return;
    }
    if (!downloadWifiOnly && downloadWarnMobileData && net.type === 'cellular') {
      const sizeMB = track.trackSizeMB;
      const sizeStr = sizeMB != null ? `~${Math.round(sizeMB)} MB` : '';
      Alert.alert(
        STRINGS.MOBILE_DATA_ALERT_TITLE,
        STRINGS.MOBILE_DATA_ALERT_BODY
          .replace('{title}', track.displayName ?? '')
          .replace('{size}', sizeStr),
        [
          {
            text: STRINGS.MOBILE_DATA_DOWNLOAD_ANYWAY,
            onPress: () => dispatch(enqueueDownload({
              trackKey,
              audioUrl: track.remoteUrl || track.audioUrl,
              displayName: track.displayName,
              baniTitle, baniId,
              sizeMB: track.trackSizeMB,
            })),
          },
          { text: STRINGS.cancel, style: 'cancel' },
        ]
      );
      return;
    }
    dispatch(enqueueDownload({
      trackKey,
      audioUrl: track.remoteUrl || track.audioUrl,
      displayName: track.displayName,
      baniTitle, baniId,
      sizeMB: track.trackSizeMB,
    }));
  }, [track, trackKey, downloadWifiOnly, downloadWarnMobileData, baniTitle, baniId, dispatch, navigation]);

  const onLongPressDownloading = useCallback(() => {
    if (!trackKey) return;
    Alert.alert(
      STRINGS.CANCEL_DOWNLOAD_TITLE,
      STRINGS.CANCEL_DOWNLOAD_BODY.replace('{title}', track?.displayName ?? ''),
      [
        {
          text: STRINGS.cancel,
          onPress: async () => {
            dispatch(removeDownloadQueueEntry(trackKey));
            const { artistName, fileName } = (() => {
              const parts = (track?.audioUrl ?? '').split('/');
              return { artistName: parts[parts.length - 2], fileName: parts[parts.length - 1] };
            })();
            const tempPath = `${AUDIO_DIRECTORY_PATH}/${artistName}/.tmp_${fileName}`;
            if (await exists(tempPath).catch(() => false)) await unlink(tempPath).catch(() => {});
          },
        },
        { text: STRINGS.ok, style: 'cancel' },
      ]
    );
  }, [track, trackKey, dispatch]);

  const onTapWifiOnly = useCallback(() => {
    Alert.alert(STRINGS.WIFI_ONLY_ALERT_TITLE, STRINGS.WIFI_ONLY_ALERT_BODY, [
      { text: STRINGS.WIFI_ONLY_GO_SETTINGS, onPress: () => navigation.navigate('Settings') },
      { text: STRINGS.ok },
    ]);
  }, [navigation]);

  if (!track?.audioUrl) return null;

  const primary    = theme.colors.primary;
  const trackRing  = theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
  const mutedIcon  = theme.colors.audioTitleText;
  const HIT        = { top: 10, bottom: 10, left: 10, right: 10 };

  // ── COMPLETED ──────────────────────────────────────────────────────────────
  if (status === 'completed') {
    return (
      <View style={s.wrap}>
        <Icon name="offline-pin" type="material" size={20} color={primary} />
      </View>
    );
  }

  // ── DOWNLOADING ────────────────────────────────────────────────────────────
  if (status === 'downloading') {
    const pctDisplay = Math.round(Math.min(100, Math.max(0, progress)));
    return (
      <Pressable style={s.wrap} onLongPress={onLongPressDownloading} hitSlop={HIT} delayLongPress={400}>
        {/* Background (empty) track ring */}
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={s.svg}>
          <Circle
            cx={CX} cy={CX} r={RADIUS}
            stroke={trackRing}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Animated fill ring — rotated -90° so fill starts from top */}
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
        {/* Percentage centered over the ring */}
        <CustomText style={[s.pct, { color: primary }]}>
          {pctDisplay < 10 ? `0${pctDisplay}` : String(pctDisplay)}
        </CustomText>
      </Pressable>
    );
  }

  // ── QUEUED ─────────────────────────────────────────────────────────────────
  if (status === 'queued') {
    return (
      <View style={s.wrap}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Icon name="cloud-download" type="material" size={20} color={primary} />
        </Animated.View>
      </View>
    );
  }

  // ── PAUSED_WIFI_ONLY ───────────────────────────────────────────────────────
  if (status === 'paused_wifi_only') {
    return (
      <Pressable style={s.wrap} onPress={onTapWifiOnly} hitSlop={HIT}>
        <Icon name="wifi" type="material" size={20} color={mutedIcon} />
      </Pressable>
    );
  }

  // ── PAUSED_NO_NETWORK ──────────────────────────────────────────────────────
  if (status === 'paused_no_network') {
    return (
      <View style={s.wrap}>
        <Icon name="cloud-off" type="material" size={20} color={mutedIcon} />
      </View>
    );
  }

  // ── FAILED ─────────────────────────────────────────────────────────────────
  if (status === 'failed') {
    return (
      <Pressable style={s.wrap} onPress={() => trackKey && dispatch(retryDownload(trackKey))} hitSlop={HIT}>
        <Icon name="error-outline" type="material" size={20} color="#D32F2F" />
      </Pressable>
    );
  }

  // ── IDLE ───────────────────────────────────────────────────────────────────
  return (
    <Pressable style={s.wrap} onPress={onTapIdle} hitSlop={HIT}>
      <Icon name="cloud-download" type="material" size={20} color={mutedIcon} />
    </Pressable>
  );
};

// Static layout styles — themedcolors passed inline above to avoid hook overhead.
const s = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  pct: {
    fontSize: 8,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 9,
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
  baniId: PropTypes.string,
};

DownloadButton.defaultProps = {
  track: null,
  baniTitle: '',
  baniId: '',
};

export default DownloadButton;
