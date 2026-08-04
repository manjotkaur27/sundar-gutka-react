// Small colour helpers, so no call site has to hand-write a colour that a token
// already defines.
//
// These exist because of one specific failure: the Dashboard's activity heat
// map carried its own `isDark ? "85,141,231" : "17,57,121"` rgb pair, hand-typed
// beside the blue every other element on the same screen took from the theme.
// The two then drifted, and the heat cells ended up a visibly different blue to
// the ring around today. Deriving the ramp from the token makes that impossible.

/**
 * `"#113979"` -> `"17,57,121"`, ready to drop into an `rgba(...)` string.
 * Accepts 3- or 6-digit hex, with or without the leading `#`.
 *
 * Returns null for anything it cannot parse, so a caller can fall back rather
 * than render `rgba(NaN,NaN,NaN,0.5)` — which paints nothing and is invisible
 * to look at but very visible as a missing element.
 */
export const hexToRgb = (hex) => {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  /* eslint-disable no-bitwise */
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  /* eslint-enable no-bitwise */
};

/**
 * A token colour at partial strength, as an `rgba()` string.
 *
 * Prefer a real semantic role where one exists — this is for genuine ramps
 * (a heat map, a fading gradient) where a discrete token per step would be
 * inventing a dozen roles nobody names.
 */
export const withAlpha = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  return rgb ? `rgba(${rgb},${alpha})` : "transparent";
};

export default { hexToRgb, withAlpha };
