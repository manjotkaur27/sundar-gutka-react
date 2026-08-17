import React from "react";
import { View, useWindowDimensions } from "react-native";
import { FONT_SCALE_MAX } from "@theme/scale";
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

// Base metrics for the app name. The 1.25 ratio is tuned: tighter and the line
// box trims the tippi above "ਸੁੰਦਰ"; looser and the two words drift apart into
// separate titles. See newHeaderTitleText in ../styles.
const TITLE_FONT_SIZE = 32;
const TITLE_LINE_RATIO = 1.25;

const BaniHeader = ({ navigate }) => {
  const { theme } = useTheme();
  const { c } = theme;
  const styles = useThemedStyles(createStyles);
  // React Native scales `fontSize` with the OS text setting but leaves an
  // explicit `lineHeight` exactly as written — so a fixed 40 here would stay 40
  // while the glyphs grew to 48, and the two wrapped lines would collide. The
  // ratio is held instead, capped at the same FONT_SCALE_MAX the text primitive
  // caps at so the two agree on how large "large" gets.
  const { fontScale } = useWindowDimensions();
  const titleLineHeight = Math.round(
    TITLE_FONT_SIZE * TITLE_LINE_RATIO * Math.min(fontScale || 1, FONT_SCALE_MAX)
  );
  // The one header foreground: brand navy in light, white in dark.
  const iconColor = c.headerFg;
  // The top inset strip belongs to the header, so it takes the header's own
  // ground — on the semantic background it drew a dark band above the
  // invocation line.
  const ground = paletteFor("baniList", theme).surface;
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
          {/* Balances the settings slot on the right, so the title sits on the
              header's true centre rather than being nudged left by it. */}
          <View style={styles.titleSpacer} />
          {/* The ornaments are SIBLINGS of the title, not children of it.
              Nested inside one Text they shared its truncation, so the moment
              the line did not fit the ellipsis ate the closing flower and the
              title read "ਸੁੰਦਰ ਗੁਟ… " with nothing on the right. As their own
              nodes they carry `flexShrink: 0`, so the name gives way first and
              both flowers always survive. */}
          <View style={styles.titleCenter}>
            {/* "Œ" and "‰" map to the floral ornaments in the Gurbani font. */}
            <CustomText style={styles.titleFlower}>Œ</CustomText>
            {/* The VIEW shrinks, not the Text — and that distinction is the
                whole fix. With `flexShrink` on the Text itself, Yoga measured
                its height at the pre-shrink width (one line), then narrowed it:
                the name duly wrapped, but the node was still only one line tall,
                so "ਗੁਟਕਾ" was laid out past the bottom of its own box and
                clipped. The header read "ਸੁੰਦਰ" on a perfectly ordinary phone.
                A View shrinks in the row and lets the Text inside report its
                real wrapped height, so the second line has somewhere to live. */}
            <View style={styles.titleNameWrap}>
              {/* No line cap: the name WRAPS rather than ellipsizing, so a
                  narrow header reads
                      ਸੁੰਦਰ
                      ਗੁਟਕਾ
                  between the two ornaments instead of "ਸੁੰਦਰ …". The row is
                  `alignItems: center`, so the flowers stay vertically centred
                  against the taller two-line block. */}
              <CustomText style={[styles.newHeaderTitleText, { lineHeight: titleLineHeight }]}>
                {STRINGS.sg_title}
              </CustomText>
            </View>
            <CustomText style={styles.titleFlower}>‰</CustomText>
          </View>
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
