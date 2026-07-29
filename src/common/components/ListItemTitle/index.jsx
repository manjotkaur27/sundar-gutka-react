import React from "react";
import { Text } from "react-native";
import PropTypes from "prop-types";
import useTheme from "@common/context";

// Plain Text (not rneui ListItem.Title, which didn't reliably honour the
// text props we pass). flexShrink bounds its width inside the row so a long
// title wraps within the row instead of pushing the trailing control off-screen.
//
// Defaults deliberately do NOT auto-shrink: adjustsFontSizeToFit sizes each
// label independently from its own length, so a list of localized strings
// renders at a different size per row (e.g. "Thème" at 16 next to
// "Téléchargement automatique en Wi-Fi" at ~10). Wrapping to a second line
// keeps every row the same size. Callers that need a single fixed-height line
// can opt back in via adjustsFontSizeToFit + numberOfLines={1}.
const ListItemTitle = ({ title, style, numberOfLines, adjustsFontSizeToFit, minimumFontScale }) => {
  const { theme } = useTheme();
  const base = { fontFamily: theme.typography.fonts.balooPaaji, flexShrink: 1 };
  const textStyle = Array.isArray(style) ? [base, ...style] : [base, style];

  return (
    <Text
      style={textStyle}
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
    >
      {title}
    </Text>
  );
};

ListItemTitle.propTypes = {
  title: PropTypes.string.isRequired,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  numberOfLines: PropTypes.number,
  adjustsFontSizeToFit: PropTypes.bool,
  minimumFontScale: PropTypes.number,
};

ListItemTitle.defaultProps = {
  style: null,
  numberOfLines: 2,
  adjustsFontSizeToFit: false,
  minimumFontScale: undefined,
};

export default ListItemTitle;
