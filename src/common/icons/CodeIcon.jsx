import React from "react";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { colors } from "@common";

// "Seva for coders" — angle-bracket code glyph, in the app's stroke style.
const CodeIcon = ({ size = 24, color = colors.READER_HEADER_COLOR }) => (
  <Svg
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="m16 18 6-6-6-6" />
    <Path d="m8 6-6 6 6 6" />
  </Svg>
);

CodeIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };
CodeIcon.defaultProps = { size: 24, color: colors.READER_HEADER_COLOR };

export default CodeIcon;
