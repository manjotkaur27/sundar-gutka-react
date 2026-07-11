import { useTheme } from "@common";

// Centralizes the resolved dashboard palette so every new section card looks
// consistent (rounded borders, navy cards in dark, white cards in light).
// Brand colors fixed by the client.
export const GOLD = "#eb9d18ff";
export const ACCENT_BLUE = "#2669d6";

const useDashboardTheme = () => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return {
    theme,
    isDark,
    // Golden accent is warmer/brighter in dark mode so it still pops against
    // the near-black background — GOLD stays the light-mode literal.
    gold: isDark ? "#f2b03e" : GOLD,
    accentBlue: ACCENT_BLUE,
    screenBg: isDark ? "#031329" : "#F4F7FC",
    cardBg: isDark ? theme.colors.activeView : "#ffffff",
    primaryText: theme.colors.primaryText,
    mutedText: isDark ? "#a1bee7ff" : "#97a9c7",
    separator: theme.colors.separator,
  };
};
export default useDashboardTheme;
