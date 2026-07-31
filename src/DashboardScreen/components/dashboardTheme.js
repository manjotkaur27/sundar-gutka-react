import { useTheme } from "@common";

// Centralizes the resolved dashboard palette so every new section card looks
// consistent (rounded borders, navy cards in dark, white cards in light).

// Every blue on this screen is a shade of the app's brand navy, so the
// dashboard never introduces a second blue alongside it. The tints are the
// base mixed with white; accentOnDark keeps the base's hue (217deg) and
// saturation but lifts the lightness, because the base itself disappears
// against a near-black background.
export const BRAND = {
  base: "#113979",
  tint15: "#35578D",
  tint30: "#5874A1",
  tint45: "#7C92B5",
  tint60: "#A0B0C9",
  tint75: "#C4CEDD",
  tint88: "#E2E8F1",
  tint94: "#F1F4F9",
  accentOnDark: "#558DE7",
};

// Brand colors fixed by the client.
export const GOLD = "#eb9d18ff";

// Kept for the retry links that import it directly. Anything drawn on a dark
// ground should prefer the hook's `accentBlue`, which is theme-aware.
export const ACCENT_BLUE = BRAND.base;

const useDashboardTheme = () => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return {
    theme,
    isDark,
    // Golden accent is warmer/brighter in dark mode so it still pops against
    // the near-black background — GOLD stays the light-mode literal.
    gold: isDark ? "#f2b03e" : GOLD,
    accentBlue: isDark ? BRAND.accentOnDark : BRAND.base,
    screenBg: isDark ? "#031329" : BRAND.tint94,
    cardBg: isDark ? theme.colors.activeView : "#ffffff",
    primaryText: theme.colors.primaryText,
    // Secondary text: a brand tint rather than an unrelated grey-blue.
    mutedText: isDark ? "#a1bee7ff" : BRAND.tint45,
    separator: theme.colors.separator,
    // Headline/number colour for cards — brand navy in light, plain white in
    // dark where the navy would not read.
    brandText: isDark ? "#FFFFFF" : BRAND.base,
  };
};
export default useDashboardTheme;
