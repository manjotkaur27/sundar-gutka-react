const createStyles = (theme) => ({
  container: {
    flex: 1,
  },
  // NB: nine style blocks were removed from here — `header`, `fateh`,
  // `headerDesign`, `headerTitle`, `titleContainer`, `settingIcon`,
  // `headerFatehStyle`, `fatehContainer` and `ikongkar`. They belonged to the
  // navy header this screen used to have, nothing referenced them any more, and
  // between them they held every remaining legacy `theme.colors` /
  // `staticColors` read in this screen. `react-native/no-unused-styles` cannot
  // see them because the styles live in this file and are consumed in another.
  newHeaderContainer: {
    backgroundColor: theme.c.background,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  newHeaderInvocationText: {
    fontSize: 15,
    color: theme.c.textSecondary,
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: "center",
    opacity: 0.8,
  },
  // Ik Onkar ੴ — Baloo Paaji, like the rest of the invocation line. Colour is
  // inherited from newHeaderInvocationText to stay on-theme.
  ikOnkarGlyph: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: 18,
  },
  // Floral ornaments ("Œ"/"‰") flanking the title — Gurbani font, tinted with
  // the title colour so they track light/dark like the rest of the header.
  titleFlower: {
    fontFamily: theme.typography.fonts.gurbaniPrimary,
    fontSize: theme.typography.sizes.huge,
    color: theme.c.headerFg,
  },
  newHeaderTitleText: {
    fontSize: 32,
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
    color: theme.c.headerFg,
    textAlign: "center",
    marginTop: 1.2, // 40% less than the original 2px gap to the invocation line above
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
