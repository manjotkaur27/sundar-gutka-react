import { useTheme } from "@common";

// Centralizes the resolved dashboard palette so every new section card looks
// consistent (rounded borders, navy cards in dark, white cards in light).
// Brand colors fixed by the client.
export const GOLD = "#d29030";
export const ACCENT_BLUE = "#2669d6";

const useDashboardTheme = () => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return {
    theme,
    isDark,
    // Golden accent is warmer/brighter in dark mode so it still pops against
    // the near-black background — GOLD stays the light-mode literal.
    gold: isDark ? "#E8B355" : GOLD,
    accentBlue: ACCENT_BLUE,
    screenBg: isDark ? "#050D1B" : "#F4F7FC",
    cardBg: isDark ? theme.colors.activeView : "#ffffff",
    primaryText: theme.colors.primaryText,
    mutedText: theme.colors.textDisabled,
    separator: theme.colors.separator,
  };
};

export default useDashboardTheme;
