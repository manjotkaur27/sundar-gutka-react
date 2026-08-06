const createStyles = (theme) => {
  // Mirrors ConfirmDialogHost's explicit light/dark branching — proven to render
  // correctly in both modes for modals over a dark backdrop, unlike
  // theme.c.surface/primaryText which read too close to the backdrop in dark mode.
  const helpSurface = theme.c.surface;
  const helpTextColor = theme.c.textPrimary;

  return {
  heading: {
    color: theme.c.onPrimary,
    // Baloo Paaji supports both Latin and Gurmukhi, so a single font keeps this
    // first-run screen consistent (no mix of Gurbani-thick + system fonts).
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: "center",
    fontSize: theme.typography.sizes.massive + theme.spacing.sm,
  },
  viewWrapper: {
    marginVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
  },
  wrapper: {
    flex: 1,
    backgroundColor: theme.c.primary,
  },
  baniLengthMessage: {
    marginTop: theme.spacing.md,
    color: theme.c.onPrimary,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
  },
  textPreferrence: {
    marginTop: theme.spacing.md,
    color: theme.c.onPrimary,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.xl,
  },
  button: {
    backgroundColor: theme.c.surface,
    color: theme.c.textPrimary,
    fontFamily: theme.typography.fonts.balooPaaji,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.xxl,
    textAlign: "center",
    textTransform: "uppercase",
    borderRadius: theme.components.button.borderRadius,
    minHeight: theme.components.button.minHeight * 0.9,
  },
  helpText: {
    color: theme.c.goldFill,
    fontFamily: theme.typography.fonts.balooPaaji,
    // No fontWeight/fontStyle: both make Android fall back off the Baloo asset font.
    fontSize: theme.typography.sizes.sm,
  },
  helpWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  helpRoot: {
    flex: 1,
  },
  // Dismiss layer — absolutely positioned behind helpCenterWrapper so it's a
  // sibling, not an ancestor, of the ScrollView. An ancestor Pressable around
  // a ScrollView fights it for the touch responder on Android.
  helpBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.c.scrim,
  },
  helpCenterWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  },
  helpCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    // Without flexShrink, RN's default (0) lets the ScrollView grow to its full
    // content height instead of shrinking to fit inside maxHeight — overflow:
    // hidden then clips that excess instead of letting it spill past the card.
    flexShrink: 1,
    overflow: "hidden",
    borderRadius: theme.components.button.borderRadius,
    backgroundColor: helpSurface,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  helpTitle: {
    color: helpTextColor,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.lg,
    marginBottom: theme.spacing.md,
  },
  helpScroll: {
    // flexShrink lets this take only the space left over after the title/close
    // button inside helpCard's maxHeight, so it actually has overflow to scroll.
    flexShrink: 1,
    marginBottom: theme.spacing.md,
  },
  helpLine: {
    color: helpTextColor,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.sm,
    lineHeight: theme.typography.sizes.sm + theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  helpCloseBtn: {
    alignSelf: "flex-end",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  helpCloseText: {
    color: theme.c.primary,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
  },
  };
};
export default createStyles;
