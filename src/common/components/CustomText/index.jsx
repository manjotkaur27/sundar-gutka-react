import React from "react";
import { Text, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import useTheme from "@common/context";

const CustomText = ({
  style,
  children,
  numberOfLines,
  onPress,
  onLongPress,
  adjustsFontSizeToFit,
  minimumFontScale,
}) => {
  const { theme } = useTheme();
  // Flatten to inspect fontWeight; pick real SemiBold variant for bold weights
  // so we get the designed glyph instead of synthetic bold on Regular.
  const flatStyle = StyleSheet.flatten(Array.isArray(style) ? style : [style]) ?? {};
  const w = flatStyle.fontWeight;
  const isBold = w === "700" || w === "bold" || w === "600" || w === "semibold";
  const resolvedFont = flatStyle.fontFamily ?? (
    isBold ? theme.typography.fonts.balooPaajiSemiBold : theme.typography.fonts.balooPaaji
  );
  const textStyle = Array.isArray(style)
    ? [{ fontFamily: resolvedFont }, ...style]
    : [{ fontFamily: resolvedFont }, style];

  return (
    <Text
      style={textStyle}
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </Text>
  );
};

CustomText.propTypes = {
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  children: PropTypes.node,
  numberOfLines: PropTypes.number,
  onPress: PropTypes.func,
  onLongPress: PropTypes.func,
  adjustsFontSizeToFit: PropTypes.bool,
  minimumFontScale: PropTypes.number,
};

CustomText.defaultProps = {
  style: null,
  children: null,
  numberOfLines: null,
  onPress: null,
  onLongPress: null,
  adjustsFontSizeToFit: false,
  minimumFontScale: undefined,
};

export default CustomText;
