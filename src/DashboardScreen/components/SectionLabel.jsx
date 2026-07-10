import React from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText } from "@common";
import useDashboardTheme from "./dashboardTheme";

// Small uppercase section heading used above each dashboard section, with an
// optional right-aligned action (e.g. "Edit banis", "Shuffle"). `color`
// overrides the default mutedText for sections with their own client-specified
// heading accent (e.g. Reminders).
const SectionLabel = ({ title, right, color }) => {
  const { mutedText } = useDashboardTheme();
  return (
    <View style={styles.row}>
      <CustomText style={[styles.title, { color: color || mutedText }]}>
        {title.toUpperCase()}
      </CustomText>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

SectionLabel.propTypes = {
  title: PropTypes.string.isRequired,
  right: PropTypes.node,
  color: PropTypes.string,
};

SectionLabel.defaultProps = { right: null, color: null };

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
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default SectionLabel;
