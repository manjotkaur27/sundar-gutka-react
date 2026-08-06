import React, { useEffect, useRef } from "react";
import { View, Animated, Pressable } from "react-native";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { BackArrowIcon, BookmarkIcon } from "@common/icons";
import { CustomText, useTheme, useThemedStyles, GradientDivider } from "@common";
import createStyles from "../styles";

const Header = ({ title, handleBackPress, handleBookmarkPress, isHeader }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  // The SAME resolved numbers the shared ScreenHeader uses.
  //
  // `useThemedStyles` hands `createStyles` the RAW theme, while ScreenHeader
  // reads `useTokens`, which scales layout for the device width and OS font
  // size. `minHeight` is a container key, so the shared header's row grew with
  // the font setting and this one did not — the title centred in a taller box
  // sat lower there than here, which is the last way the two disagreed. Taking
  // the resolved value directly makes them the same number by construction.
  const { layout } = useTokens();
  const animationPosition = useRef(new Animated.Value(0)).current;

  const headerLeft = () => (
    <Pressable
      onPress={() => {
        handleBackPress();
      }}
    >
      <BackArrowIcon size={25} color={theme.c.headerFg} />
    </Pressable>
  );

  const headerRight = () => (
    <Pressable
      onPress={() => {
        handleBookmarkPress();
      }}
    >
      <BookmarkIcon size={25} color={theme.c.headerFg} />
    </Pressable>
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
      <View style={styles.headerStyle} pointerEvents="auto">
        <View style={[styles.headerWrapper, { minHeight: layout.header.minHeight }]}>
          <View style={styles.headerLeft}>{headerLeft()}</View>
          <View style={styles.headerCenter}>
            {/* Header chrome, so the header face — NOT the user's bani font.
                The title is the Unicode name, which Baloo renders correctly. */}
            <CustomText style={styles.headerTitleStyle}>{title}</CustomText>
          </View>
          <View style={styles.headerRight}>{headerRight()}</View>
        </View>
      </View>
      <GradientDivider />
    </Animated.View>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  handleBackPress: PropTypes.func.isRequired,
  handleBookmarkPress: PropTypes.func.isRequired,
  isHeader: PropTypes.bool.isRequired,
};
export default Header;
