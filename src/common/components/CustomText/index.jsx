import React from "react";
import { Text } from "react-native";
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
  const textStyle = Array.isArray(style)
    ? [{ fontFamily: theme.typography.fonts.balooPaaji }, ...style]
    : [{ fontFamily: theme.typography.fonts.balooPaaji }, style];

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
