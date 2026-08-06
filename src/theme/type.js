// TIER 1 — typography, expressed as roles rather than t-shirt sizes.
//
// A call site asks for `type.body` and gets a size, a line height and a weight
// that were designed together. The old `sizes` scale gave a number only, so
// every call site invented its own line height — which is why line spacing is
// inconsistent across the app today, and why several places compute
// `lineHeight: sizes.sm + spacing.md`, an arithmetic coincidence rather than a
// decision.
//
// Line heights are absolute, not multipliers: React Native's `lineHeight` takes
// points, and a multiplier left at the call site is a multiplier that gets
// forgotten. Every one lands on the 4pt grid.
//
// These are UNSCALED base values. The OS text-size setting is applied by the
// `Text` primitive at render time via `allowFontScaling` — do not pre-multiply
// here, and do not bake a user font-size preference into these numbers.
//
// Gurbani is NOT covered by this scale. Its sizing is driven by the user's own
// font-size setting and is a separate system with its own correctness rules;
// see the Reader.

import { constant } from "@common";

// Font families. On Android a numeric `fontWeight` cannot synthesise a real
// bold from a Regular file without looking wrong, so weight is expressed by
// picking the actual designed face. `weight` below stays for the few places RN
// handles it natively (system font, iOS).
const fonts = {
  regular: constant.BALOO_PAAJI,
  semiBold: constant.BALOO_PAAJI_SEMI_BOLD,
  gurbaniPrimary: constant.GURBANI_AKHAR_TRUE,
  gurbaniThick: constant.GURBANI_AKHAR_THICK_TRUE,
  gurbaniHeavy: constant.GURBANI_AKHAR_HEAVY_TRUE,
};

const role = (fontSize, lineHeight, family = fonts.regular) => ({
  fontSize,
  lineHeight,
  fontFamily: family,
});

const type = {
  fonts,

  /**
   * No metrics at all — size, line height and face come entirely from the
   * caller's own style.
   *
   * For text that is positioned by a style rather than by a role. It exists so
   * `CustomText` can render through the same primitive as everything else
   * without a role silently imposing a size the call site never asked for.
   * New code should name a real role below instead.
   */
  inherit: {},

  /** Screen-dominating numerals and hero figures. Sparing use. */
  display: role(32, 40, fonts.semiBold),
  /** Screen title inside content (not the app bar). */
  title: role(24, 32, fonts.semiBold),
  /** Section heading within a screen. */
  heading: role(20, 28, fonts.semiBold),
  /** Card title, list group header. */
  subheading: role(18, 24, fonts.semiBold),
  /** Default reading size for UI copy. */
  body: role(16, 24),
  /** Secondary copy, list row subtitles. */
  bodySmall: role(14, 20),
  /** Buttons and control labels. */
  label: role(14, 20, fonts.semiBold),
  /** Timestamps, footnotes, metadata. Never for anything essential. */
  caption: role(12, 16),

  /**
   * A bani or folder title rendered in Gurmukhi, as screen chrome — the folder
   * header, the bani-list header. This is a UI label that happens to be in
   * Gurmukhi, NOT scripture body text: the latter is sized by the user's own
   * font-size setting inside the Reader and is not part of this scale.
   */
  baniTitle: role(28, 40, fonts.gurbaniPrimary),

  /** Native weights, for the rare place RN resolves a face itself. */
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

export default type;
