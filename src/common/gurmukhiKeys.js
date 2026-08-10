import punjabiLayout from "simple-keyboard-layouts/build/commonjs/layouts/punjabi";

// The full Gurmukhi character set, laid out the way it is taught.
//
// The InScript layout from `simple-keyboard-layouts` is the right INVENTORY but
// the wrong ARRANGEMENT for this: it is a typist's layout that splits the
// alphabet across two layers, so only about half the letters are on screen and
// the rest hide behind shift. Naming a pothi is not touch-typing — the letters
// need to be visible and findable.
//
// So the characters come from the package (see `gurmukhiKeys.test.js`, which
// fails if any key here is absent from its layers — the inventory is verified,
// not remembered) and are arranged in varnamala order, the order every Punjabi
// speaker learns.

/** The 35 akhar, in the traditional five-per-row varga order. */
export const AKHAR = [
  ["ੳ", "ਅ", "ੲ", "ਸ", "ਹ"],
  ["ਕ", "ਖ", "ਗ", "ਘ", "ਙ"],
  ["ਚ", "ਛ", "ਜ", "ਝ", "ਞ"],
  ["ਟ", "ਠ", "ਡ", "ਢ", "ਣ"],
  ["ਤ", "ਥ", "ਦ", "ਧ", "ਨ"],
  ["ਪ", "ਫ", "ਬ", "ਭ", "ਮ"],
  ["ਯ", "ਰ", "ਲ", "ਵ", "ੜ"],
];

// The six nukta letters.
//
// Gurmukhi encodes these two ways and the package is not uniform about it:
// Sassa-pair and Lalla-pair have PRECOMPOSED codepoints (U+0A36, U+0A33) and it
// uses those, while the other four are written base + nukta (U+0A3C). Following
// its convention exactly matters — the name is stored verbatim and compared by
// the API, so two spellings of the same letter would not match.
export const NUKTA_LETTERS = [
  "\u0A36", // ਸ਼  precomposed
  "\u0A16\u0A3C", // ਖ਼  khakha + nukta
  "\u0A17\u0A3C", // ਗ਼  gagga + nukta
  "\u0A1C\u0A3C", // ਜ਼  jajja + nukta
  "\u0A2B\u0A3C", // ਫ਼  phapha + nukta
  "\u0A33", // ਲ਼  precomposed
];

/** Independent vowels — needed to start a word with a vowel sound. */
export const VOWELS = ["ਆ", "ਇ", "ਈ", "ਉ", "ਊ", "ਏ", "ਐ", "ਓ", "ਔ"];

/** Dependent vowel signs, in the order they are recited (kanna, sihari, …). */
export const MATRAS = ["ਾ", "ਿ", "ੀ", "ੁ", "ੂ", "ੇ", "ੈ", "ੋ", "ੌ"];

/** Nasal marks, addhak, halant and the danda. */
export const MARKS = ["ੰ", "ਂ", "ੱ", "੍", "਼", "।"];

/**
 * Rows of ten, which is what fits a phone at a real tap size. Built from the
 * groups above so the grouping is still visible: letters, then vowels, then
 * matras and marks.
 */
export const KEY_ROWS = (() => {
  const flat = [...AKHAR.flat(), ...NUKTA_LETTERS, ...VOWELS, ...MATRAS, ...MARKS];
  const rows = [];
  for (let i = 0; i < flat.length; i += 10) rows.push(flat.slice(i, i + 10));
  return rows;
})();

/** Every key the keyboard offers — used by the test to check the inventory. */
export const ALL_KEYS = KEY_ROWS.flat();

/** Every single character the package's layout contains, across both layers. */
export const packageCharacters = () => {
  const layers = punjabiLayout.default?.layout ?? punjabiLayout.layout ?? {};
  const chars = new Set();
  Object.values(layers).forEach((rows) => {
    rows.forEach((row) => {
      row.split(" ").forEach((key) => {
        // Skip the control tokens and the multi-character conjunct keys.
        if (!key || key.startsWith("{")) return;
        [...key].forEach((ch) => chars.add(ch));
      });
    });
  });
  return chars;
};

export default KEY_ROWS;
