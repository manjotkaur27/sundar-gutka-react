import defineReaderTheme from "../schema";

// Sanjh — dusk. A warm near-black ground under soft amber, for reading at night
// without the cold cast of a blue-tinted dark theme.
//
// This theme is ALSO the reference for how little a new one costs: five colours
// and four lines of identity, and everything else — the four text roles, the
// sync-scroll wash, the scrollbar, the header, the progress bar, the whole audio
// player and its toggles — is derived from those five. See derive.js.
//
// Everything derived is still overridable. A theme that wants to bundle more
// than colour can add any of these, and nothing else in the app changes:
//
//   typography: { preferredFontFace: "AnmolLipiSG" }  suggest a Bani font
//   typography: { fontScale: 1.08, lineHeightRatio: 1.8 }  size and leading
//   typography: { larivaarAssistOpacity: 0.72 }       dim alternate words less
//   defaults:   { isTransliteration: true }           suggest display settings
//   background: { image, imageOpacity, imageRepeat }  a texture
//   vishraam:   { main, yamki }                       reading-mark colours
//
// FRAMES. One value draws a complete ruled page — colour, inset and radius all
// come from the palette:
//
//   border: { width: 1 }
//
// `gap` turns it into a double-ruled manuscript frame, and each of the four
// parts takes its own colour and weight if you want them to differ:
//
//   border: {
//     width: 1,               inner rule — the one the Bani sits inside
//     outerWidth: 3,          the second rule can be heavier
//     gap: 6,                 how far apart the two rules sit
//     inset: 14,              how far the frame is held off the screen edge
//     color: "#8C6A3F",       inner rule
//     outerColor: "#5A4326",  outer rule
//     gapColor: "#EFE2C4",    the band between them
//     marginColor: "#E4D5B2", outside the frame, to the screen edge
//   }
//
// The Bani is confined inside the INNERMOST rule whatever those are set to —
// the text gutter is computed from the frame's real thickness, and every band
// is painted opaque, so a line scrolling past can never appear in or beyond the
// frame. See resolveBorder/borderCss in ReaderScreen/utils/gutkahtml.js.
//
// `preferredFontFace` and `defaults` are SUGGESTIONS: they are applied once, the
// first time the theme is chosen, and never again — so a theme can express an
// intended setup without ever overriding a choice the user made by hand. See
// applyTheme() in common/actions.
export default defineReaderTheme({
  id: "sanjh",
  nameKey: "reader_theme_sanjh",
  base: "dark",
  order: 7,

  palette: {
    ground: "#1A1414",
    ink: "#F5E9DC",
    accent: "#E8A87C",
    muted: "#C0A392",
    rule: "#3A2E2A",
  },

  // The fixed orange mark sits almost on top of this theme's amber accent, so
  // it stops reading as a separate signal. Both marks move: warmer and cooler
  // than the page rather than the same temperature as it.
  vishraam: { main: "#FF9A6B", yamki: "#7FD4B8" },
});
