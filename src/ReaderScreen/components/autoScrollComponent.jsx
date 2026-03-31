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
  const autoScrollSpeedObj = useSelector((state) => state.autoScrollSpeedObj);
  const savedSpeed = autoScrollSpeedObj[shabadID] || 30;

  const [sliderValue, setSliderValue] = useState(savedSpeed);
  const dispatch = useDispatch();
  const styles = useThemedStyles(createStyles);

  // Send auto-scroll state to WebView — pauses when screen loses focus, resumes on return
  useEffect(() => {
    // If screen not focused or manually paused, send stop signal
    const shouldScroll = isFocused && !isPaused;
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
  }, [isPaused, sliderValue, isFocused]);

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
  const pillSelectedBg = "rgba(255, 255, 255, 0.25)";
  const pillBorder = "rgba(255, 255, 255, 0.2)";
  const pillSelectedBorder = "rgba(255, 255, 255, 0.6)";
  const textColor = theme.staticColors.WHITE_COLOR;

  return (
    <View style={[localStyles.outerContainer, { backgroundColor: barBg }]}>
      <View style={localStyles.row}>
        {/* Play/Pause */}
        <Pressable
          onPress={isPaused ? handlePlay : handlePause}
          style={({ pressed }) => [
            localStyles.playPauseButton,
            {
              backgroundColor: pressed
                ? "rgba(255, 255, 255, 0.15)"
                : isPaused
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(255, 255, 255, 0.18)",
            },
          ]}
          accessibilityLabel={isPaused ? "Play auto-scroll" : "Pause auto-scroll"}
        >
          <Icon
            name={isPaused ? "play-arrow" : "pause"}
            color={textColor}
            size={24}
          />
        </Pressable>

        {/* Divider */}
        <View style={[localStyles.divider, { backgroundColor: pillBorder, marginRight: 16 }]} />

        {/* Slider Controls with 0-100 Bounds & Current Value */}
        <View style={localStyles.sliderContainer}>
          <CustomText style={[localStyles.rangeLabel, { color: textColor }]}>
            0
          </CustomText>
          
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

          <CustomText style={[localStyles.rangeLabel, { color: textColor }]}>
            100
          </CustomText>

          {/* Divider */}
          <View style={[localStyles.divider, { backgroundColor: pillBorder, marginHorizontal: 12 }]} />
          
          {/* Current Value Preview */}
          <View style={localStyles.currentValueBox}>
            <CustomText style={[localStyles.currentValueText, { color: textColor }]}>
              {sliderValue}
            </CustomText>
          </View>
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
  },
  playPauseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseIcon: {
    fontSize: 16,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
    borderRadius: 1,
  },
  sliderContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 10,
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
  rangeLabel: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: "600",
  },
  currentValueBox: {
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  currentValueText: {
    fontSize: 16,
    fontWeight: "700",
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
