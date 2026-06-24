const createStyles = (theme) => ({
  headerTitleStyle: {
    color: theme.colors.primaryText,
    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
  },
  headerStyle: {
    backgroundColor: theme.colors.surface,
  },
  nightBackColor: { backgroundColor: theme.staticColors.NIGHT_BLACK },
  iconStyle: { alignSelf: "flex-start" },
  imageStyle: {},
  settingText: {
    fontSize: theme.typography.sizes.xl,
    alignSelf: "center",
    color: theme.colors.primaryText,
    position: "absolute",
    top: theme.spacing.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
  },
  settingsView: { backgroundColor: theme.colors.surface },
  displayOptionsText: {
    padding: theme.spacing.sm + theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    color: theme.colors.primaryText,
    fontSize: theme.typography.sizes.md,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.normal,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  bottomSheetTitle: {
    textAlign: "center",
    fontSize: theme.typography.sizes.xxl,
    padding: theme.spacing.xl,
    borderTopLeftRadius: theme.radius.lg + theme.spacing.sm,
    borderTopRightRadius: theme.radius.lg + theme.spacing.sm,
    fontWeight: theme.typography.weights.medium,
  },
  titleInfoStyle: {
    fontSize: theme.typography.sizes.sm,
    // Match the left-hand setting name (white in dark, near-black in light)
    // instead of the muted bluish-grey textDisabled.
    color: theme.colors.primaryText,
  },
  end: {
    padding: theme.spacing.xxl + theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  // tintColor recolors these monochrome PNG setting icons to match the vector
  // (@rneui) icons — near-black in light, near-white in dark — so none of them
  // render as low-contrast grey-on-grey.
  avatarStyle: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    tintColor: theme.colors.primaryText,
  },
  // Untinted variant for icons whose original colours carry meaning (e.g. the
  // Theme row's colour-swatch icon), so they aren't flattened to a single colour.
  avatarStyleUntinted: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  iconContainerStyle: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  viewWrapper: {
    justifyContent: "center",
    marginTop: "auto",
    marginLeft: "auto",
    marginRight: "auto",
    bottom: 0,
    borderTopLeftRadius: theme.radius.lg + theme.spacing.sm,
    borderTopRightRadius: theme.radius.lg + theme.spacing.sm,
    overflow: "hidden",
  },
  width_100: {
    width: "98%",
  },
  width_90: {
    width: "70%",
  },
  blurViewStyle: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  androidViewWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
    width: "100%",
  },
  databaseUpdateBannerWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.sm,
  },
  baniDbImage: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    marginRight: theme.spacing.md,
  },
  updateText: {
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.md,
  },
  listItemTitle: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sizes.lg,
    lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.normal,
  },
  listItemSubtitle: {
    color: theme.colors.textDisabled,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.balooPaaji,
    marginTop: 2,
  },
  containerNightStyles: {
    backgroundColor: theme.colors.surfaceGrey,
    // Override RNEUI's `bottomDivider` hairline (1px ÷ pixelRatio ≈ 0.38dp),
    // which rounds to 0 on every other row on non-integer-density screens,
    // making alternating dividers vanish. A solid 1dp line never collapses.
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
});
export default createStyles;
