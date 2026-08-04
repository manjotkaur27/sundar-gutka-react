import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { View, Pressable, Animated, PanResponder, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { setPlayerDragging } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { PlayIcon, PauseIcon } from "@common/icons";
import { CustomText } from "@common";
import { minimizePlayerStyles } from "../style";

const COLLAPSE_DELAY_MS = 5000;
// Reference width the pill's original fixed-px dimensions (44 height, 28
// circle, 20 right margin, etc.) were tuned against. Every pill dimension
// below scales off the CURRENT device's width relative to this baseline,
// clamped so a small phone never shrinks the touch target below usable and a
// tablet never blows the floating pill up to a comical size.
const BASE_WIDTH = 380;
const MIN_SCALE = 0.92;
const MAX_SCALE = 1.25;

const MinimizePlayer = ({
  setIsMinimized,
  handlePlayPause,
  isPlaying,
  progress,
  duration,
  displayName,
  isDragging = false,
  opacityStyle = null,
  pointerEvents = "auto",
  isNavBarVisible = false,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(minimizePlayerStyles);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const dispatch = useDispatch();

  // ── Responsive metrics ────────────────────────────────────────────────────
  // Every pill dimension derives from this single scale so nothing can drift
  // out of sync across devices — the previous fixed-px constants were
  // hand-summed and only ever correct for one specific screen width.
  const scale = useMemo(
    () => Math.min(MAX_SCALE, Math.max(MIN_SCALE, screenW / BASE_WIDTH)),
    [screenW]
  );
  const metrics = useMemo(() => {
    const paddingHorizontal = Math.round(theme.spacing.md * scale);
    const rightAnchor = Math.round(theme.spacing.xl_20 * scale);
    const textPaddingLeft = Math.round(7 * scale);
    const textPaddingRight = Math.round(theme.spacing.sm * scale);
    const circleSize = Math.round(28 * scale);
    // Everything in the expanded pill that is NOT the text panel: the
    // container's horizontal padding (both sides) + the progress circle +
    // the text panel's own left/right padding — derived from the same scaled
    // values used to build the pill itself, so it can never drift out of sync.
    const pillChrome = paddingHorizontal * 2 + circleSize + textPaddingLeft + textPaddingRight;
    return {
      pillHeight: Math.round(44 * scale),
      circleSize,
      strokeWidth: Math.max(2.5, Math.round(3 * scale)),
      paddingHorizontal,
      rightAnchor,
      textPaddingLeft,
      textPaddingRight,
      iconSize: Math.round(18 * scale),
      viewportMargin: Math.round(16 * scale),
      minTextWidth: Math.round(80 * scale),
      pillChrome,
      // Drag-release bounds (see onPanResponderRelease below). Percentage of
      // screen HEIGHT, not the width-based `scale` — a bottom safe strip
      // should stay proportionally similar whether the device is a short
      // phone or a tall tablet.
      dragSideMargin: Math.round(8 * scale),
      dragBottomMargin: Math.min(110, Math.max(64, Math.round(screenH * 0.05))),
      dragStripHeight: Math.min(260, Math.max(130, Math.round(screenH * 0.16))),
    };
  }, [scale, screenH, theme.spacing.md, theme.spacing.xl_20, theme.spacing.sm]);
  // The PanResponder below is created ONCE (useRef) and must never close over
  // `metrics` directly — that would freeze the first render's values forever
  // (e.g. across an orientation change). Route through a ref, same pattern as
  // dimsRef/textWidthRef further down.
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const tapTick = useSelector((state) => state.readerTapTick);
  const [isExpanded, setIsExpanded] = useState(true);
  const [textWidth, setTextWidth] = useState(null);
  const collapseTimer = useRef(null);
  const tickInitRef = useRef(true);
  // Ref so the PanResponder closure (created once) always sees the latest
  // measured text width without needing to be recreated.
  const textWidthRef = useRef(null);
  // Mirror of isExpanded for the drag-release clamp (closure is created once).
  const isExpandedRef = useRef(true);

  const armCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setIsExpanded(false), COLLAPSE_DELAY_MS);
  }, []);

  // No expand/collapse animation — the pill snaps instantly between mini
  // (circle only) and compact (circle + text). This effect only keeps
  // isExpandedRef in sync and (re)arms the auto-collapse timer.
  useEffect(() => {
    isExpandedRef.current = isExpanded;
    if (isExpanded) {
      armCollapse();
    } else if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [isExpanded, armCollapse]);

  // A tap anywhere in the bani WebView toggles expansion.
  useEffect(() => {
    if (tickInitRef.current) {
      tickInitRef.current = false;
      return;
    }
    setIsExpanded((prev) => !prev);
  }, [tapTick]);

  // When the nav bar + header reappear (scroll up while this circular/pill
  // player is the active mode), expand alongside them — only on the
  // hidden→visible transition, so it never re-collapses just because the bars
  // are already showing.
  const wasNavBarVisibleRef = useRef(isNavBarVisible);
  useEffect(() => {
    if (isNavBarVisible && !wasNavBarVisibleRef.current) {
      setIsExpanded(true);
    }
    wasNavBarVisibleRef.current = isNavBarVisible;
  }, [isNavBarVisible]);

  useEffect(() => {
    textWidthRef.current = textWidth;
  }, [textWidth]);

  const onPlayPausePress = () => {
    handlePlayPause();
    if (isExpanded) armCollapse();
  };

  // Widest the text panel may be before the expanded pill would run off-screen.
  // The pill is deliberately content-sized (so a short name doesn't leave a gap),
  // but with NO cap a long artist name simply overflowed the viewport on narrow
  // devices — the same unbounded-content bug the Seva page had. This bound only
  // bites when the name genuinely doesn't fit; on a normal phone the full name
  // still shows untruncated, and beyond it numberOfLines={1} ellipsizes.
  const maxTextWidth = Math.max(
    metrics.minTextWidth,
    screenW - metrics.viewportMargin * 2 - metrics.pillChrome
  );

  // ── CSS anchor side ───────────────────────────────────────────────────────
  // When the pill is on the LEFT half we switch the container from
  //   right: metrics.rightAnchor  (grows leftward on expand — text overflows left edge)
  // to
  //   left: leftAnchor     (grows rightward on expand — text opens toward centre)
  //
  // The anchor is switched in the spring-completion callback (pill at rest, no
  // concurrent animated-value mutation) to avoid the instability that caused
  // earlier attempts to crash.
  //
  // No-flash technique for RIGHT→LEFT: absorb the current pan offset into the
  // new leftAnchor instead of resetting pan to 0, so the visual position never
  // changes: leftAnchor = finalAbsX - lastOffset.x  →  leftAnchor + lastOffset.x = finalAbsX ✓
  //
  // For LEFT→RIGHT we must call pan.x.setValue to resync; React Native batches
  // that update with the setState so it resolves in the same frame.
  const [isOnLeft, setIsOnLeft] = useState(false);
  const [leftAnchor, setLeftAnchor] = useState(0);
  const isOnLeftRef = useRef(false);

  // ── Pan drag (identical to committed code — the buttery-smooth baseline) ─
  const pan = useRef(new Animated.ValueXY()).current;
  const lastOffset = useRef({ x: 0, y: 0 });
  const viewRef = useRef(null);
  const dimsRef = useRef({ w: screenW, h: screenH });
  dimsRef.current = { w: screenW, h: screenH };

  const panResponder = useRef(
    PanResponder.create({
      // Only steal the gesture once the finger actually moves, so taps still
      // reach the play/pause and expand handlers below. (Identical to the
      // committed buttery-smooth baseline — do not add onStartShouldSetPanResponder
      // here; that causes an extra re-render cycle mid-grant that breaks drag.)
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset(lastOffset.current);
        pan.setValue({ x: 0, y: 0 });
        dispatch(setPlayerDragging(true));
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        dispatch(setPlayerDragging(false));
      },
      onPanResponderRelease: (_, g) => {
        dispatch(setPlayerDragging(false));
        lastOffset.current = {
          x: lastOffset.current.x + g.dx,
          y: lastOffset.current.y + g.dy,
        };
        pan.flattenOffset();

        viewRef.current?.measureInWindow((x, y, w, h) => {
          const { w: sw, h: sh } = dimsRef.current;
          const {
            dragSideMargin: SIDE,
            dragBottomMargin: BOTTOM,
            dragStripHeight,
          } = metricsRef.current;
          // Confine the release position to a strip near the bottom of the
          // screen: the pill can be slid left/right but never dragged up over
          // the reading area — the whole point of a floating control is to
          // stay out of the way of the text underneath it.
          const TOP = sh - BOTTOM - dragStripHeight;

          const newIsOnLeft = x + w / 2 < sw / 2;

          // Clamp using the EXPANDED footprint so the pill can never leave the
          // viewport on ANY edge once the user taps to expand it — even when it
          // is currently collapsed. The text adds `delta` px on the growth side:
          // right-anchored pills grow LEFT, left-anchored pills grow RIGHT, so
          // the resting box [minEdge, maxEdge] must fit within [SIDE, sw-SIDE].
          const delta = textWidthRef.current ?? 140;
          const expandedW = isExpandedRef.current ? w : w + delta;
          const minEdge = newIsOnLeft ? x : x + w - expandedW;
          const maxEdge = newIsOnLeft ? x + expandedW : x + w;

          let dx = 0;
          let dy = 0;
          if (minEdge < SIDE) dx = SIDE - minEdge;
          else if (maxEdge > sw - SIDE) dx = sw - SIDE - maxEdge;
          if (y < TOP) dy = TOP - y;
          else if (y + h > sh - BOTTOM) dy = sh - BOTTOM - (y + h);

          // Called after the spring (or immediately when no clamping is needed)
          // so the pan value is at rest — safe to mix with setState.
          const doSideUpdate = () => {
            const finalAbsX = x + dx;

            if (newIsOnLeft && !isOnLeftRef.current) {
              // RIGHT → LEFT: absorb pan offset into the new left anchor so
              // we never call pan.setValue (zero-flash transition).
              //   leftAnchor + lastOffset.x = finalAbsX  ✓
              isOnLeftRef.current = true;
              setIsOnLeft(true);
              setLeftAnchor(finalAbsX - lastOffset.current.x);
            } else if (!newIsOnLeft && isOnLeftRef.current) {
              // LEFT → RIGHT: resync pan.x with the right anchor.
              //   visual = (sw - rightAnchor - w) + newPanX = finalAbsX
              const newPanX = finalAbsX - (sw - metricsRef.current.rightAnchor - w);
              pan.x.setValue(newPanX);
              lastOffset.current = { x: newPanX, y: lastOffset.current.y };
              isOnLeftRef.current = false;
              setIsOnLeft(false);
            } else if (newIsOnLeft) {
              // STAY LEFT: refresh the anchor for the new resting position.
              setLeftAnchor(finalAbsX - lastOffset.current.x);
            }
            // STAY RIGHT: no change needed.
          };

          if (dx !== 0 || dy !== 0) {
            const target = {
              x: lastOffset.current.x + dx,
              y: lastOffset.current.y + dy,
            };
            lastOffset.current = target;
            Animated.spring(pan, {
              toValue: target,
              useNativeDriver: false,
              bounciness: 4,
            }).start(doSideUpdate);
          } else {
            doSideUpdate();
          }
        });
      },
    })
  ).current;

  // ── Progress arc ──────────────────────────────────────────────────────────
  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const parts = timeStr.split(":");
    if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    if (parts.length === 1) return parseInt(parts[0], 10);
    return 0;
  };

  const durationSeconds = timeToSeconds(duration);
  const progressSeconds = timeToSeconds(progress);
  const progressValue =
    durationSeconds > 0 ? Math.min(Math.max(progressSeconds / durationSeconds, 0), 1) : 0;

  const { circleSize, strokeWidth } = metrics;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressValue * circumference;

  // ── Container anchor ──────────────────────────────────────────────────────
  // On the left side switch to a left-edge anchor so the pill grows rightward
  // (toward the screen centre) as the text panel expands. The pill background
  // and shadow always cover the full pill width in both modes.
  const anchorStyle = isOnLeft ? { right: undefined, left: leftAnchor } : null;
  // Pill geometry that scales with `metrics` — placed here (not in
  // style.js) because it must react to the current screen size, while the
  // base styles are theme-only. See the "Responsive metrics" section above.
  const responsiveContainerStyle = {
    height: metrics.pillHeight,
    borderRadius: metrics.pillHeight,
    paddingHorizontal: metrics.paddingHorizontal,
    bottom: Math.round(10 * scale),
    right: metrics.rightAnchor,
  };

  return (
    <Animated.View
      ref={viewRef}
      pointerEvents={pointerEvents}
      style={[
        styles.container,
        responsiveContainerStyle,
        anchorStyle,
        opacityStyle,
        { transform: pan.getTranslateTransform() },
      ]}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...panResponder.panHandlers}
    >
      <Pressable
        style={[styles.progressContainer, { width: circleSize, height: circleSize }]}
        onPress={onPlayPausePress}
      >
        <Svg width={circleSize} height={circleSize} style={styles.svgContainer}>
          {/* Track ring: matches bani-reads progress bar background.
              In dark mode the white-grey sits cleanly on the dark pill;
              in light mode the existing TERTIARY_COLOR (#EEE) is correct. */}
          <Circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke={
              theme.mode === "dark" ? "rgba(255,255,255,0.22)" : theme.staticColors.TERTIARY_COLOR
            }
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Fill ring: primary (same as bani-reads fill) */}
          <Circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
          />
        </Svg>
        {/* Icon color matches the full player's play/pause in both modes:
            audioTitleText = white-ish (#BED2F2) in dark, brand blue in light. */}
        <View style={styles.playPauseButton}>
          {isPlaying ? (
            <PauseIcon size={metrics.iconSize} color={theme.colors.audioTitleText} />
          ) : (
            <PlayIcon size={metrics.iconSize} color={theme.colors.audioTitleText} />
          )}
        </View>
      </Pressable>

      <View
        pointerEvents={isExpanded ? "auto" : "none"}
        style={[
          styles.textWrap,
          { opacity: isExpanded ? 1 : 0, maxWidth: maxTextWidth },
          // Collapse to width 0 instantly when not expanded. Before the text is
          // measured (textWidth == null) we leave width unset so it lays out at
          // its natural size for the one-time onLayout measurement.
          textWidth != null && { width: isExpanded ? textWidth : 0 },
        ]}
      >
        <Pressable
          // maxWidth is applied BEFORE the measurement below, so the width
          // onLayout reports is already viewport-safe and everything derived
          // from it (the pill width, and the drag-release clamp's `delta`)
          // stays within bounds too.
          style={[
            styles.textContainer,
            {
              maxWidth: maxTextWidth,
              paddingLeft: metrics.textPaddingLeft,
              paddingRight: metrics.textPaddingRight,
            },
            textWidth != null && { width: textWidth },
          ]}
          onPress={() => setIsMinimized(false)}
          onLayout={(e) => {
            if (textWidth == null) {
              setTextWidth(e.nativeEvent.layout.width);
            }
          }}
        >
          <CustomText style={styles.timestamp} numberOfLines={1}>
            {progress}
          </CustomText>
          <CustomText style={styles.artistName} numberOfLines={1}>
            {displayName}
          </CustomText>
        </Pressable>
      </View>
    </Animated.View>
  );
};

