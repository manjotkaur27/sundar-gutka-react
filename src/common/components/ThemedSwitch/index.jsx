import React, { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import PropTypes from "prop-types";
import useTheme from "@common/context";

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const PADDING = 3;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - PADDING * 2;

const OFF_TRACK_LIGHT = "#D1D1D6";
const OFF_TRACK_DARK = "#6c6c71";
const ON_TRACK_LIGHT = "#4A80D2";
const ON_TRACK_DARK = "#6FA0E0";
const THUMB_COLOR = "#FFFFFF";
const THUMB_BORDER = "rgba(0,0,0,0.1)";

const ThemedSwitch = ({ value, onValueChange, disabled, offThumbColor }) => {
  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const isDark = theme.mode === "dark";
  const offColor = isDark ? OFF_TRACK_DARK : OFF_TRACK_LIGHT;
  const onColor = isDark ? ON_TRACK_DARK : ON_TRACK_LIGHT;

  const trackBackgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [offColor, onColor],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRAVEL],
  });

  const handlePress = () => {
    if (disabled) return;
    onValueChange?.(!value);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={8}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor: trackBackgroundColor,
          padding: PADDING,
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            // offThumbColor only tints the OFF-state circle; ON stays the
            // default white thumb everywhere.
            backgroundColor: !value && offThumbColor ? offThumbColor : THUMB_COLOR,
            borderWidth: 0.5,
            borderColor: THUMB_BORDER,
            transform: [{ translateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
};

ThemedSwitch.propTypes = {
  value: PropTypes.bool.isRequired,
  onValueChange: PropTypes.func,
  disabled: PropTypes.bool,
  offThumbColor: PropTypes.string,
};

ThemedSwitch.defaultProps = {
  onValueChange: undefined,
  disabled: false,
  offThumbColor: null,
};

export default ThemedSwitch;
