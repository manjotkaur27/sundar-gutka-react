import React from "react";
import { Text } from "react-native";
import { FONT_SCALE_MAX } from "@theme/scale";
import PropTypes from "prop-types";
import useTheme from "@common/context";

// Plain Text (not rneui ListItem.Title, which didn't reliably honour the
// text props we pass). flexShrink bounds its width inside the row so a long
// title wraps within the row instead of pushing the trailing control off-screen.
//
// Font scaling is ON. It was hardcoded off, which meant the OS text-size
// setting — the most-used accessibility setting on both platforms — did
// nothing here (WCAG 1.4.4). It is capped at FONT_SCALE_MAX so an extreme
// setting degrades the layout rather than shattering it.
//
// There is deliberately no `adjustsFontSizeToFit` escape hatch: it sizes each
// label independently from its own length, so a list of localized strings
// renders at a different size per row (e.g. "Thème" at 16 next to
// "Téléchargement automatique en Wi-Fi" at ~10). Wrapping keeps every row
// consistent, and the row grows to fit.
const ListItemTitle = ({ title, style = null, numberOfLines = 2 }) => {
  const { theme } = useTheme();
  const base = { fontFamily: theme.typography.fonts.balooPaaji, flexShrink: 1 };
  const textStyle = Array.isArray(style) ? [base, ...style] : [base, style];

  return (
    <Text
      style={textStyle}
      allowFontScaling
      maxFontSizeMultiplier={FONT_SCALE_MAX}
      numberOfLines={numberOfLines}
    >
      {title}
    </Text>
  );
};

ListItemTitle.propTypes = {
  title: PropTypes.string.isRequired,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  numberOfLines: PropTypes.number,
};

export default ListItemTitle;
