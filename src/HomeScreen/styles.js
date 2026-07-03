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
  newHeaderInvocationText: {
    fontSize: 15,
    color: theme.mode === "dark" ? "#8A99AD" : "#718096",
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: "center",
    opacity: 0.8,
  },
  // Ik Onkar "<>" ligature — Gurbani font so it keeps the elongated stroke.
  // Colour is inherited from newHeaderInvocationText to stay on-theme.
  ikOnkarGlyph: {
    fontFamily: theme.typography.fonts.gurbaniPrimary,
    fontSize: 18,
  },
  // Floral ornaments ("Œ"/"‰") flanking the title — Gurbani font, tinted with
  // the title colour so they track light/dark like the rest of the header.
  titleFlower: {
    fontFamily: theme.typography.fonts.gurbaniPrimary,
    fontSize: theme.typography.sizes.huge,
    color: theme.mode === "dark" ? theme.staticColors.WHITE_COLOR : theme.colors.primary,
  },
  newHeaderTitleText: {
    fontSize: 32,
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    color: theme.mode === "dark" ? theme.staticColors.WHITE_COLOR : theme.colors.primary,
    textAlign: "center",
    marginTop: 2,
  },
  // Title stays centred; the settings icon is absolutely positioned on the right
  // (like the folder header's back arrow) so it never shifts the title off-centre.
  titleRow: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsWrap: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  newHeaderGradientDivider: {
    marginTop: theme.spacing.sm,
  },
});

export default createStyles;
