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

const SPEED_PRESETS = [
  { label: "0.25x", value: 8 },
  { label: "0.5x", value: 15 },
  { label: "1x", value: 30 },
  { label: "1.5x", value: 50 },
  { label: "2x", value: 70 },
];

const AutoScrollComponent = ({ shabadID, webViewRef }) => {
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const [isPaused, togglePaused] = useState(true);
  const autoScrollSpeedObj = useSelector((state) => state.autoScrollSpeedObj);
  const savedSpeed = autoScrollSpeedObj[shabadID] || constant.DEFAULT_SPEED;

  // Find closest preset to saved speed
  const getPresetIndex = (speed) => {
    let closest = 0;
    let minDiff = Math.abs(SPEED_PRESETS[0].value - speed);
    for (let i = 1; i < SPEED_PRESETS.length; i++) {
      const diff = Math.abs(SPEED_PRESETS[i].value - speed);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    return closest;
  };

  const [selectedPreset, setSelectedPreset] = useState(getPresetIndex(savedSpeed));
  const dispatch = useDispatch();
  const styles = useThemedStyles(createStyles);

  // Send auto-scroll state to WebView — pauses when screen loses focus, resumes on return
  useEffect(() => {
    // If screen not focused or manually paused, send stop signal
    const shouldScroll = isFocused && !isPaused;
    const speed = shouldScroll ? SPEED_PRESETS[selectedPreset].value : 0;
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
  }, [isPaused, selectedPreset, isFocused]);

  const handleSpeedSelect = useCallback(
    (index) => {
      setSelectedPreset(index);
      dispatch(actions.setAutoScrollSpeed(SPEED_PRESETS[index].value, shabadID));
      trackReaderEvent("autoScrollSpeed", SPEED_PRESETS[index].value);
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
        <View style={[localStyles.divider, { backgroundColor: pillBorder }]} />

        {/* Speed preset buttons */}
        <View style={localStyles.presetsContainer}>
          {SPEED_PRESETS.map((preset, index) => {
            const isSelected = index === selectedPreset;
            return (
              <Pressable
                key={preset.label}
                onPress={() => handleSpeedSelect(index)}
                style={({ pressed }) => [
                  localStyles.presetButton,
                  {
                    backgroundColor: isSelected
                      ? pillSelectedBg
                      : pressed
                      ? "rgba(255, 255, 255, 0.08)"
                      : "transparent",
                    borderColor: isSelected ? pillSelectedBorder : pillBorder,
                  },
                ]}
                accessibilityLabel={`Speed ${preset.label}`}
              >
                <CustomText
                  style={[
                    localStyles.presetLabel,
                    {
                      color: textColor,
                      fontWeight: isSelected ? "700" : "400",
                      opacity: isSelected ? 1 : 0.65,
                    },
                  ]}
                >
                  {preset.label}
                </CustomText>
              </Pressable>
            );
          })}
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
  presetsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    gap: 6,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 42,
    alignItems: "center",
  },
  presetLabel: {
    fontSize: 12.5,
    textAlign: "center",
    letterSpacing: 0.3,
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
