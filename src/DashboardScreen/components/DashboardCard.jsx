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
// Exported so anything drawing edge-to-edge inside a card (a background image,
// for instance) can clip itself to the same curve.
export const CARD_RADIUS = RADIUS;
const SHADOW_OFFSET_Y = 8;
const SHADOW_RADIUS = 24;

// How far the shadow reaches past the card's own box. A parent that clips its
// children — a horizontal ScrollView, or anything with overflow hidden — has to
// reserve this much or the shadow gets cut off at the boundary.
export const CARD_SHADOW_BLEED = SHADOW_OFFSET_Y + SHADOW_RADIUS;

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
    shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
    shadowOpacity: 0.12,
    shadowRadius: SHADOW_RADIUS,
    elevation: 6,
  },
});

export default DashboardCard;
