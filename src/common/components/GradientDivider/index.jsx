import React from "react";
import PropTypes from "prop-types";
import LinearGradient from "react-native-linear-gradient";

// Decorative horizontal divider that fades transparent → #113979 → transparent.
// Shared across the Home, Reader header, Settings and Bookmarks screens so the
// line stays identical everywhere. Pass `style` to add layout (e.g. marginTop)
// or override the default full-width 1.2px size.
const GRADIENT_COLORS = [
  "rgba(17,57,121,0)",
  "rgba(17,57,121,1)",
  "rgba(17,57,121,1)",
  "rgba(17,57,121,0)",
];
const GRADIENT_LOCATIONS = [0, 0.48, 0.52, 1];

const GradientDivider = ({ style }) => (
  <LinearGradient
    colors={GRADIENT_COLORS}
    locations={GRADIENT_LOCATIONS}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    pointerEvents="none"
    style={[{ width: "100%", height: 1.2 }, style]}
  />
);

GradientDivider.propTypes = {
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.number,
  ]),
};

GradientDivider.defaultProps = {
  style: null,
};

export default GradientDivider;
