import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { resolveTokens } from "@theme/scale";
import { useTheme } from "../context/ThemeContext";

// The single entry point for design tokens in a component.
//
// Returns the theme's colours plus space/layout values already resolved for
// this device's width and the user's OS text-size setting, so a component never
// writes a measurement and never branches on screen size itself.
//
// `useWindowDimensions` is deliberate: it re-renders on rotation, split-screen
// and foldable unfold, which `Dimensions.get()` — used in four files today —
// does not, because it captures a value once at module load.
//
//   const { c, space, layout, type, radii } = useTokens();
//
const useTokens = () => {
  const { theme } = useTheme();
  const { width, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const { scale, space, layout } = resolveTokens({
      space: theme.space,
      layout: theme.layout,
      width,
      fontScale,
    });
    return {
      /** Semantic colours for the active theme. */
      c: theme.c,
      /** Unscaled type roles — RN applies the user's text scale at render. */
      type: theme.type,
      radii: theme.radii,
      elevation: theme.elevation,
      /** Theme-dependent assets — the Khalis mark has a light and a dark file. */
      images: theme.images,
      space,
      layout,
      scale,
      mode: theme.mode,
      isDark: theme.mode === "dark",
      /** Escape hatch for the deprecated maps, during migration only. */
      theme,
    };
  }, [theme, width, fontScale]);
};

export default useTokens;
