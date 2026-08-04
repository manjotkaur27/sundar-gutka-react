import React from "react";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { colors } from "@common";

const PersonIcon = ({ size = 24, color = colors.READER_HEADER_COLOR }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4" />
  </Svg>
);

PersonIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
};

export default PersonIcon;
