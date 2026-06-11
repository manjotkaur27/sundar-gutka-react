import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, useTheme, STRINGS, GradientDivider } from "@common";

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  gurmukhiLine: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.8,
  },
  title: {
    fontSize: 32,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  divider: {
    marginTop: 4,
    alignSelf: "stretch",
  },
  rightControls: {
    position: "absolute",
    right: 16,
    bottom: 0,
    top: 0,
    justifyContent: "center",
    alignItems: "flex-end",
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
});

const FlameIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M12 23c-4.4 0-8-3.6-8-8 0-2.1.8-4.1 2.2-5.6C7.4 8 8.5 6.3 9 4.4c.1-.3.4-.5.8-.4.3.1.5.3.5.6.1 1.2.6 2.3 1.4 3.2C12.4 6.4 13 4.6 13 2.8c0-.4.3-.7.7-.7.2 0 .4.1.5.2 2.3 2 3.8 4.9 3.8 8 0 4.4-3.6 8-8 8z" />
  </Svg>
);
FlameIcon.propTypes = {
  size: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

const JourneyHeader = ({ streak }) => {
  const { theme } = useTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const isDark = theme.mode === "dark";

  const invocationColor = isDark ? "#8A99AD" : "#718096";
  const bg = isDark ? "#041126" : theme.colors.surface;
  const titleColor = isDark ? "#ffffff" : theme.colors.primary;

  return (
    <View style={[styles.container, { paddingTop: safeTop + 4, backgroundColor: bg }]}>
      <CustomText style={[styles.gurmukhiLine, { color: invocationColor }]}>
        ॥ ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
      </CustomText>
      <CustomText style={[styles.title, { color: titleColor }]}>{STRINGS.MY_JOURNEY}</CustomText>

      <GradientDivider style={styles.divider} />

      {streak > 0 && (
        <View style={[styles.rightControls, { top: safeTop + 4 }]}>
          <View
            style={[
              styles.streakPill,
              { backgroundColor: isDark ? "rgba(245,166,35,0.13)" : "#FFF3E0" },
            ]}
          >
            <FlameIcon size={12} color="#F5A623" />
            <CustomText style={styles.streakNum}>{streak}</CustomText>
          </View>
        </View>
      )}
    </View>
  );
};

JourneyHeader.propTypes = {
  streak: PropTypes.number,
};

JourneyHeader.defaultProps = {
  streak: 0,
};

export default JourneyHeader;
