import React from "react";
import { View } from "react-native";
import { paletteFor } from "@theme/screenPalettes";
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
  // The top inset strip belongs to the header, so it takes the header's own
  // ground — on the semantic background it drew a dark band above the
  // invocation line.
  const ground = paletteFor("baniList", theme.mode).surface;
  return (
    <SafeArea backgroundColor={ground} edges={["top"]} flex={0}>
      <View style={styles.newHeaderContainer}>
        <CustomText style={styles.newHeaderInvocationText}>
          {"॥ "}
          {/* The "<>" ligature in the Gurbani font is the Ik Onkar with its full
              elongated stroke over the onkar. Neither alternative draws it:
              the Unicode ੴ in Baloo Paaji flattens the stroke, and the same
              Unicode character in the Gurbani font decomposes into "੧ਓਁ".
              One character of a second typeface inside the line is the price of
              the correct glyph. */}
          <CustomText style={styles.ikOnkarGlyph}>{"<>"}</CustomText>
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
