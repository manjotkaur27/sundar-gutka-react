import React, { useState, useEffect, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@rneui/themed";
import { useIsFocused } from "@react-navigation/native";
import PropTypes from "prop-types";
import {
  useTheme,
  useThemedStyles,
  constant,
  actions,
  trackReaderEvent,
  logError,
  CustomText,
} from "@common";
import createStyles from "../styles";

import { Slider } from "@miblanchard/react-native-slider";

const AutoScrollComponent = ({ shabadID, webViewRef }) => {
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const [isPaused, togglePaused] = useState(true);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const autoScrollSpeedObj = useSelector((state) => state.autoScrollSpeedObj);
  const savedSpeed = autoScrollSpeedObj[shabadID] || 30;

  const [sliderValue, setSliderValue] = useState(savedSpeed);
  const dispatch = useDispatch();
  const styles = useThemedStyles(createStyles);

  // Send a stop signal to the WebView to halt auto-scroll
  const sendStopSignal = useCallback(() => {
    if (webViewRef?.current?.postMessage) {
      try {
        webViewRef.current.postMessage(
          JSON.stringify({ autoScroll: 0, scrollMultiplier: 1.0 })
        );
      } catch (error) {
        logError("Error sending auto-scroll stop:", error);
      }
    }
  }, [webViewRef]);

  // Send auto-scroll state to WebView — pauses when screen loses focus, resumes on return
  useEffect(() => {
    // If screen not focused, manually paused, or auto-scroll disabled, send stop signal
    const shouldScroll = isFocused && !isPaused && isAutoScroll;
    const speed = shouldScroll ? sliderValue : 0;
    const autoScrollObj = {
      autoScroll: speed,
      scrollMultiplier: 1.0,
    };

    if (webViewRef?.current?.postMessage) {
      try {
        webViewRef.current.postMessage(JSON.stringify(autoScrollObj));
      } catch (error) {
        logError("Error sending auto-scroll message:", error);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, sliderValue, isFocused, isAutoScroll]);

  // Send stop signal on unmount so the WebView doesn't keep scrolling
  // after the component is removed (e.g. when user switches to Audio mode)
  useEffect(() => {
    return () => {
      sendStopSignal();
    };
  }, [sendStopSignal]);

  const handleSlidingComplete = useCallback(
    (valueArr) => {
      const val = Math.floor(valueArr[0]);
      dispatch(actions.setAutoScrollSpeed(val, shabadID));
      trackReaderEvent("autoScrollSpeed", val);
    },
    [dispatch, shabadID]
  );

  const handlePause = useCallback(() => {
    togglePaused(true);
  }, []);

  const handlePlay = useCallback(() => {
    togglePaused(false);
  }, []);

  const barBg = theme.colors.primary;
  const textColor = theme.staticColors.WHITE_COLOR;

  return (
    <View style={[localStyles.outerContainer, { backgroundColor: barBg }]}>
      <View style={localStyles.row}>
        {/* Play/Pause */}
        <Pressable
          onPress={isPaused ? handlePlay : handlePause}
          hitSlop={8}
          accessibilityLabel={isPaused ? "Play auto-scroll" : "Pause auto-scroll"}
        >
          <Icon
            name={isPaused ? "play-arrow" : "pause"}
            color={textColor}
            size={36}
          />
        </Pressable>

        {/* Slider */}
        <View style={localStyles.sliderWrapper}>
          <Slider
            value={sliderValue}
            minimumValue={0}
            maximumValue={100}
            step={1}
            onValueChange={(val) => setSliderValue(Math.floor(val[0]))}
            onSlidingComplete={handleSlidingComplete}
            thumbStyle={localStyles.sliderThumb}
            trackStyle={localStyles.sliderTrack}
            minimumTrackTintColor={textColor}
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          />
        </View>

        {/* Current Speed Value */}
        <CustomText style={[localStyles.currentValueText, { color: textColor }]}>
          {sliderValue}
        </CustomText>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 16,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  currentValueText: {
    fontSize: 22,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },
});

AutoScrollComponent.propTypes = {
  shabadID: PropTypes.number.isRequired,
  webViewRef: PropTypes.shape({
    current: PropTypes.shape({
      postMessage: PropTypes.func,
    }),
  }).isRequired,
};

export default React.memo(AutoScrollComponent);
