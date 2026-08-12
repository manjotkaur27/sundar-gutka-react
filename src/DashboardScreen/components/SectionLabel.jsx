import React from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText } from "@common";
import useDashboardTheme from "./dashboardTheme";

// Small uppercase section heading used above each dashboard section, with an
// optional right-aligned action (e.g. "Edit banis", "Shuffle").
//
// Every section heading reads the same: same size, same weight, same colour.
// `color`/`titleStyle`/`uppercase` exist for the ONE caller that is not a
// section heading at all — the week range in WeekChart, which is a title in its
// own right. A section passing `color` is making itself look faded next to its
// neighbours, which is exactly what Reminders used to do.
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
  const { c } = useDashboardTheme();
  // Resolves to the Dashboard's own muted colour in each theme — the same two
  // values this rendered before, now read from the palette rather than written
  // out as an `isDark ? … : …` literal here.
  const defaultColor = c.textSecondary;
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
