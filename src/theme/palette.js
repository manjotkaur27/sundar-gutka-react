// TIER 1 — primitives. The only file in the app allowed to contain a raw hex.
//
// These name a colour, not a job. Never consume a step directly in a component;
// take a semantic role from `semanticColors.js` instead, so a value can differ
// between themes (and between future user-selectable themes) without the call
// site knowing.
//
// Ramps are generated from a single hue at even lightness steps rather than
// picked by eye, so the steps stay perceptually consistent. Every step carrying
// a contrast guarantee is marked, and `contrast.test.js` fails the build if one
// is edited into non-compliance.

// ── Neutrals — the workhorse ────────────────────────────────────────────────
// Hue 220 at 8–20% saturation: enough cool cast to avoid the dead flat-grey
// look, far too little to read as blue. These carry ~90% of every screen (the
// "60" and the "30" of 60/30/10), in both themes.
//
// 950 is the dark background, deliberately NOT #000000 — pure black against
// near-white text hits 21:1 and causes halation (text appears to shimmer/bleed)
// for many readers, especially on OLED. 17.6:1 is still far above AA.
export const neutral = {
  0: "#ffffff",
  50: "#f9fafb", // dark-mode body text
  100: "#f3f4f6", // light-mode alt ground
  200: "#e5e7eb", // light-mode selected row / divider
  300: "#ced2d9", // dark-mode secondary text
  400: "#a2a8b3", // light-mode disabled text
  500: "#7a8190", // dark-mode disabled text
  600: "#616875", // light-mode secondary text
  700: "#464a53",
  800: "#31343a", // light-mode body text; dark-mode selected row
  850: "#26282c", // dark-mode elevated surface (sheets, modals)
  900: "#1c1e21", // dark-mode surface (cards)
  950: "#131416", // dark-mode background
  1000: "#000000", // scrims only, never a surface
};

// ── Brand navy — the company colour ─────────────────────────────────────────
// Step 800 is the exact existing brand value. Used for brand furniture in light
// mode (app bar, bottom navigation, primary buttons) and as the seed for the
// blue theme shipping later. It is NOT a dark-mode surface: navy grounds were
// dropped in favour of neutrals.
export const navy = {
  50: "#eff3fb",
  100: "#dfe8f6",
  200: "#c2d1eb",
  300: "#97b0d8",
  400: "#6b8ec7",
  500: "#3c6ab4",
  600: "#27539b",
  700: "#174082",
  800: "#113979", // brand base — exact, do not regenerate
  900: "#0b2650",
  950: "#071731",
};

// ── Accent blue — the "10" ──────────────────────────────────────────────────
// Links, active states, focus rings, selected controls. A brighter, cooler hue
// (212) than the brand navy so "tappable" reads differently from "brand
// furniture". The dark steps are ~12% less saturated than a naive lightening
// would give: fully saturated blue on a dark ground reads as neon and vibrates
// against the background.
export const accent = {
  200: "#8dbaec", // dark-mode brand/emphasis text
  300: "#67a2e4", // dark-mode link and accent
  400: "#509bf1",
  500: "#237ee7",
  600: "#1065c6", // light-mode accent / focus ring (≥3:1)
  700: "#0d4f9c", // light-mode link text (≥4.5:1)
};

// ── Status ─────────────────────────────────────────────────────────────────
// Light steps are pinned to the darkest ground they must survive (a selected
// row, neutral 200) rather than to white, so a status label stays legible
// wherever it lands.
export const red = {
  300: "#f07d75", // dark-mode error text
  500: "#d03025",
  600: "#af261d", // light-mode error text (≥4.5:1 on neutral 200)
  700: "#98231b",
};

export const green = {
  300: "#6ecf96", // dark-mode success text
  500: "#2c9658",
  600: "#1e7643", // light-mode success text (≥4.5:1 on neutral 200)
  700: "#1a6639",
};

// Gold is a fixed brand accent. The light-mode *text* step is much darker than
// the decorative one, because saturated yellow cannot clear 4.5:1 on a light
// ground at its natural lightness — the bright step is for fills and icons only.
export const gold = {
  200: "#fae7c6",
  400: "#f3b13f", // dark-mode gold text; fills in both themes
  500: "#ec9c13",
  700: "#8a5f14", // light-mode gold text (≥4.5:1 on neutral 200)
};

// ── Third-party brand marks ────────────────────────────────────────────────
// NOT theme values. Never swap these per theme or adjust them for contrast: a
// logotype is exempt from WCAG 1.4.11, and altering it misrepresents the brand.
// They live here only so they are identifiable as deliberate literals rather
// than stray hexes.
export const brandMarks = {
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  /** Instagram's mark is a gradient; stops in order. */
  instagram: ["#FEDA75", "#FA7E1E", "#D62976", "#962FBF"],
  substack: "#FF6719",
  tiktokCyan: "#25F4EE",
  tiktokMagenta: "#FE2C55",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  slack: { rose: "#E01E5A", sky: "#36C5F0", green: "#2EB67D", gold: "#ECB22E" },
  /**
   * The letterforms cut out of a solid mark (the "f", the "in", YouTube's
   * play triangle). Part of the logotype, so they stay pure white/black in
   * both themes rather than following the surface.
   */
  cutoutLight: "#FFFFFF",
  cutoutDark: "#000000",
};

export default { neutral, navy, accent, red, green, gold, brandMarks };
