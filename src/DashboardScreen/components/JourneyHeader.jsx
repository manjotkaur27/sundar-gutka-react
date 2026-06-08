import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, useTheme, STRINGS, constant } from "@common";

const SunIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    <Path d="M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z" />
  </Svg>
);
SunIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };

const MoonIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);
MoonIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };

const FlameIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M12 23c-4.4 0-8-3.6-8-8 0-2.1.8-4.1 2.2-5.6C7.4 8 8.5 6.3 9 4.4c.1-.3.4-.5.8-.4.3.1.5.3.5.6.1 1.2.6 2.3 1.4 3.2C12.4 6.4 13 4.6 13 2.8c0-.4.3-.7.7-.7.2 0 .4.1.5.2 2.3 2 3.8 4.9 3.8 8 0 4.4-3.6 8-8 8z" />
  </Svg>
);
FlameIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };

const JourneyHeader = ({ streak }) => {
  const { theme, setThemeMode } = useTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const isDark = theme.mode === "dark";
  const accentBlue = isDark ? theme.colors.enabledText : theme.colors.primary;

  const handleToggle = () => {
    setThemeMode(isDark ? constant.Light : constant.Dark);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: safeTop + 14, backgroundColor: isDark ? "rgba(12,16,33,0.97)" : "rgba(255,255,255,0.97)" },
      ]}
    >
      {/* Bottom glass edge */}
      <View
        style={[
          styles.glassBorder,
          { backgroundColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)" },
        ]}
      />

      {/* Gurmukhi blessing lines + title */}
      <CustomText style={[styles.gurmukhiLine, { color: accentBlue, textAlign: "center" }]}>
        ੴ ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ ੴ
      </CustomText>
      <CustomText style={[styles.gurmukhiLine, { color: accentBlue, textAlign: "center" }]}>
        ੴ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਿਹ ੴ
      </CustomText>
      <CustomText style={[styles.title, { color: theme.colors.primaryText, textAlign: "center" }]}>
        {STRINGS.MY_JOURNEY}
      </CustomText>

      {/* Right-side controls: streak pill + theme toggle */}
      <View style={[styles.rightControls, { top: safeTop }]}>
        {streak > 0 && (
          <View style={[styles.streakPill, { backgroundColor: isDark ? "rgba(245,166,35,0.13)" : "#FFF3E0" }]}>
            <FlameIcon size={12} color="#F5A623" />
            <CustomText style={styles.streakNum}>{streak}</CustomText>
          </View>
        )}
        <Pressable onPress={handleToggle} hitSlop={16} style={styles.themeBtn}>
          {isDark ? (
            <SunIcon size={20} color={theme.colors.primaryText} />
          ) : (
            <MoonIcon size={20} color={theme.colors.primaryText} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

JourneyHeader.propTypes = {
  streak: PropTypes.number,
};

JourneyHeader.defaultProps = {
  streak: 0,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    // paddingTop is set dynamically via safeTop + 14
    paddingBottom: 14,
    overflow: "hidden",
  },
  glassBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gurmukhiLine: {
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginTop: 6,
  },
  rightControls: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  streakNum: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F5A623",
  },
  themeBtn: {
    padding: 2,
  },
});

export default JourneyHeader;
