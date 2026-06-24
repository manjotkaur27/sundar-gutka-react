const createStyles = (theme) => ({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    // Top-aligned (not centered) so this screen's content begins at the same
    // height as the Bani-length selector, which lays its content out from the top.
    flexGrow: 1,
  },
  viewWrapper: {
    marginVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
  },
  heading: {
    color: theme.staticColors.WHITE_COLOR,
    // Baloo Paaji supports both Latin and Gurmukhi, so a single font keeps this
    // first-run screen consistent (no mix of Gurbani-thick + system fonts).
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: "center",
    fontSize: theme.typography.sizes.massive,
  },
  subheading: {
    marginTop: theme.spacing.md,
    color: theme.staticColors.WHITE_COLOR,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
    textAlign: "center",
    opacity: 0.9,
  },
  button: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.primaryText,
    fontFamily: theme.typography.fonts.balooPaaji,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.xxl,
    // No fontWeight: on Android, a weight on a named asset font (BalooPaaji2-Regular)
    // makes RN hunt for a bold variant, fail, and fall back to the system font —
    // which is why these looked non-Baloo. Matching the body text (no weight)
    // keeps them in Baloo.
    textAlign: "center",
    borderRadius: theme.components.button.borderRadius,
    minHeight: theme.components.button.minHeight * 0.9,
  },
});

export default createStyles;
