import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, Pressable, Animated, PanResponder, useWindowDimensions } from "react-native";
import { useSelector } from "react-redux";
import Svg, { Circle } from "react-native-svg";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { PlayIcon, PauseIcon } from "@common/icons";
import { CustomText } from "@common";
import { minimizePlayerStyles } from "../style";

const COLLAPSE_DELAY_MS = 5000;

const MinimizePlayer = ({
  setIsMinimized,
  handlePlayPause,
  isPlaying,
  progress,
  duration,
  displayName,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(minimizePlayerStyles);
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Expanded = circle + timestamp + artist; collapsed = just the circular
  // play/pause. Auto-collapses after COLLAPSE_DELAY_MS of no interaction, and a
  // tap anywhere in the bani WebView (readerTapTick) toggles it.
  const tapTick = useSelector((state) => state.readerTapTick);
  const [isExpanded, setIsExpanded] = useState(true);
  const [textWidth, setTextWidth] = useState(null);
  const expandAnim = useRef(new Animated.Value(1)).current;
  const collapseTimer = useRef(null);
  const tickInitRef = useRef(true);

  const armCollapse = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
    }
    collapseTimer.current = setTimeout(() => setIsExpanded(false), COLLAPSE_DELAY_MS);
  }, []);

  // Animate the width/opacity of the text and (re)arm the auto-collapse timer.
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
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, [isExpanded, expandAnim, armCollapse]);

  // A tap in the bani WebView toggles expansion (ignore the initial mount value).
  useEffect(() => {
    if (tickInitRef.current) {
      tickInitRef.current = false;
      return;
    }
    setIsExpanded((prev) => !prev);
  }, [tapTick]);

  const onPlayPausePress = () => {
    handlePlayPause();
    if (isExpanded) {
      armCollapse(); // keep it visible a little longer after interacting
    }
  };

  // The collapsed player floats and is draggable so the user can move it off the
  // bani text (it can't use blur). A pan offset translates it from its anchored
  // bottom-right position; on release we clamp it back inside the screen so it
  // can never be flung out of reach.
  const pan = useRef(new Animated.ValueXY()).current;
  const lastOffset = useRef({ x: 0, y: 0 });
  const viewRef = useRef(null);
  const dimsRef = useRef({ w: screenW, h: screenH });
  dimsRef.current = { w: screenW, h: screenH };

  const panResponder = useRef(
    PanResponder.create({
      // Only hijack the gesture once the finger actually moves, so taps still
      // reach the play/pause and expand handlers underneath.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset(lastOffset.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        lastOffset.current = {
          x: lastOffset.current.x + g.dx,
          y: lastOffset.current.y + g.dy,
        };
        pan.flattenOffset();
        // Clamp back inside the screen so the floating player can't be lost.
        viewRef.current?.measureInWindow((x, y, w, h) => {
          const { w: sw, h: sh } = dimsRef.current;
          const SIDE = 8;
          const TOP = 50;
          const BOTTOM = 80;
          let dx = 0;
          let dy = 0;
          if (x < SIDE) dx = SIDE - x;
          else if (x + w > sw - SIDE) dx = sw - SIDE - (x + w);
          if (y < TOP) dy = TOP - y;
          else if (y + h > sh - BOTTOM) dy = sh - BOTTOM - (y + h);
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
            }).start();
          }
        });
      },
    })
  ).current;
  // Convert time string to seconds (e.g., "0:10" -> 10, "1:30" -> 90)
  const timeToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") {
      return 0;
    }
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const result = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return result;
    }
    if (parts.length === 1) {
      const result = parseInt(parts[0], 10);
      return result;
    }
    return 0;
  };

  // Convert duration string to seconds
  const durationSeconds = timeToSeconds(duration);
  const progressSeconds = timeToSeconds(progress);

  // Calculate progress for the circle (0 to 1)
  const progressValue =
    durationSeconds > 0 ? Math.min(Math.max(progressSeconds / durationSeconds, 0), 1) : 0;

  // Circle dimensions
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dasharray for progress
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - progressValue * circumference;

  return (
    <Animated.View
      ref={viewRef}
      style={[styles.container, { transform: pan.getTranslateTransform() }]}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...panResponder.panHandlers}
    >
      <Pressable style={styles.progressContainer} onPress={onPlayPausePress}>
        {/* SVG Progress Circle */}
        <Svg width={size} height={size} style={styles.svgContainer}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.staticColors.TERTIARY_COLOR}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Play/Pause Icon */}
        <View style={styles.playPauseButton}>
          {isPlaying ? (
            <PauseIcon size={18} color={theme.colors.audioPlayer} />
          ) : (
            <PlayIcon size={18} color={theme.colors.audioPlayer} />
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
          <CustomText style={styles.timestamp}>{progress}</CustomText>
          <CustomText style={styles.artistName} numberOfLines={1}>
            {displayName}
          </CustomText>
        </Pressable>
      </Animated.View>
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
};

export default MinimizePlayer;
