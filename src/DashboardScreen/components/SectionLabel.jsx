import React from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText } from "@common";
import useDashboardTheme from "./dashboardTheme";

// Small uppercase section heading used above each dashboard section, with an
// optional right-aligned action (e.g. "Edit banis", "Shuffle"). `color`
// overrides the default mutedText for sections with their own client-specified
// heading accent (e.g. Reminders).
// React 19 ignores defaultProps on function components, so `uppercase` must
// default via a parameter default (not defaultProps) or it reads as undefined
// (falsy) and every heading silently drops to Title Case.
const SectionLabel = ({
  title,
  right = null,
  color = null,
  titleStyle = null,
  uppercase = true,
}) => {
  const { mutedText, isDark } = useDashboardTheme();
  // Client-specified section-title accent in dark mode (matches the header date line).
  const defaultColor = isDark ? "#a1bee7" : mutedText;
  return (
    <View style={styles.row}>
      <CustomText
        style={[styles.title, { color: color || defaultColor }, titleStyle]}
        numberOfLines={1}
      >
        {uppercase ? title.toUpperCase() : title}
      </CustomText>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

SectionLabel.propTypes = {
  title: PropTypes.string.isRequired,
  right: PropTypes.node,
  color: PropTypes.string,
  titleStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  uppercase: PropTypes.bool,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    // Give up width to `right` (which can hold action buttons that must stay
    // full touch-target size) before overflowing on a narrow phone.
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
});

export default SectionLabel;
