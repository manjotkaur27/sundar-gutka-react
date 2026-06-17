const createStyles = (theme) => {
  // Mirrors ConfirmDialogHost's explicit light/dark branching — proven to render
  // correctly in both modes for modals over a dark backdrop, unlike
  // theme.colors.surface/primaryText which read too close to the backdrop in dark mode.
  const isDark = theme.mode === "dark";
  const helpSurface = isDark ? theme.staticColors.NIGHT_BLACK : theme.colors.surface;
  const helpTextColor = isDark ? theme.staticColors.WHITE_COLOR : theme.staticColors.NIGHT_BLACK;

  return {
  heading: {
    color: theme.staticColors.WHITE_COLOR,
    fontFamily: theme.typography.fonts.gurbaniThick,
    textAlign: "center",
    fontSize: theme.typography.sizes.massive + theme.spacing.sm,
  },
  viewWrapper: {
    marginVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
  },
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  baniLengthMessage: {
    marginTop: theme.spacing.md,
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.md,
  },
  textPreferrence: {
    marginTop: theme.spacing.md,
    color: theme.staticColors.WHITE_COLOR,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.xl,
  },
  button: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.primaryText,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    textAlign: "center",
    textTransform: "uppercase",
    borderRadius: theme.components.button.borderRadius,
    minHeight: theme.components.button.minHeight * 0.9,
  },
  helpText: {
    color: theme.colors.primaryVariant,
    fontWeight: theme.typography.weights.bold,
    fontStyle: "italic",
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
    fontWeight: theme.typography.weights.bold,
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
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.md,
  },
  };
};
export default createStyles;