MinimizePlayer.propTypes = {
  setIsMinimized: PropTypes.func.isRequired,
  handlePlayPause: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  progress: PropTypes.string.isRequired,
  duration: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  isDragging: PropTypes.bool,
  opacityStyle: PropTypes.shape(),
  pointerEvents: PropTypes.string,
  isNavBarVisible: PropTypes.bool,
};

const arePropsEqual = (prevProps, nextProps) => {
  // We must re-render if dragging state, pointerEvents, opacity reference, or
  // nav-bar visibility changes (the last one drives the expand-on-reveal effect,
  // which would never see a new value if memo swallowed the re-render).
  if (
    prevProps.isDragging !== nextProps.isDragging ||
    prevProps.pointerEvents !== nextProps.pointerEvents ||
    prevProps.opacityStyle?.opacity !== nextProps.opacityStyle?.opacity ||
    prevProps.isNavBarVisible !== nextProps.isNavBarVisible
  ) {
    return false;
  }

  // If it is dragging, we only re-render if critical props change (ignoring 100ms progress ticks)
  if (nextProps.isDragging) {
    return (
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.displayName === nextProps.displayName &&
      prevProps.duration === nextProps.duration
    );
  }

  return (
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.progress === nextProps.progress &&
    prevProps.duration === nextProps.duration &&
    prevProps.displayName === nextProps.displayName
  );
};

export default React.memo(MinimizePlayer, arePropsEqual);
