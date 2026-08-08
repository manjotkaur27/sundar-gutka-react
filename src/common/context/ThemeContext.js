import { createContext, useContext, useMemo } from "react";
import { themeForScreen } from "@theme/screenPalettes";
import { useScreenRolesScope } from "@theme/ScreenRolesProvider";

const ThemeContext = createContext(null);

/**
 * The active theme, already resolved for whatever screen scope it is read in.
 *
 * The scope is applied HERE rather than in each consumer because this is the
 * one place every consumer goes through — useTokens, useThemedStyles, and the
 * many components that read theme.c inline all end up on the same object. A
 * scoped screen with an unscoped body was the symptom of applying it anywhere
 * further down.
 *
 * Outside a ScreenRolesProvider the scope is null and the context value is
 * returned exactly as the provider set it.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  const screen = useScreenRolesScope();
  // A DESIGNED theme wins over the per-screen palettes.
  //
  // Dashboard, Seva and Settings each override a dozen roles to give themselves
  // their own grounds — which is right under Light and Dark, and wrong under a
  // theme: applied on top they would paint the app's navy straight back over
  // Puratan's parchment, so the two screens the user looks at most would be the
  // only ones the theme never reached.
  //
  // Their hierarchy is not lost, it is re-derived: a theme's own background,
  // surface and surfaceElevated carry the same recessed/raised/lifted ladder
  // from its five primitives.
  const applyScreen = screen && !context?.theme?.designedTheme;
  const scoped = useMemo(
    () =>
      context && applyScreen
        ? { ...context, theme: themeForScreen(context.theme, screen) }
        : context,
    [context, screen, applyScreen]
  );
  if (!scoped) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return scoped;
};

export default ThemeContext;
