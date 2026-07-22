import React from "react";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { colors } from "@common";

// "Seva by other opportunities" — sparkles, in the app's stroke style.
const SparklesIcon = ({ size = 24, color = colors.READER_HEADER_COLOR }) => (
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
    <Path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
  </Svg>
);

SparklesIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };
SparklesIcon.defaultProps = { size: 24, color: colors.READER_HEADER_COLOR };

export default SparklesIcon;
