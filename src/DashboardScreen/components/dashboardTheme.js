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
    gold: GOLD,
    accentBlue: ACCENT_BLUE,
    screenBg: isDark ? theme.colors.inactiveView : "#ffffff",
    cardBg: isDark ? theme.colors.activeView : "#ffffff",
    primaryText: theme.colors.primaryText,
    mutedText: theme.colors.textDisabled,
    separator: theme.colors.separator,
    // Card style with rounded borders (design note: rounded borders everywhere).
    card: {
      borderRadius: 18,
      backgroundColor: isDark ? theme.colors.activeView : "#ffffff",
      borderWidth: isDark ? 0 : 1,
      borderColor: "rgba(0,0,0,0.06)",
      ...(isDark
        ? {}
        : {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }),
    },
  };
};

export default useDashboardTheme;
