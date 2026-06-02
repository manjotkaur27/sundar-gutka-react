import React, { useRef, useState, useCallback, useEffect } from "react";
import { Animated, Platform, StyleSheet } from "react-native";

// iOS does not expose the native scroll-indicator colour (only default/black/
// white), so on iOS we hide the native indicator and draw our own to match the
// Android themed scrollbar exactly. On Android this hook is a no-op — the native
// themed scrollbar (res/values/colors.xml → scrollbar_thumb) already renders.
const IS_IOS = Platform.OS === "ios";
const THUMB_COLOR = "rgba(122, 153, 201, 0.5)";
const THUMB_WIDTH = 3;
const MIN_THUMB_HEIGHT = 36;
const FADE_OUT_DELAY_MS = 1200;

const styles = StyleSheet.create({
  thumb: {
    position: "absolute",
    top: 0,
    right: 2,
    width: THUMB_WIDTH,
    borderRadius: THUMB_WIDTH / 2,
    backgroundColor: THUMB_COLOR,
  },
});

/**
 * Returns props to spread onto an Animated.ScrollView / Animated.FlatList and a
 * ready-to-render <Indicator> element. Render the scrollable and the indicator
 * as siblings inside a `flex: 1` (relatively positioned) wrapper:
 *
 *   const { scrollViewProps, Indicator } = useCustomScrollbar();
 *   <View style={{ flex: 1 }}>
 *     <Animated.FlatList {...scrollViewProps} ... />
 *     {Indicator}
 *   </View>
 */
export const useCustomScrollbar = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fadeTimer = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Mimic the native fade: appear while scrolling, fade out shortly after idle.
  const showThenFade = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
    }
    fadeTimer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, FADE_OUT_DELAY_MS);
  }, [opacity]);

  useEffect(
    () => () => {
      if (fadeTimer.current) {
        clearTimeout(fadeTimer.current);
      }
    },
    []
  );

  const onScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
      listener: () => showThenFade(),
    })
  ).current;

  if (!IS_IOS) {
    return { scrollViewProps: {}, Indicator: null };
  }

  const scrollViewProps = {
    showsVerticalScrollIndicator: false,
    scrollEventThrottle: 16,
    onScroll,
    onContentSizeChange: (_w, h) => setContentHeight(h),
    onLayout: (e) => setContainerHeight(e.nativeEvent.layout.height),
  };

  const scrollable = containerHeight > 0 && contentHeight > containerHeight;
  const thumbHeight = scrollable
    ? Math.max(MIN_THUMB_HEIGHT, (containerHeight * containerHeight) / contentHeight)
    : 0;
  const translateY = scrollY.interpolate({
    inputRange: [0, Math.max(1, contentHeight - containerHeight)],
    outputRange: [0, Math.max(0, containerHeight - thumbHeight)],
    extrapolate: "clamp",
  });

  const Indicator = scrollable ? (
    <Animated.View
      pointerEvents="none"
      style={[styles.thumb, { height: thumbHeight, opacity, transform: [{ translateY }] }]}
    />
  ) : null;

  return { scrollViewProps, Indicator };
};

export default useCustomScrollbar;
