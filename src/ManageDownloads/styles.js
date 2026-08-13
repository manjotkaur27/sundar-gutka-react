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
    borderTopWidth: layout.borderWidth.hairline,
  },
  cardBottom: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    borderBottomWidth: layout.borderWidth.hairline,
  },
  rowSeparator: {
    height: layout.borderWidth.hairline,
    backgroundColor: c.border,
    // Full bleed across the card, exactly like a Settings row's divider — that
    // one is a `borderBottomWidth` ON the row, so it spans the card's whole
    // width. Insetting this by the row's own padding as well produced the
    // gap-at-each-end treatment the bani list uses, which is what made this
    // screen read as a mix of the two. Matching the card inset alone also keeps
    // the card's side edges unbroken, since the separator is the full width of
    // the rows above and below it.
    marginHorizontal: space.md,
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
    // The card edge, matching a Settings group exactly.
    borderLeftWidth: layout.borderWidth.hairline,
    borderRightWidth: layout.borderWidth.hairline,
    borderColor: c.border,
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
  // Wraps the icon alone, so the badge below has the icon's box to anchor to.
  deleteIconWrap: { position: "relative" },
  // Sits ON the icon's top-right corner. The offsets are negative because the
  // anchor is the icon wrapper (24pt), not the 48pt touch target — measured
  // from the button, `right: 2` put the badge clear of the icon's right edge
  // entirely, which is the gap it used to float in.
  deleteBadge: {
    position: "absolute",
    // A corner badge sits MOSTLY outside its icon — roughly half on, half off.
    // At -4 it landed across the middle of the bin instead, obscuring the glyph
    // it is meant to annotate. Half the badge width clears the corner properly.
    top: -space.sm,
    right: -space.sm,
    minWidth: layout.icon.xs,
    // A FIXED height, not `minHeight`. Caption is 12pt at a 1.4 line height, so
    // the glyph box is ~17pt and a `minHeight: 16` box grew to fit it — one pt
    // taller than it was wide, which is why a single digit rendered as a slight
    // oval instead of a circle. Pinning the height keeps it square, and
    // `radii.pill` then makes it round. A 2+ digit count still widens into a
    // stadium, which is the conventional shape for that.
    height: layout.icon.xs,
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
    // Matched to the badge height so the glyph centres and cannot push the box
    // out of round.
    lineHeight: layout.icon.xs,
    color: c.onError,
    textAlign: "center",
  },
});

export default createStyles;
