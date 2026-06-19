const createStyles = (theme) => ({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.primary,
  },
  fateh: {
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.xl,
    textAlign: "center",
    margin: theme.spacing.sm,
  },
  headerDesign: {
    fontSize: theme.typography.sizes.massive,
    color: theme.staticColors.WHITE_COLOR,
    fontFamily: theme.typography.fonts.gurbaniPrimary,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.huge,
    color: theme.staticColors.WHITE_COLOR,
    fontWeight: theme.typography.weights.medium,
  },
  titleContainer: {
    textAlign: "center",
    margin: theme.spacing.sm,
  },
  settingIcon: {
    position: "absolute",
    bottom: theme.spacing.md,
    right: theme.spacing.sm,
  },
  headerFatehStyle: {
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.xl,
  },
  fatehContainer: {
    marginLeft: "auto",
    marginRight: "auto",
  },
  ikongkar: {
    fontFamily: theme.typography.fonts.gurbaniPrimary,
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.xxl,
  },
  newHeaderContainer: {
    backgroundColor: theme.mode === "dark" ? "#041126" : theme.colors.surface,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  // Wraps just the title line, so the icon below is positioned relative to
  // this row's own height — vertically centered against the title text
  // itself, not the header block as a whole.
  titleRow: {
    width: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsWrap: {
    position: "absolute",
    right: theme.spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 2,
  },
  newHeaderInvocationText: {
    fontSize: 15,
    color: theme.mode === "dark" ? "#8A99AD" : "#718096",
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: "center",
    opacity: 0.8,
  },
  newHeaderTitleText: {
    fontSize: 32,
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    color: theme.mode === "dark" ? theme.staticColors.WHITE_COLOR : theme.colors.primary,
    textAlign: "center",
    marginTop: 2,
  },
  newHeaderGradientDivider: {
    marginTop: theme.spacing.sm,
  },
});

export default createStyles;
