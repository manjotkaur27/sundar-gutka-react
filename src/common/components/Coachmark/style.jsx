const createStyles = (theme) => {
  const isDark = theme.mode === "dark";
  const surface = isDark ? theme.staticColors.NIGHT_BLACK : theme.colors.surface;
  const textColor = isDark ? theme.staticColors.WHITE_COLOR : theme.staticColors.NIGHT_BLACK;

  return {
    // Width is flex/percentage-based (never fixed px) so longer translations
    // wrap instead of overflowing; the library positions this relative to the
    // highlighted element.
    card: {
      maxWidth: 300,
      borderRadius: theme.components.button.borderRadius,
      backgroundColor: surface,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    title: {
      color: textColor,
      fontWeight: theme.typography.weights.bold,
      fontSize: theme.typography.sizes.lg,
      marginBottom: theme.spacing.sm,
    },
    body: {
      color: textColor,
      fontSize: theme.typography.sizes.md,
      lineHeight: theme.typography.sizes.md + theme.spacing.md,
      opacity: 0.9,
    },
    progress: {
      color: textColor,
      opacity: 0.5,
      fontSize: theme.typography.sizes.sm,
      marginTop: theme.spacing.md,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.sm,
    },
    skipBtn: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    skipText: {
      color: textColor,
      opacity: 0.6,
      fontSize: theme.typography.sizes.md,
    },
    nextBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.components.button.borderRadius,
    },
    nextText: {
      color: theme.staticColors.WHITE_COLOR,
      fontWeight: theme.typography.weights.bold,
      fontSize: theme.typography.sizes.md,
    },
    // Simple, library-free callout shown above the bottom nav in the reader.
    // Absolutely positioned so it never measures/clips anything.
    hintWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 82,
      alignItems: "center",
      // No horizontal padding here: the arrow row's width:"95%" must be measured
      // against the FULL screen so its 4 slots line up with the bottom nav's
      // tabs (also 95% of the full screen). The bubble stays inset via its own
      // maxWidth. Padding here previously shrank the arrow row and pushed the
      // pointer left of the Music tab.
    },
    hintBubble: {
      maxWidth: "94%",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.components.button.borderRadius,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: "center",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    hintText: {
      color: theme.staticColors.WHITE_COLOR,
      fontSize: theme.typography.sizes.md,
      textAlign: "center",
      lineHeight: theme.typography.sizes.md + theme.spacing.sm,
    },
    hintDismissBtn: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.components.button.borderRadius,
    },
    hintDismissText: {
      color: theme.colors.primaryText,
      fontWeight: theme.typography.weights.bold,
      fontSize: theme.typography.sizes.md,
    },
    // Mirrors BottomNavigation's `navigationBar` (width 95%, paddingHorizontal 8,
    // space-between) so each slot's centre lines up with a nav tab. A small
    // negative bottom margin lowers the arrow toward the nav (which starts ~65px
    // from the screen bottom) without covering the icon.
    hintArrowRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "95%",
      alignSelf: "center",
      paddingHorizontal: 8,
      marginTop: theme.spacing.sm,
      marginBottom: -12,
    },
    // Mirrors BottomNavigation's `iconContainer` (flex:1, maxWidth:80, centered)
    // so slot index 2 sits directly above the Music/audio tab.
    hintArrowSlot: {
      flex: 1,
      maxWidth: 80,
      alignItems: "center",
    },
    hintArrowBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    hintActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.md,
    },
    hintSecondaryBtn: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      marginRight: theme.spacing.sm,
    },
    hintSecondaryText: {
      color: theme.staticColors.WHITE_COLOR,
      opacity: 0.85,
      fontSize: theme.typography.sizes.md,
    },
    hintPrimaryBtn: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.components.button.borderRadius,
    },
    hintPrimaryText: {
      color: theme.colors.primaryText,
      fontWeight: theme.typography.weights.bold,
      fontSize: theme.typography.sizes.md,
    },
  };
};

export default createStyles;
