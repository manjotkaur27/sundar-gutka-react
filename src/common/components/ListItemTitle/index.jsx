import React from "react";
import { Text } from "react-native";
import PropTypes from "prop-types";
import useTheme from "@common/context";

// Plain Text (not rneui ListItem.Title, which didn't reliably honour
// adjustsFontSizeToFit). flexShrink gives it a bounded width inside the row so
// adjustsFontSizeToFit can shrink long translations to fit ONE line instead of
// wrapping or truncating — e.g. Punjabi "ਆਡੀਓ ਆਟੋ ਪਲੇ" stays whole on one line.
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
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.65,
};

export default ListItemTitle;
