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
  const scoped = useMemo(
    () =>
      context && screen ? { ...context, theme: themeForScreen(context.theme, screen) } : context,
    [context, screen]
  );
  if (!scoped) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return scoped;
};

export default ThemeContext;
