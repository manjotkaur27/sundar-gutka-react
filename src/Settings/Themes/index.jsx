import React, { useCallback } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { applyTheme } from "@common/actions";
import useTokens from "@common/hooks/useTokens";
import { STRINGS, SafeArea, StatusBarComponent, GradientDivider, useBackHandler } from "@common";
import { ScreenHeader, Text } from "../../common/components/ui";
import { themeOptions } from "./options";
import SystemThemePreview from "./SystemThemePreview";
import ThemeTile from "./ThemeTile";

// The app's single theme picker.
//
// One flat grid, no section headings: the tiles fit on a screen, and someone
// choosing a page does not think in categories like "traditional" or "high
// contrast". Tapping a tile applies it immediately — the tile IS the preview,
// rendered from the theme's own record, and the change is instant and
// reversible, so a confirm step only added a tap.
//
// Choosing a designed theme sets BOTH axes at once: Blue puts the app in dark
// and the Reader in Blue, Puratan puts the app in light and the Reader on
// parchment. That pairing is declared in each theme record (`base`), so this
// screen only has to store the choice.

// Three columns from 600dp up — tablets, unfolded foldables and landscape
// phones. Recomputed from useWindowDimensions, so rotating reflows the grid
// rather than leaving a stale column count.
const WIDE_BREAKPOINT = 600;

const styles = StyleSheet.create({
  hint: { textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
});

const Themes = ({ navigation }) => {
  const dispatch = useDispatch();
  const { c, space, layout } = useTokens();
  const selected = useSelector((state) => state.theme);

  const { width } = useWindowDimensions();
  const columns = width >= WIDE_BREAKPOINT ? 3 : 2;

  const handleBackPress = useCallback(() => {
    navigation.goBack();
    return true;
  }, [navigation]);
  useBackHandler(handleBackPress);

  const apply = useCallback((value) => dispatch(applyTheme(value)), [dispatch]);

  return (
    <SafeArea backgroundColor={c.backgroundAlt} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor={c.backgroundAlt} />
      <ScreenHeader
        title={STRINGS.theme}
        onBack={handleBackPress}
        backAccessibilityLabel={STRINGS.GO_BACK}
        surface="backgroundAlt"
        showBorder={false}
      />
      <GradientDivider />

      <ScrollView
        style={{ backgroundColor: c.backgroundAlt }}
        contentContainerStyle={{ paddingBottom: layout.screenPaddingBottom, padding: space.md }}
      >
        <Text
          variant="caption"
          color="textSecondary"
          style={[styles.hint, { paddingBottom: space.md }]}
        >
          {STRINGS.theme_hint}
        </Text>

        {/* One radiogroup over every tile, so a screen reader announces the
            whole grid as a single choice.

            A plain wrapped View grid rather than a FlatList: a handful of tiles
            in total, so virtualisation buys nothing and a FlatList nested in a
            ScrollView would only add scroll conflicts. */}
        <View style={styles.grid} accessibilityRole="radiogroup">
          {themeOptions().map((option) => (
            <View key={option.value} style={{ width: `${100 / columns}%`, padding: space.xs }}>
              <ThemeTile
                theme={option.record ?? undefined}
                label={STRINGS[option.labelKey]}
                selected={selected === option.value}
                onPress={() => apply(option.value)}
                previewNode={option.record ? undefined : <SystemThemePreview />}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeArea>
  );
};

Themes.propTypes = {
  navigation: PropTypes.shape({ goBack: PropTypes.func }).isRequired,
};

export default Themes;
