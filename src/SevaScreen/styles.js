import { StyleSheet } from "react-native";

const createStyles = (theme) => {
  const isDarkMode = theme.mode === "dark";

  return StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: isDarkMode ? "#041126" : "#FFF8E7",
    },
    // flexGrow + center is the standard RN idiom: content is vertically centered
    // when it is SHORTER than the viewport, and scrolls normally when it is
    // taller. Crucially it never stretches the gaps between children.
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    // Spacing is an explicit `gap` (set responsively by the screen), NOT
    // justifyContent: "space-between". space-between distributes LEFTOVER space,
    // so the gaps grew on tall devices and collapsed to zero on short ones —
    // that was the whole "spacing differs per device / everything is cramped"
    // bug. A fixed gap renders identically everywhere and simply scrolls when
    // there isn't room.
    container: {
      width: "100%",
      backgroundColor: isDarkMode ? "#041126" : "#FFF8E7",
      alignItems: "center",
    },
    header: {
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      padding: 8,
      width: 40,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.staticColors.WHITE_COLOR,
      flex: 1,
      textAlign: "center",
    },
    headerSpacer: {
      width: 40,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#2C5282",
      textAlign: "center",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    headline: {
      fontWeight: "800",
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#113979",
      textAlign: "center",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: isDarkMode ? "#A0AEC0" : "#4A5568",
      textAlign: "left",
      width: "100%",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    link: {
      color: isDarkMode ? "#4299E1" : "#113979",
      fontWeight: "600",
      textDecorationLine: "underline",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    amountCard: {
      backgroundColor: isDarkMode ? theme.colors.activeView : "#FAF0D8",
      borderRadius: 16,
      paddingTop: 10,
      paddingBottom: 20,
      paddingHorizontal: 20,
      width: "100%",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    amountContainer: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    currency: {
      fontSize: 72,
      // Identical lineHeight + includeFontPadding:false on both the "$" and the
      // input gives them the same line box and baseline, so centering aligns the
      // glyphs (not just the boxes). Without this the TextInput's taller box made
      // the digits float above the "$".
      lineHeight: 86,
      fontWeight: "400",
      fontFamily: theme.typography.fonts.balooPaaji,
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#2C5282",
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    amountDisplay: {
      fontSize: 72,
      lineHeight: 86,
      fontWeight: "400",
      fontFamily: theme.typography.fonts.balooPaaji,
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#2C5282",
      minWidth: 60,
      textAlign: "center",
      textAlignVertical: "center",
      includeFontPadding: false,
      padding: 0,
    },
    amountInputWrap: {
      position: "relative",
      justifyContent: "center",
    },
    // Custom "0" placeholder overlay — Android renders the native hint at a
    // different vertical offset than typed text, so we draw it as a real Text
    // (which aligns with the "$" exactly like typed digits do).
    amountPlaceholder: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      color: "#C0CADB",
    },
    perMonth: {
      fontSize: 18,
      fontWeight: "400",
      fontFamily: theme.typography.fonts.balooPaaji,
      color: isDarkMode ? "#A0AEC0" : "#718096",
      textAlign: "center",
      marginTop: 2,
    },
    // Always ONE row on every device. The old flexWrap + minWidth:70 pushed
    // "Other" onto its own line on narrower screens but not wider ones — the
    // most visible per-device inconsistency. Equal flex:1 columns divide
    // whatever width is available, so the row is identical everywhere.
    amountButtons: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      width: "100%",
    },
    amountButton: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 6,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: isDarkMode ? "#2D3748" : "#CBD5E0",
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    amountButtonSelected: {
      backgroundColor: isDarkMode ? theme.colors.primary : "#2C5282",
      borderColor: isDarkMode ? theme.colors.primary : "#2C5282",
    },
    amountButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: isDarkMode ? "#FAF9F6" : "#4A5568",
      textAlign: "center",
    },
    amountButtonTextSelected: {
      color: "#FFFFFF",
    },
    frequencyContainer: {
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 24,
      rowGap: 12,
      width: "100%",
    },
    frequencyOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    radioButton: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: isDarkMode ? "#4299E1" : "#2C5282",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    radioButtonSelected: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: isDarkMode ? "#4299E1" : "#2C5282",
    },
    frequencyText: {
      fontSize: 14,
      color: isDarkMode ? "#A0AEC0" : "#4A5568",
    },
    donateButton: {
      borderRadius: 100,
      alignSelf: "center",
      overflow: "hidden",
    },
    donateIconCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    donateIcon: {
      fontSize: 18,
      color: isDarkMode ? theme.colors.primary : "#2C5282",
    },
    donateButtonText: {
      fontSize: 22,
      color: "#FFFFFF",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    footerText: {
      fontSize: 13,
      color: isDarkMode ? "#A0AEC0" : "#718096",
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: 16,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    taxNote: {
      fontSize: 13,
      lineHeight: 18,
      color: isDarkMode ? "#A0AEC0" : "#718096",
      textAlign: "center",
      width: "100%",
      paddingHorizontal: 8,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: isDarkMode ? "#041126" : "#FFF8E7",
    },
    retentionBanner: {
      backgroundColor: isDarkMode ? "#1A365D" : "#FEFCBF",
      borderColor: isDarkMode ? "#2B6CB0" : "#ECC94B",
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      width: "100%",
    },
    retentionText: {
      color: isDarkMode ? "#EBF8FF" : "#744210",
      fontSize: 14,
      textAlign: "center",
      fontWeight: "600",
    },
  });
};

export default createStyles;
