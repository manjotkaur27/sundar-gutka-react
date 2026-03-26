import React, { useCallback } from "react";
import { Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import { BackArrowIcon } from "@common/icons";

const BackIconComponent = ({ size, color }) => {
  const navigation = useNavigation();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, []);

  return (
    <Pressable
      onPress={handleBackPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <BackArrowIcon size={size} color={color} />
    </Pressable>
  );
};

BackIconComponent.defaultProps = {
  size: 25,
};
BackIconComponent.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string.isRequired,
};

export default BackIconComponent;
