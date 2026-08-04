// ManageDownloads styles, on the design tokens.
//
// The previous version carried a comment admitting the header design gambled on
// string length: "we accept they may overlap the title on very short locales;
// the title is never long enough to collide in practice." That header is gone —
// the screen uses the shared `ScreenHeader`, whose columns cannot overlap.
//
// Everything here now comes from resolved tokens, so paddings and row heights
// scale with the device width and the user's text-size setting.
const createStyles = ({ c, space, layout, radii, type }) => ({
  // ── Section headings ───────────────────────────────────────────────────
  // Same shape as a Settings group heading: quiet label OUTSIDE and above the
  // card, not a banner across the list.
  sectionHeader: {
    ...type.label,
    marginTop: space.xl,
    marginHorizontal: space.md,
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    color: c.textSecondary,
  },
  // The first heading sits directly under the selection bar, which already
  // supplies its own padding — the full group gap on top of that read as a
  // hole before the list began.
  sectionHeaderFirst: {
    marginTop: space.sm,
  },

  // ── The card each bani's tracks sit in ─────────────────────────────────
  // SectionList cannot wrap a section in a single view, so the corners are
  // carried by the first and last row of each section instead.
  cardTop: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  cardBottom: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  rowSeparator: {
    height: layout.borderWidth.hairline,
    backgroundColor: c.border,
    marginHorizontal: space.md + layout.row.paddingHorizontal,
  },

  // ── Selection toolbar ──────────────────────────────────────────────────
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: space.sm,
    paddingHorizontal: layout.row.paddingHorizontal,
    paddingVertical: space.sm,
    backgroundColor: c.backgroundAlt,
  },
  selectAllControl: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.touchTarget,
    flexShrink: 1,
  },
  selectAllLabel: {
    ...type.body,
    color: c.textPrimary,
    flexShrink: 1,
  },
  selectionSummary: {
    ...type.caption,
    color: c.textSecondary,
    flexShrink: 1,
    textAlign: "right",
  },

  // Invisible, always-mounted spotlight target used by the downloads coachmark
  // when there's no completed-downloads summary to point at (empty list or a
  // download still in progress). Transparent so it never changes what the user
  // sees.
  spotlightAnchor: {
    height: space.xxl,
    alignSelf: "stretch",
    backgroundColor: "transparent",
  },

  // ── Track rows ─────────────────────────────────────────────────────────
  // Inside the card, so they carry the card's horizontal inset and no border
  // of their own — separation is the inset hairline between them.
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surface,
    marginHorizontal: space.md,
    paddingVertical: layout.row.paddingVertical,
    paddingHorizontal: layout.row.paddingHorizontal,
    // A minimum, so a long track name in any language makes the row taller
    // rather than clipping.
    minHeight: layout.row.minHeight,
  },
  trackRowChecked: {
    backgroundColor: c.surfaceSelected,
  },
  inProgressRow: {
    opacity: 0.7,
  },

  // ── Checkbox ───────────────────────────────────────────────────────────
  // Previously branched on `theme.mode === "dark"` in three places because the
  // brand navy is invisible on a dark ground. `c.accent` already resolves per
  // theme, so the branch is gone.
  checkbox: {
    width: space.xl,
    height: space.xl,
    borderRadius: radii.sm,
    borderWidth: layout.borderWidth.thick,
    borderColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.md,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },

  // ── Track text ─────────────────────────────────────────────────────────
  trackInfo: {
    flex: 1,
  },
  trackName: {
    ...type.body,
    color: c.textPrimary,
  },
  trackMeta: {
    ...type.caption,
    color: c.textSecondary,
    marginTop: space.xxs,
  },
  trackSize: {
    ...type.caption,
    color: c.textSecondary,
    marginLeft: space.sm,
    flexShrink: 0,
  },

  // ── List ───────────────────────────────────────────────────────────────
  list: {
    flex: 1,
    backgroundColor: c.backgroundAlt,
  },
  listContent: {
    paddingBottom: layout.screenPaddingBottom,
  },

  // ── Empty state ────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
    gap: space.lg,
    backgroundColor: c.backgroundAlt,
  },
  emptyTitle: {
    ...type.subheading,
    color: c.textPrimary,
    textAlign: "center",
  },
  emptyHint: {
    ...type.bodySmall,
    color: c.textSecondary,
    textAlign: "center",
  },

  // ── Delete action in the header ────────────────────────────────────────
  deleteButton: {
    width: layout.header.actionSize,
    height: layout.header.actionSize,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBadge: {
    position: "absolute",
    top: space.xs,
    right: space.xxs,
    minWidth: space.lg,
    minHeight: space.lg,
    borderRadius: radii.pill,
    backgroundColor: c.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxs,
  },
  deleteBadgeText: {
    ...type.caption,
    // Was fontSize 9 — below any readable minimum, and it did not scale with
    // the user's text-size setting either.
    color: c.onError,
    textAlign: "center",
  },
});

export default createStyles;
