import React from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import useDashboardTheme from "./dashboardTheme";

// Floating white card on the dashboard's soft off-white interface.
//
// Previously this nested two extra "shadow-only" wrapper Views around the card
// to fake a layered (ambient + contact) shadow, since RN only exposes one
// native shadow per view. That backfired on Android: each wrapper rendered as
// its own visible offset box (a "double-stacked card" look) instead of a soft
// blur. A single view with a single well-tuned shadow is far more reliable —
// worth the tradeoff of one shadow layer instead of two.
const RADIUS = 30;
const SHADOW_COLOR = "#64748B"; // slate-500 — blue-gray tint (iOS only, see below)
const BORDER_COLOR = "rgba(100, 116, 139, 0.12)"; // thin blue-gray border, lightened
const TOP_HIGHLIGHT = "rgba(255, 255, 255, 0.8)"; // inset-style highlight along the top edge
const DARK_BORDER_COLOR = "#25385A"; // client-specified thin border, dark mode only

// Platform note: shadowColor/shadowOpacity/shadowRadius are iOS-only. Android
// only honors `elevation`, always a fixed neutral-gray shadow with no tint
// control — so the blue-gray tint only shows on iOS; Android gets a plain
// (still soft) gray approximation.
const DashboardCard = ({ style, children }) => {
  const { isDark, cardBg } = useDashboardTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isDark ? cardBg : "#ffffff",
          borderColor: isDark ? DARK_BORDER_COLOR : BORDER_COLOR,
          borderTopColor: isDark ? DARK_BORDER_COLOR : TOP_HIGHLIGHT,
        },
        !isDark && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

DashboardCard.propTypes = {
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  children: PropTypes.node,
};
DashboardCard.defaultProps = { style: null, children: null };

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS,
    borderWidth: 1,
  },
  shadow: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
});

export default DashboardCard;
