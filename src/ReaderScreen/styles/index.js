import { colors } from "@common";

const createStyles = (theme) => ({
  gurmukhiText: {
    margin: theme.spacing.sm,
  },
  translit: {
    fontFamily: theme.typography.fonts.balooPaaji,
    padding: theme.spacing.xs,
    fontSize: theme.typography.sizes.md,
  },
  englishTranslations: {
    padding: theme.spacing.xs,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
  },
  spanishTranslations: {
    padding: theme.spacing.xs,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
  },
  punjabiTranslations: {
    padding: theme.spacing.xs,
    fontSize: theme.typography.sizes.md,
  },
  vishraamGradient: {
    borderRadius: theme.radius.sm,
  },

  vishraamShort: {
    color: colors.VISHRAM_SHORT,
  },
  larivaarAssist: {
    opacity: 0.65,
  },
  webView: { flex: 1 },
  top50: { marginTop: theme.spacing.xxxl + theme.spacing.lg },
  paragraphStyle: { flex: 1, flexDirection: "row" },
  slider: {
    flex: 1,
  },
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 70,
  },
  container: {
    borderRadius: theme.radius.lg + theme.spacing.lg,
    width: "100%",
    zIndex: 100,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    overflow: "hidden",
    backgroundColor: theme.colors.primary,
    elevation: 12,
  },
  progressBarContainer: {
    height: 5,
    width: "100%",
    backgroundColor: theme.colors.disabled || "#E0E0E0",
    zIndex: 100,
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  sliderText: {
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.md,
  },

  headerWrapper: {
    flexDirection: "row",
    height: 80,
    width: "100%",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  headerLeft: {
    paddingLeft: theme.spacing.lg,
    alignItems: "flex-start",
    justifyContent: "center",
    width: "10%",
  },

  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
  },

  headerRight: {
    marginRight: theme.spacing.lg,
    width: "10%",
  },

  footerWrapper: {
    paddingLeft: theme.spacing.xl,
    paddingRight: theme.spacing.xl,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
    height: theme.components.header.height + theme.spacing.sm,
  },
  headerTitleStyle: {
    color: theme.colors.primaryHeaderVariant,
    fontSize: theme.typography.sizes.xxl,
    zIndex: 1,
  },
  footerTitleStyle: {
    color: theme.staticColors.WHITE_COLOR,
    fontFamily: theme.typography.fonts.gurbaniPrimary,
    fontSize: theme.typography.sizes.lg,
  },
  headerStyle: {
    backgroundColor: theme.mode === "dark" ? "rgba(18, 18, 18, 1)" : "#FFFFFF",
  },
  animatedView: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  autoScrollFixedView: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: theme.components.bottomNavigation.height + theme.spacing.sm + 5,
    zIndex: 10,
    elevation: 10,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  // Bottom-nav overlay: pinned to the bottom edge and slid out of view via a
  // single native-driver transform, so showing/hiding the bars never resizes
  // the flex WebView underneath (that reflow was the low-end-Android jank).
  bottomChrome: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
  // Reading-progress bar — a separate bottom-pinned layer that never hides. It
  // lifts to sit on top of the nav when the bars show and drops to the bottom
  // edge when they hide, so progress stays visible either way.
  scrollProgressBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Explicit width so the percentage-width fill child always has a definite
    // base to resolve against. Without it, the fill's initial "0%" can fail to
    // resolve against the (left/right-sized) parent and render full-width — the
    // progress bar looked "complete" on first open.
    width: "100%",
    height: 5,
    overflow: "hidden",
    zIndex: 11,
    elevation: 11,
    backgroundColor: "rgba(37, 105, 214, 0.2)",
  },
  // Width-driven, not transform: scaleX — scaleX stretches/squishes the
  // already-painted pixels non-uniformly along X. Animating width directly
  // keeps the fill true at every percentage.
  scrollProgressFill: {
    height: "100%",
    // Anchor to the left. Without this, the column container's default
    // alignItems:"stretch" makes the fill span the FULL width whenever its
    // animated width isn't resolved on a given frame — which made the bar look
    // 100% complete on a bani's first open.
    alignSelf: "flex-start",
    width: 0,
    backgroundColor: "#7A99C980",
  },
});
export default createStyles;
