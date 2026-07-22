import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import PropTypes from "prop-types";
import { colors } from "@common";

// "All Banis" tab — a clean bulleted list (solid dots + rounded lines), in the
// app's stroke-icon style.
const ListIcon = ({ size = 24, color = colors.WHITE }) => (
  <Svg
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M9 6h11M9 12h11M9 18h11" />
    <Circle cx="4.5" cy="6" r="1.35" fill={color} stroke="none" />
    <Circle cx="4.5" cy="12" r="1.35" fill={color} stroke="none" />
    <Circle cx="4.5" cy="18" r="1.35" fill={color} stroke="none" />
  </Svg>
);

ListIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
};

ListIcon.defaultProps = {
  size: 24,
  color: colors.WHITE,
};

export default ListIcon;
