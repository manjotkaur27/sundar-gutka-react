import React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import PropTypes from "prop-types";
import { colors } from "@common";

// "Seva by testing our work" — clipboard with a check, in the app's stroke style.
const ClipboardCheckIcon = ({ size = 24, color = colors.READER_HEADER_COLOR }) => (
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
    <Path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    <Rect x="9" y="2" width="6" height="4" rx="1" />
    <Path d="m9 14 2 2 4-4" />
  </Svg>
);

ClipboardCheckIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };
ClipboardCheckIcon.defaultProps = { size: 24, color: colors.READER_HEADER_COLOR };

export default ClipboardCheckIcon;
