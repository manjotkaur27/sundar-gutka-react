import { StyleSheet } from "react-native";

// Native styling for the server-driven "Seva by other means" pages. Colours
// mirror the Seva page (createStyles in ./styles) so both screens read as one
// system in light and dark mode.
const createStyles = (theme) => {
  const isDarkMode = theme.mode === "dark";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? "#041126" : "#FFF8E7",
    },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: isDarkMode ? "#041126" : "#FFF8E7",
    },
    intro: {
      fontSize: 16,
      lineHeight: 24,
      color: isDarkMode ? "#A0AEC0" : "#3A4A63",
      marginBottom: 16,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: isDarkMode ? "#A0AEC0" : "#4A5568",
      marginBottom: 12,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    // NB: no numeric fontWeight anywhere the Baloo SemiBold font is used —
    // pairing an explicit custom font with fontWeight 700/800 makes Android
    // fall back to Roboto. The SemiBold font already carries the weight.
    sectionHeading: {
      fontSize: 15,
      fontWeight: "normal",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: isDarkMode ? "#FAF9F6" : "#113979",
      marginTop: 14,
      marginBottom: 10,
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    // A tappable link "card" row: text on the left, trailing chevron on the right.
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: isDarkMode ? theme.colors.activeView : "#FFFFFF",
      borderColor: isDarkMode ? "#1B3A5B" : "#EFE4C6",
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    linkRowInner: {
      flex: 1,
    },
    linkRowText: {
      fontSize: 15,
      lineHeight: 22,
      color: isDarkMode ? "#A0AEC0" : "#4A5568",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    link: {
      color: isDarkMode ? "#4299E1" : "#113979",
      fontWeight: "normal",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: "normal",
      textAlign: "center",
      color: isDarkMode ? "#FAF9F6" : "#113979",
      marginTop: 48,
      marginBottom: 10,
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    heroSub: {
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
      color: isDarkMode ? "#8496A9" : "#6B7A90",
      paddingHorizontal: 24,
      marginBottom: 12,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    footer: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      color: isDarkMode ? "#8496A9" : "#718096",
      marginTop: 24,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
  });
};

export default createStyles;
