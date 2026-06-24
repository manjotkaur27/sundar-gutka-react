// ManageDownloads styles — intentionally mirrors Settings screen conventions:
// section headers use displayOptionsText, rows use surfaceGrey background,
// all colors come from theme to support light/dark automatically.
const createStyles = (theme) => ({
  // ── Section headers — same as Settings displayOptionsText ───────────────────
  sectionHeader: {
    paddingHorizontal: theme.spacing.md_12,
    paddingVertical: theme.spacing.sm + theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    color: theme.colors.primaryText,
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.balooPaaji,
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.normal,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },

  // ── Storage summary row ─────────────────────────────────────────────────────
  summaryText: {
    paddingHorizontal: theme.spacing.md_12,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textDisabled,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.balooPaaji,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },

  // Invisible, always-mounted spotlight target used by the downloads coachmark
  // when there's no completed-downloads summary to point at (empty list or a
  // download still in progress). Small height keeps the cutout tidy; transparent
  // so it never changes what the user sees.
  spotlightAnchor: {
    height: 36,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },

  // ── Track rows ──────────────────────────────────────────────────────────────
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceGrey,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md_12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
    minHeight: 52,
  },
  trackRowChecked: {
    backgroundColor: theme.colors.actionButton,
  },
  inProgressRow: {
    opacity: 0.7,
  },

  // ── Checkbox ────────────────────────────────────────────────────────────────
  // In dark mode theme.colors.primary (#113979) is very dark on dark backgrounds.
  // Use the lighter highlight blue (highlightTuk) so the checkbox is clearly
  // visible and matches the lighter accent already used for tuk highlights.
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.mode === 'dark' ? theme.colors.highlightTuk : theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md_12,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.highlightTuk : theme.colors.primary,
    borderColor: theme.mode === 'dark' ? theme.colors.highlightTuk : theme.colors.primary,
  },

  // ── Track text ──────────────────────────────────────────────────────────────
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.balooPaaji,
    lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.normal,
  },
  trackMeta: {
    color: theme.colors.textDisabled,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.balooPaaji,
    marginTop: 2,
  },
  trackSize: {
    color: theme.colors.textDisabled,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.balooPaaji,
    marginLeft: theme.spacing.md,
    flexShrink: 0,
  },

  // ── List ────────────────────────────────────────────────────────────────────
  list: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  listContent: {
    paddingBottom: theme.spacing.xxl,
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  emptyTitle: {
    color: theme.colors.primaryText,
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: 'center',
  },
  emptyHint: {
    color: theme.colors.textDisabled,
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.balooPaaji,
    textAlign: 'center',
    lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed,
  },

  // ── AppBar right-side actions ────────────────────────────────────────────────
  // The View must not be constrained by AppBar's 48px side column,
  // so ManageDownloads passes this as rightComponent content and we rely on
  // the fact that AppBar's `side` View clips to its width — for this screen
  // we need the right side to flex wider, so we use a plain View positioned
  // absolutely relative to the header row. The simpler solution used here:
  // render both action text buttons in a horizontal row and accept they may
  // overlap the title on very short locales; the title is never long enough
  // to collide with "Select All" + "Delete (N)" in practice.
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingRight: theme.spacing.xs,
  },
  headerActionText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.balooPaaji,
    color: theme.colors.primary,
  },
  deleteActionText: {
    color: '#D32F2F',
  },
});

export default createStyles;
