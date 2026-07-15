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
  joinMailingListContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  joinMailingListText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
    textDecorationLine: "underline",
  },
});
export default createStyles;
