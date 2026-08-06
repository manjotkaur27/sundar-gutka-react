import { StyleSheet } from "react-native";
import { themeForScreen } from "@theme/screenPalettes";

const createStyles = (theme) => {
  // Seva draws with its OWN colours, resolved through the same role names the
  // rest of the app uses, so every c.x below is unchanged and only the values
  // differ. Roles Seva does not override still come from the semantic layer.
  const { c } = themeForScreen(theme, "seva");

  return StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: c.backgroundAlt,
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
      backgroundColor: c.backgroundAlt,
      // stretch → hero/section text and cards fill the width and left-align.
      alignItems: "stretch",
    },
    // NB: `header`, `backButton`, `headerTitle` and `headerSpacer` were removed
    // from here. They belonged to a hand-rolled navy header this screen no
    // longer draws — it uses the shared `AppBar` now — and nothing referenced
    // them. They also held the last two legacy colour reads in this screen.
    // Bold is expressed by naming the SemiBold FILE, never by a numeric weight
    // beside the family. Baloo ships as separate named TTFs, so a weight makes
    // Android try to synthesize and silently drop to the system font.
    title: {
      fontSize: 32,
      color: c.textPrimary,
      textAlign: "center",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    headline: {
      color: c.textPrimary,
      textAlign: "center",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
      textAlign: "left",
      width: "100%",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    link: {
      color: c.accent,
      textDecorationLine: "underline",
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    // Shorter box (SIO-155): reduced vertical padding, and "/month" now sits
    // inline in the row rather than on a second line below.
    amountCard: {
      // Light mode sits on the page's own pale-blue ground rather than pure
      // white, so the figure reads as part of the page instead of a floating
      // white slab. The shadow below still separates it from the ground.
      backgroundColor: c.surface,
      borderRadius: 16,
      paddingTop: 8,
      paddingBottom: 10,
      paddingHorizontal: 20,
      width: "100%",
      alignItems: "center",
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    // The card is a control now (tapping the figure switches to Other), so
    // it acknowledges the touch.
    amountCardPressed: {
      opacity: 0.85,
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
      fontFamily: theme.typography.fonts.balooPaaji,
      color: c.textPrimary,
      textAlign: "center",
      includeFontPadding: false,
      padding: 0,
    },
    // Inline "0" placeholder span (muted) — shown before the user types.
    amountPlaceholder: {
      color: c.textSecondary,
    },
    // Inline "/month" span beside the amount (smaller + muted, same baseline).
    perMonthSpan: {
      fontSize: 18,
      fontFamily: theme.typography.fonts.balooPaaji,
      color: c.textSecondary,
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
      borderColor: c.borderStrong,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    amountButtonSelected: {
      backgroundColor: c.controlAccent,
      borderColor: c.controlAccent,
    },
    amountButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.textPrimary,
      textAlign: "center",
    },
    amountButtonTextSelected: {
      // Pairs with controlAccent: white on the navy pill in light, near-black
      // on the bright blue one in dark. Reading onPrimary here put white on the
      // dark-mode blue at 3.7:1.
      color: c.onControlAccent,
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
    // `controlAccent`: the frequency radios track the Settings switches — the
    // brand navy in light, the bright blue in dark. Not `primary`, which is
    // chrome and stays navy in both.
    radioButton: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 2,
      // The radio ring is the link blue, not the donate button navy: the same
      // colour in light, its own brighter blue in dark.
      borderColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    radioButtonSelected: {
      width: 12,
      height: 12,
      borderRadius: 6,
      // Matches the ring around it.
      backgroundColor: c.accent,
    },
    frequencyText: {
      fontSize: 14,
      color: c.textSecondary,
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
      backgroundColor: c.surfaceBright,
      alignItems: "center",
      justifyContent: "center",
    },
    donateIcon: {
      fontSize: 18,
      color: c.textBrand,
    },
    donateButtonText: {
      fontSize: 22,
      // The button is a gradient of controlAccent -> controlAccentPressed, so
      // its label takes that pairing: white on the navy in light, near-black on
      // the bright blue in dark.
      color: c.onControlAccent,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    footerText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: 16,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    taxNote: {
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
      textAlign: "center",
      width: "100%",
      paddingHorizontal: 8,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    // ─── New server-driven layout (hero + donate card + "other ways" list) ────
    heroTitle: {
      // Swapped with the AppBar "Seva" title: the hero line is now the smaller
      // of the two (the AppBar is 26).
      fontSize: 20,
      lineHeight: 26,
      color: c.textPrimary,
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
      includeFontPadding: false,
    },
    heroDesc: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
      width: "100%",
      // Left, not justified. Justification stretches the word gaps on every
      // line but the last, which reads as ragged holes at this measure, and
      // Android only honours it from API 26 anyway — below that it silently
      // fell back to left, so the screen already differed by OS version.
      textAlign: "left",
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: "normal",
      color: c.textPrimary,
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
      borderColor: c.border,
      backgroundColor: c.surfaceElevated,
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
      backgroundColor: c.surfaceSelected,
    },
    donateCardHeaderText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 17,
      color: c.textPrimary,
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    cardSub: {
      fontSize: 13.5,
      lineHeight: 18,
      color: c.textSecondary,
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
      borderColor: c.border,
      backgroundColor: c.surfaceElevated,
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
      color: c.textPrimary,
      fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    },
    meansSub: {
      fontSize: 13,
      lineHeight: 17,
      color: c.textSecondary,
      marginTop: 2,
      fontFamily: theme.typography.fonts.balooPaaji,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: c.backgroundAlt,
    },
    retentionBanner: {
      backgroundColor: c.goldSurface,
      borderColor: c.gold,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      width: "100%",
    },
    retentionText: {
      color: c.goldText,
      fontSize: 14,
      textAlign: "center",
      fontWeight: "600",
    },
  });
};

export default createStyles;
