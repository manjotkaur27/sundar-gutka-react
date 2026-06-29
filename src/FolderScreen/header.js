import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { BackIconComponent } from "@common/components";
import { CustomText, GradientDivider, useTheme, SafeArea } from "@common";

/**
 * Folder header — mirrors the home bani-list header (BaniHeader): a centered
 * branded title with a gradient divider on the surface / dark-navy background,
 * plus a back arrow since this is a pushed sub-screen. It owns its own top
 * safe-area inset (so the parent must NOT add a top edge, or the inset doubles).
 */
const Header = ({ navigation, title }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const bg = isDark ? "#041126" : theme.colors.surface;
  const titleColor = isDark ? theme.staticColors.WHITE_COLOR : theme.colors.primary;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeArea backgroundColor={bg} edges={["top"]} flex={0}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.backWrap}>
          <BackIconComponent size={28} color={titleColor} />
        </View>
        <CustomText
          numberOfLines={1}
          style={[
            styles.title,
            { color: titleColor, fontFamily: theme.typography.fonts.gurbaniPrimary },
          ]}
        >
          {title}
        </CustomText>
        <GradientDivider style={styles.divider} />
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  backWrap: {
    position: "absolute",
    left: 8,
    top: 6,
    zIndex: 2,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    textAlign: "center",
    marginTop: 2,
    // Keep long titles clear of the absolutely-positioned back arrow.
    paddingHorizontal: 48,
  },
  divider: {
    marginTop: 8,
    alignSelf: "stretch",
  },
});

Header.propTypes = {
  navigation: PropTypes.shape().isRequired,
  title: PropTypes.string.isRequired,
};
export default Header;
