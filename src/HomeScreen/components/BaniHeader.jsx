import React from "react";
import { View } from "react-native";
import PropTypes from "prop-types";
import { SettingsIconComponent } from "@common/components";
import {
  STRINGS,
  CustomText,
  useTheme,
  useThemedStyles,
  SafeArea,
  GradientDivider,
  constant,
} from "@common";
import createStyles from "../styles";

const BaniHeader = ({ navigate }) => {
  const { theme } = useTheme();
  const { c } = theme;
  const styles = useThemedStyles(createStyles);
  // The one header foreground: brand navy in light, white in dark.
  const iconColor = c.headerFg;
  return (
    <SafeArea backgroundColor={c.background} edges={["top"]} flex={0}>
      <View style={styles.newHeaderContainer}>
        <CustomText style={styles.newHeaderInvocationText}>
          {"॥ "}
          {/* Ik Onkar as the real Unicode ੴ in Baloo Paaji, so the whole line is
              one typeface. It was the "<>" ligature in the Gurbani font, which
              draws a longer stroke over the onkar but left a single character of
              a second font sitting inside a Baloo line. Kept a little larger
              than the surrounding text so the glyph still reads at this size. */}
          <CustomText style={styles.ikOnkarGlyph}>ੴ</CustomText>
          {" ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥"}
        </CustomText>
        <View style={styles.titleRow}>
          <CustomText style={styles.newHeaderTitleText}>
            {/* "Œ" and "‰" map to the floral ornaments in the Gurbani font. */}
            <CustomText style={styles.titleFlower}>Œ</CustomText>
            {` ${STRINGS.sg_title} `}
            <CustomText style={styles.titleFlower}>‰</CustomText>
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
