import { AKHAR, ALL_KEYS, KEY_ROWS, MATRAS, NUKTA_LETTERS, packageCharacters } from "./gurmukhiKeys";

// The keyboard shows the whole alphabet. The InScript layout the package ships
// is a typist's layout that hides half the letters behind shift, so only about
// twenty were on screen — this is the arrangement that fixes that, and these
// check the inventory is complete and not invented.

describe("the alphabet is complete", () => {
  it("has all 35 akhar, five to a varga", () => {
    expect(AKHAR).toHaveLength(7);
    AKHAR.forEach((row) => expect(row).toHaveLength(5));
    expect(AKHAR.flat()).toHaveLength(35);
  });

  it("starts with Ura, Aira, Iri and ends the vargas at Rara", () => {
    expect(AKHAR[0].slice(0, 3)).toEqual(["ੳ", "ਅ", "ੲ"]);
    expect(AKHAR[6][4]).toBe("ੜ");
  });

  it("adds the six nukta letters, in the package's own encoding", () => {
    expect(NUKTA_LETTERS).toHaveLength(6);
    // Sassa- and Lalla-pair are precomposed; the rest are base + nukta. Mixing
    // the two spellings would store the same name two different ways.
    expect(NUKTA_LETTERS[0]).toBe("\u0A36");
    expect(NUKTA_LETTERS[5]).toBe("\u0A33");
    expect(NUKTA_LETTERS[1]).toBe("\u0A16\u0A3C");
  });

  it("offers all nine matras", () => {
    expect(MATRAS).toHaveLength(9);
  });

  it("shows far more than the twenty-odd InScript put on its first layer", () => {
    expect(ALL_KEYS.length).toBeGreaterThan(60);
  });

  it("repeats no character", () => {
    expect(new Set(ALL_KEYS).size).toBe(ALL_KEYS.length);
  });
});

describe("the inventory comes from the package, not from memory", () => {
  it("every key exists somewhere in simple-keyboard-layouts' Punjabi layout", () => {
    // The arrangement is ours; the CHARACTERS are the package's. Anything here
    // that the package does not contain would be a character invented from
    // recall, which is how a wrong glyph would reach a user.
    // Per CODEPOINT: a key can be two (base + nukta), and both halves have to
    // be characters the package actually contains.
    const known = packageCharacters();
    // Ura is the ONE justified addition. It is one of the 35 akhar and the
    // package's InScript layout simply omits it — it carries Aira (U+0A72) and
    // the independent vowel Oora-with-aunkar (U+0A09) but not the bare carrier
    // U+0A73. Leaving it out would mean an alphabet missing its first letter.
    const EXCEPTIONS = new Set(["ੳ"]);
    const invented = ALL_KEYS.filter((key) =>
      [...key].some((ch) => !known.has(ch) && !EXCEPTIONS.has(ch))
    );
    expect(invented).toEqual([]);
  });
});

describe("rows fit a phone", () => {
  it("is at most ten keys wide", () => {
    // Twelve was the InScript row width, and at that count the keys came out
    // ~25pt wide and unhittable.
    KEY_ROWS.forEach((row) => expect(row.length).toBeLessThanOrEqual(10));
  });

  it("loses nothing in the split into rows", () => {
    expect(KEY_ROWS.flat()).toEqual(ALL_KEYS);
  });
});
