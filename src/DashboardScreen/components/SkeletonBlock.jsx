import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import useDashboardTheme from "./dashboardTheme";

// Lightweight pulsing placeholder shown only while a section's first data
// fetch is in flight (see useAsyncSection) — never re-shown after that.
const SkeletonBlock = ({ style }) => {
  const { isDark } = useDashboardTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#E7ECF5", opacity },
        style,
      ]}
    />
  );
};

SkeletonBlock.propTypes = { style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]) };
SkeletonBlock.defaultProps = { style: null };

const styles = StyleSheet.create({
  base: { borderRadius: 8 },
});

export default SkeletonBlock;
