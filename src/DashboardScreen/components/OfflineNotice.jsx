import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS } from "@common";
import DashboardCard from "./DashboardCard";
import useDashboardTheme, { ACCENT_BLUE } from "./dashboardTheme";

const WifiOffIcon = ({ color }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Line x1="1" y1="1" x2="23" y2="23" />
    <Path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <Path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <Path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <Path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <Line x1="12" y1="20" x2="12.01" y2="20" />
  </Svg>
);
WifiOffIcon.propTypes = { color: PropTypes.string.isRequired };

// Shared offline state for network-backed sections. `message` lets a section
// show context-specific copy (e.g. Today's Vaak) instead of the generic line.
// `onRetry`, when given, adds a manual re-check instead of making the user
// wait for the next screen focus / background refetch.
const OfflineNotice = ({ compact = false, message = "", onRetry = null }) => {
  const { mutedText } = useDashboardTheme();
  return (
    <View style={styles.wrap}>
      <DashboardCard style={[styles.box, compact && styles.boxCompact]}>
        <WifiOffIcon color={mutedText} />
        <CustomText style={[styles.text, { color: mutedText }]}>
          {message || STRINGS.NO_INTERNET}
        </CustomText>
        {onRetry ? (
          <Pressable onPress={onRetry} hitSlop={8}>
            <CustomText style={[styles.retry, { color: ACCENT_BLUE }]}>{STRINGS.RETRY}</CustomText>
          </Pressable>
        ) : null}
      </DashboardCard>
    </View>
  );
};

OfflineNotice.propTypes = {
  compact: PropTypes.bool,
  message: PropTypes.string,
  onRetry: PropTypes.func,
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  box: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  boxCompact: { paddingVertical: 18 },
  text: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  retry: { fontSize: 13, fontWeight: "700", marginTop: 2 },
});

export default OfflineNotice;
