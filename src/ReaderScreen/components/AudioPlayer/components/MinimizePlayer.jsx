import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Pressable, Animated, PanResponder, useWindowDimensions } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import Svg, { Circle } from "react-native-svg";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { PlayIcon, PauseIcon } from "@common/icons";
import { CustomText } from "@common";
import { setPlayerDragging } from "@common/actions";
import { minimizePlayerStyles } from "../style";

const COLLAPSE_DELAY_MS = 5000;
// Must match theme.spacing.xl_20 (= 20) used in styles.container's right anchor.
const RIGHT_ANCHOR = 20;

const MinimizePlayer = ({
  setIsMinimized,
  handlePlayPause,
  isPlaying,
  progress,
  duration,
  displayName,
  isDragging,
  opacityStyle,
  pointerEvents,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(minimizePlayerStyles);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const dispatch = useDispatch();

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const tapTick = useSelector((state) => state.readerTapTick);
  const [isExpanded, setIsExpanded] = useState(true);
  const [textWidth, setTextWidth] = useState(null);
  const expandAnim = useRef(new Animated.Value(1)).current;
  const collapseTimer = useRef(null);
  const tickInitRef = useRef(true);
  // Ref so the PanResponder closure (created once) always sees the latest
  // measured text width without needing to be recreated.
  const textWidthRef = useRef(null);

  const armCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setIsExpanded(false), COLLAPSE_DELAY_MS);
  }, []);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
    if (isExpanded) {
      armCollapse();
    } else if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [isExpanded, expandAnim, armCollapse]);

  // A tap anywhere in the bani WebView toggles expansion.
  useEffect(() => {
    if (tickInitRef.current) {
      tickInitRef.current = false;
      return;
    }
    setIsExpanded((prev) => !prev);
  }, [tapTick]);

  useEffect(() => {
    textWidthRef.current = textWidth;
  }, [textWidth]);

  const onPlayPausePress = () => {
    handlePlayPause();
    if (isExpanded) armCollapse();
  };

  // ── CSS anchor side ───────────────────────────────────────────────────────
  // When the pill is on the LEFT half we switch the container from
  //   right: RIGHT_ANCHOR  (grows leftward on expand — text overflows left edge)
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
          const SIDE = 8;
          const TOP = 50;
          const BOTTOM = 80;

          const newIsOnLeft = x + w / 2 < sw / 2;

          // When on the right, reserve textWidth on the left so the expanded
          // pill can never flow past the left edge (smart clamp from handoff).
          // When on the left, the container grows rightward — no reserve needed.
          const textReserve = newIsOnLeft ? 0 : (textWidthRef.current ?? 140);

          let dx = 0;
          let dy = 0;
          if (x - textReserve < SIDE) dx = SIDE + textReserve - x;
          else if (x + w > sw - SIDE) dx = sw - SIDE - (x + w);
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
              //   visual = (sw - RIGHT_ANCHOR - w) + newPanX = finalAbsX
              const newPanX = finalAbsX - (sw - RIGHT_ANCHOR - w);
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

  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressValue * circumference;

  // ── Container anchor ──────────────────────────────────────────────────────
  // On the left side switch to a left-edge anchor so the pill grows rightward
  // (toward the screen centre) as the text panel expands. The pill background
  // and shadow always cover the full pill width in both modes.
  const anchorStyle = isOnLeft ? { right: undefined, left: leftAnchor } : null;

  return (
    <Animated.View
      ref={viewRef}
      pointerEvents={pointerEvents}
      style={[
        styles.container,
        anchorStyle,
        opacityStyle,
        { transform: pan.getTranslateTransform() },
      ]}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...panResponder.panHandlers}
    >
      <Pressable style={styles.progressContainer} onPress={onPlayPausePress}>
        <Svg width={size} height={size} style={styles.svgContainer}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.staticColors.TERTIARY_COLOR}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.playPauseButton}>
          {isPlaying ? (
            <PauseIcon size={18} color={theme.colors.primary} />
          ) : (
            <PlayIcon size={18} color={theme.colors.primary} />
          )}
        </View>
      </Pressable>

      <Animated.View
        pointerEvents={isExpanded ? "auto" : "none"}
        style={[
          styles.textWrap,
          { opacity: expandAnim },
          textWidth != null && {
            width: expandAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, textWidth],
            }),
          },
        ]}
      >
        <Pressable
          style={[styles.textContainer, textWidth != null && { width: textWidth }]}
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
      </Animated.View>
    </Animated.View>
  );
};

MinimizePlayer.defaultProps = {
  isDragging: false,
  opacityStyle: null,
  pointerEvents: "auto",
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
};

const arePropsEqual = (prevProps, nextProps) => {
  // We must re-render if dragging state, pointerEvents, or opacity reference changes
  if (
    prevProps.isDragging !== nextProps.isDragging ||
    prevProps.pointerEvents !== nextProps.pointerEvents ||
    prevProps.opacityStyle?.opacity !== nextProps.opacityStyle?.opacity
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
