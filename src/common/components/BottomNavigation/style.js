const createStyles = (theme) => ({
  container: {
    width: "100%",
    backgroundColor: theme.colors.primary,
    height: theme.components.bottomNavigation.height,
    justifyContent: "center",
  },
  navigationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "95%",
    marginLeft: "auto",
    marginRight: "auto",
    paddingHorizontal: 8,
  },
  iconContainer: {
    flex: 1,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 80,
  },
  activeIconContainer: {
    backgroundColor: theme.staticColors.WHITE_COLOR,
    borderRadius: 15,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.staticColors.WHITE_COLOR,
    fontFamily: theme.typography.fonts.balooPaaji,
    marginTop: 2,
  },
});

export default createStyles;
