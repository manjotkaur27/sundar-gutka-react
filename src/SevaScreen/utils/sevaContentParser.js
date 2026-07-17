import { logError } from "@common";

/**
 * Registry of known native slots the Seva backend content can position via a
 * `<!--SLOT:name-->` marker. Both are ALWAYS rendered by native app code —
 * donate_widget is the live payment flow, tax_note is the country-conditional
 * legal text — never as raw HTML text from the backend.
 */
export const SEVA_SLOT_TYPES = ["donate_widget", "tax_note"];

/**
 * Splits a raw Seva `content` HTML string into an ordered sequence of HTML
 * fragments and named native slots, so the backend can freely reposition,
 * omit, or (if a widget supports it) repeat a native slot anywhere on the
 * page without an app release.
 *
 * @param {string|null|undefined} rawHtml
 * @returns {Array<{type: 'html', value: string} | {type: 'slot', name: string}>}
 *   Empty array when rawHtml is empty/missing — callers treat [] as the
 *   signal to use the native STRINGS-driven fallback rendering.
 */
export const parseSevaContent = (rawHtml) => {
  if (!rawHtml || typeof rawHtml !== "string" || !rawHtml.trim()) {
    return [];
  }

  const markerRe = /<!--\s*SLOT:(\w+)\s*-->/g;
  const segments = [];
  let lastIndex = 0;
  let match = markerRe.exec(rawHtml);

  while (match !== null) {
    const [fullMatch, slotName] = match;
    const htmlBefore = rawHtml.slice(lastIndex, match.index);
    if (htmlBefore.trim()) {
      segments.push({ type: "html", value: htmlBefore });
    }
    if (SEVA_SLOT_TYPES.includes(slotName)) {
      segments.push({ type: "slot", name: slotName });
    } else {
      logError(new Error(`Unknown Seva content slot: ${slotName}`));
    }
    lastIndex = match.index + fullMatch.length;
    match = markerRe.exec(rawHtml);
  }

  const remaining = rawHtml.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: "html", value: remaining });
  }

  return segments;
};
