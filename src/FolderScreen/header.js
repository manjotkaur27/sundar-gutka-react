import React, { useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { BackIconComponent, SettingsIconComponent, AppBar } from "@common/components";
import { constant, useTheme } from "@common";

const Header = ({ navigation, title }) => {
  const { theme } = useTheme();

  const handleSettingsPress = useCallback(
    () => navigation.navigate(constant.SETTINGS),
    [navigation]
  );

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <AppBar
      title={title}
      backgroundColor={theme.colors.primary}
      titleColor={theme.staticColors.WHITE_COLOR}
      titleStyle={{
        fontFamily: theme.typography.fonts.gurbaniPrimary,
        fontSize: theme.typography.sizes.xxl,
        fontWeight: theme.typography.weights.normal,
      }}
      leftComponent={<BackIconComponent size={30} color={theme.staticColors.WHITE_COLOR} />}
      rightComponent={
        <SettingsIconComponent
          handleSettingsPress={handleSettingsPress}
          color={theme.staticColors.WHITE_COLOR}
          size={30}
        />
      }
    />
  );
};

Header.propTypes = {
  navigation: PropTypes.shape().isRequired,
  title: PropTypes.string.isRequired,
};
export default Header;
