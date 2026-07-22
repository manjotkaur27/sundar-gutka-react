import { StyleSheet } from "react-native";

const createStyles = (theme) => {
  const isDarkMode = theme.mode === "dark";

  return StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: isDarkMode ? "#041126" : "#FFF8E7",
    },
    // flexGrow keeps the background filling the viewport when content is short.
    // NB: no justifyContent:center — centering shifts the content's origin away
    // from the scroll offset's 0, which breaks measuring a child's position for
    // the "scroll an opened accordion into view" logic. Top-aligned is correct
    // for the accordion layout anyway.
    scrollContent: {
      flexGrow: 1,
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
      // stretch → hero/section text and cards fill the width and left-align.
      alignItems: "stretch",
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
    // Shorter box (SIO-155): reduced vertical padding, and "/month" now sits
    // inline in the row rather than on a second line below.
    amountCard: {
      backgroundColor: isDarkMode ? theme.colors.activeView : "#FAF0D8",
      borderRadius: 16,
      paddingTop: 8,
      paddingBottom: 10,
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
      width: "100%",
    },
    // flex-end: the symbol and digits now share ONE font (see amountFontFamily
    // in index.jsx), so aligning their box bottoms aligns their baselines. The
    // small "/month" sits at the same bottom edge.
    amountRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      maxWidth: "100%",
    },
    // The amount figure is one inline Text. Digits are ALWAYS Baloo; the symbol
    // span sets its own fontFamily inline. includeFontPadding:false keeps the
    // baseline tight so inline spans of different fonts line up.
    amountDisplay: {
      fontWeight: "400",
      fontFamily: theme.typography.fonts.balooPaaji,
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#2C5282",
      textAlign: "center",
      includeFontPadding: false,
      padding: 0,
    },
    // Inline "0" placeholder span (muted) — shown before the user types.
    amountPlaceholder: {
      color: "#C0CADB",
    },
    // Inline "/month" span beside the amount (smaller + muted, same baseline).
    perMonthSpan: {
      fontSize: 18,
      fontFamily: theme.typography.fonts.balooPaaji,
      color: isDarkMode ? "#A0AEC0" : "#718096",
    },
    // The real, offscreen input that captures keystrokes for the custom amount.
    // The visible figure is the inline Text above; this stays invisible so the
    // ₹ symbol and digits can be one baseline-aligned inline run.
    hiddenInput: {
      position: "absolute",
      opacity: 0,
      height: 1,
      width: 1,
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
    // ─── New server-driven layout (hero + donate card + "other ways" list) ────
    // Words wrap like inline text; columnGap is the inter-word space and the
    // heart (last flex item) flows right after the final word. `center` aligns
    // the heart with the glyphs' vertical centre (flex-end dropped it to the
    // bottom of the taller line box, below the letters).
    heroTitleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: 7,
      rowGap: 2,
      width: "100%",
    },
    heroTitle: {
      // Swapped with the AppBar "Seva" title: the hero line is now the smaller
      // of the two (the AppBar is 26).
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "normal",
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#113979",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
      includeFontPadding: false,
    },
    heroDesc: {
      fontSize: 15,
      lineHeight: 22,
      color: isDarkMode ? "#A9B7C6" : "#4A5568",
      width: "100%",
      textAlign: "left",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: "normal",
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#113979",
      width: "100%",
      textAlign: "left",
      marginTop: 2,
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    // Donate card
    donateCard: {
      width: "100%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? "#1B3A5B" : "#EFE4C6",
      backgroundColor: isDarkMode ? "#0C2036" : "#FFFDF7",
      padding: 16,
      gap: 14,
    },
    donateCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    cardIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDarkMode ? "#12294A" : "#EAF1FD",
    },
    donateCardHeaderText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "normal",
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#113979",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    cardSub: {
      fontSize: 13.5,
      lineHeight: 18,
      color: isDarkMode ? "#8496A9" : "#6B7A90",
      marginTop: 2,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    // "Other ways to do Seva" list rows
    meansRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      width: "100%",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDarkMode ? "#1B3A5B" : "#EFE4C6",
      backgroundColor: isDarkMode ? "#0C2036" : "#FFFDF7",
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    meansIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    meansTextWrap: {
      flex: 1,
    },
    meansTitle: {
      fontSize: 15.5,
      fontWeight: "normal",
      color: isDarkMode ? theme.staticColors.WHITE_COLOR : "#113979",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    meansSub: {
      fontSize: 13,
      lineHeight: 17,
      color: isDarkMode ? "#8496A9" : "#6B7A90",
      marginTop: 2,
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
