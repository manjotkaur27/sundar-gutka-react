import React from "react";
import { Text, StyleSheet } from "react-native";
import { FONT_SCALE_MAX } from "@theme/scale";
import PropTypes from "prop-types";
import useTheme from "@common/context";

// The legacy text component, still used across ~70 files. New code should use
// `common/components/ui/Text`, which carries size, line height and face
// together as a named role; this stays until those call sites migrate.
//
// Font scaling is ON. It was hardcoded `allowFontScaling={false}` with no way
// to override, so the OS text-size setting did nothing anywhere in the app —
// the most-used accessibility setting on both platforms, and WCAG 1.4.4. It is
// capped at FONT_SCALE_MAX so an extreme setting degrades the layout rather
// than shattering it.
//
// `adjustsFontSizeToFit` is gone. It sized each label from its own string
// length, so a column of them rendered at many different sizes, and it
// silently overrode the user's font-size setting. Text wraps instead.
const CustomText = ({
  style = null,
  children = null,
  numberOfLines = null,
  onPress = null,
  onLongPress = null,
}) => {
  const { theme } = useTheme();
  // Flatten to inspect fontWeight; pick the real SemiBold variant for bold
  // weights so we get the designed glyph instead of synthetic bold on Regular.
  const flatStyle = StyleSheet.flatten(Array.isArray(style) ? style : [style]) ?? {};
  const { fontWeight, ...restStyle } = flatStyle;
  const isBold =
    fontWeight === "700" ||
    fontWeight === "bold" ||
    fontWeight === "600" ||
    fontWeight === "semibold";
  const callerFont = flatStyle.fontFamily;
  const resolvedFont =
    callerFont ??
    (isBold ? theme.typography.fonts.balooPaajiSemiBold : theme.typography.fonts.balooPaaji);

  // When WE pick the face, the numeric weight is dropped rather than passed on.
  // Baloo ships as separate named TTFs, so a fontWeight sitting beside the
  // family makes Android try to synthesize bold, fail, and silently fall back
  // to the SYSTEM font — the reason headings rendered in a different typeface
  // to the rest of the app. The weight has already done its job above by
  // selecting the SemiBold file. A caller that names its own family keeps its
  // weight, since it may be a family that really does have weights.
  const textStyle = callerFont
    ? { ...flatStyle, fontFamily: resolvedFont }
    : { ...restStyle, fontFamily: resolvedFont };

  return (
    <Text
      style={textStyle}
      allowFontScaling
      maxFontSizeMultiplier={FONT_SCALE_MAX}
      numberOfLines={numberOfLines}
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
};

export default CustomText;
