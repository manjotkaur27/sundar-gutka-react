import React, { useEffect, useRef } from "react";
import { View, Animated, Pressable } from "react-native";
import { useReaderTheme } from "@theme/reader";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { BackArrowIcon, BookmarkIcon, FolderIcon } from "@common/icons";
import { CustomText, GradientDivider, STRINGS, useThemedStyles } from "@common";
import createStyles from "../styles";

const Header = ({
  title,
  handleBackPress,
  handleBookmarkPress,
  handleAddToPothiPress,
  isHeader,
}) => {
  const styles = useThemedStyles(createStyles);
  // This bar is opaque and physically contiguous with the Bani text, so it
  // follows the READING theme rather than the app appearance — otherwise a cream
  // page would sit under a black bar the moment the two axes disagree.
  //
  // Background and foreground are taken together, and must stay that way:
  // retinting only the bar would land near-white icons on a light ground. The
  // light/dark records resolve these back to `c.backgroundAlt` and `c.headerFg`,
  // which is what the stylesheet sets, so following the app changes nothing.
  const { theme: readerTheme } = useReaderTheme();
  const { headerBackground, headerForeground } = readerTheme.chrome;
  // The SAME resolved numbers the shared ScreenHeader uses.
  //
  // `useThemedStyles` hands `createStyles` the RAW theme, while ScreenHeader
  // reads `useTokens`, which scales layout for the device width and OS font
  // size. `minHeight` is a container key, so the shared header's row grew with
  // the font setting and this one did not — the title centred in a taller box
  // sat lower there than here, which is the last way the two disagreed. Taking
  // the resolved value directly makes them the same number by construction.
  const { layout, space } = useTokens();
  const animationPosition = useRef(new Animated.Value(0)).current;

  const headerLeft = () => (
    <Pressable
      onPress={() => {
        handleBackPress();
      }}
    >
      <BackArrowIcon size={25} color={headerForeground} />
    </Pressable>
  );

  // Two actions now, so the slot is a row. `hitSlop` gives each glyph the 44pt
  // target the platform asks for without growing the bar.
  const headerRight = () => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
      <Pressable
        onPress={() => {
          handleAddToPothiPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.POTHI_ADD_TO}
        hitSlop={layout.hitSlop}
      >
        <FolderIcon size={25} color={headerForeground} />
      </Pressable>
      <Pressable
        onPress={() => {
          handleBookmarkPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.bookmarks}
        hitSlop={layout.hitSlop}
      >
        <BookmarkIcon size={25} color={headerForeground} />
      </Pressable>
    </View>
  );

  useEffect(() => {
    const value = isHeader ? 0 : -120;

    // Stop any existing animation first
    animationPosition.stopAnimation();

    const animation = Animated.timing(animationPosition, {
      toValue: value,
      duration: 500,
      useNativeDriver: true,
    });

    animation.start((finished) => {
      if (!finished) {
        // If animation was interrupted, force the final value
        animationPosition.setValue(value);
      }
    });

    // Cleanup function
    return () => {
      animation.stop();
    };
  }, [isHeader, animationPosition]);

  // Add animation reset as fallback for stuck states
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      // Force position if animation seems stuck
      const targetValue = isHeader ? 0 : -120;
      animationPosition.setValue(targetValue);
    }, 1000);

    return () => clearTimeout(resetTimer);
  }, [isHeader, animationPosition]);

  return (
    <Animated.View
      style={[
        styles.animatedView,
        {
          transform: [{ translateY: animationPosition }],
        },
      ]}
      pointerEvents="box-none" // Ensure touch events pass through
    >
      <View
        style={[styles.headerStyle, { backgroundColor: headerBackground }]}
        pointerEvents="auto"
      >
        <View style={[styles.headerWrapper, { minHeight: layout.header.minHeight }]}>
          <View style={styles.headerLeft}>{headerLeft()}</View>
          <View style={styles.headerCenter}>
            {/* Header chrome, so the header face — NOT the user's bani font.
                The title is the Unicode name, which Baloo renders correctly. */}
            <CustomText style={[styles.headerTitleStyle, { color: headerForeground }]}>
              {title}
            </CustomText>
          </View>
          <View style={styles.headerRight}>{headerRight()}</View>
        </View>
      </View>
      {/* No colour override. GradientDivider already picks the right one: the
          brand ramp under Light and Dark, and the reading theme's heading
          colour under a designed theme. Forcing headerForeground here painted
          the rule near-white in dark mode, because that role IS the header's
          light-on-dark foreground — a regression against stock dark. */}
      <GradientDivider />
    </Animated.View>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  handleBackPress: PropTypes.func.isRequired,
  handleBookmarkPress: PropTypes.func.isRequired,
  handleAddToPothiPress: PropTypes.func.isRequired,
  isHeader: PropTypes.bool.isRequired,
};
export default Header;
