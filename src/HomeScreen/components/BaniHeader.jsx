import React from "react";
import { View } from "react-native";
import PropTypes from "prop-types";
import {
  STRINGS,
  CustomText,
  useTheme,
  useThemedStyles,
  SafeArea,
  GradientDivider,
  constant,
} from "@common";
import { SettingsIconComponent } from "@common/components";
import createStyles from "../styles";

const BaniHeader = ({ navigate }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const iconColor = theme.mode === "dark" ? theme.staticColors.WHITE_COLOR : theme.colors.primary;
  return (
    <SafeArea backgroundColor={theme.mode === "dark" ? "#041126" : theme.colors.surface} edges={["top"]} flex={0}>
      <View style={styles.newHeaderContainer}>
        <CustomText style={styles.newHeaderInvocationText}>
          ॥ ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
        </CustomText>
        <View style={styles.titleRow}>
          <CustomText style={styles.newHeaderTitleText}>
            {STRINGS.sg_title}
          </CustomText>
          <View style={styles.settingsWrap}>
            <SettingsIconComponent
              size={26}
              color={iconColor}
              handleSettingsPress={() => navigate(constant.SETTINGS)}
            />
          </View>
        </View>
        <GradientDivider style={styles.newHeaderGradientDivider} />
      </View>
    </SafeArea>
  );
};

BaniHeader.propTypes = {
  navigate: PropTypes.func.isRequired,
};

export default BaniHeader;
