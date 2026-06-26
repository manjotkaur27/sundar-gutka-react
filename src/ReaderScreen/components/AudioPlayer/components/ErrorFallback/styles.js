import { Platform } from "react-native";

const createStyles = (theme) => ({
  statusContainer: {
    padding: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md_12,
    margin: theme.spacing.md_12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  closeButton: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
  },
  noTracksContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  noTracksText: {
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    fontSize: theme.typography.sizes.xxl,
    color: theme.colors.audioTitleText,
  },
  noTracksSubtext: {
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    fontSize: theme.typography.sizes.xxl,
    color: theme.colors.audioTitleText,
    textAlign: "center",
  },
  titleText: {
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    fontSize: theme.typography.sizes.xxl,
    color: theme.colors.audioTitleText,
  },
  joinMailingListButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md_12,
  },
  joinMailingListText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
    textDecorationLine: "underline",
    // Centre wrapped lines so longer translations (e.g. French/Italian) stay
    // centred rather than rendering left-aligned when the label spans two lines.
    textAlign: "center",
  },
  joinMailingListArrow: {
    // System font (not BalooPaaji, which lacks the arrow glyph) so "→" renders
    // identically across OEMs. Not underlined, unlike the label it follows.
    fontFamily: Platform.select({ android: "sans-serif", ios: "Helvetica" }),
    textDecorationLine: "none",
  },
});
export default createStyles;
