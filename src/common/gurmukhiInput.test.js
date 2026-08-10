import { appendGurmukhi, canAppend, sanitizeGurmukhi } from "./gurmukhiInput";

// The rules that stop the field accepting things nobody can read. The bug these
// exist for produced "ਅਨੀਾਾਿਿੀੁੁ" — vowel signs stacked on vowel signs with no
// letter under them.

describe("matras need something to attach to", () => {
  it("rejects a matra at the very start", () => {
    expect(canAppend("", "ਾ")).toBe(false);
    expect(canAppend("", "ਿ")).toBe(false);
  });

  it("accepts a matra after a consonant", () => {
    expect(canAppend("ਕ", "ਾ")).toBe(true);
  });

  it("accepts a matra after an independent vowel letter", () => {
    expect(canAppend("ਅ", "ਾ")).toBe(true);
  });

  it("refuses to stack two matras — the exact defect", () => {
    expect(canAppend("ਕਾ", "ਿ")).toBe(false);
    expect(canAppend("ਨੀ", "ਾ")).toBe(false);
  });

  it("accepts a matra on a nukta-modified consonant", () => {
    expect(canAppend("ਜ਼", "ਾ")).toBe(true);
  });
});

describe("virama, nukta, nasal marks", () => {
  it("allows a virama only after a consonant", () => {
    expect(canAppend("ਕ", "੍")).toBe(true);
    expect(canAppend("", "੍")).toBe(false);
    expect(canAppend("ਕਾ", "੍")).toBe(false);
  });

  it("allows a nukta only on a consonant", () => {
    expect(canAppend("ਜ", "਼")).toBe(true);
    expect(canAppend("ਅ", "਼")).toBe(false);
  });

  it("allows tippi/bindi/addhak on a letter or a completed matra", () => {
    expect(canAppend("ਕ", "ੰ")).toBe(true);
    expect(canAppend("ਕਾ", "ਂ")).toBe(true);
    expect(canAppend("", "ੰ")).toBe(false);
  });

  it("does not double a nasal mark", () => {
    expect(canAppend("ਕੰ", "ੰ")).toBe(false);
  });
});

describe("everything else passes", () => {
  it("allows letters, spaces, digits and Latin", () => {
    ["ਕ", " ", "1", "A", "।"].forEach((ch) => expect(canAppend("ਮੇਰੀ", ch)).toBe(true));
  });
});

describe("appendGurmukhi", () => {
  it("returns the SAME string when the key is rejected", () => {
    const text = "ਕਾ";
    expect(appendGurmukhi(text, "ਿ")).toBe(text);
  });

  it("appends when the key is allowed", () => {
    expect(appendGurmukhi("ਕ", "ਾ")).toBe("ਕਾ");
  });
});

describe("sanitizeGurmukhi", () => {
  it("cleans the monstrosity the old keyboard allowed", () => {
    // Every stacked matra goes; the readable letters survive.
    expect(sanitizeGurmukhi("ਅਨੀਾਾਿਿੀੁੁੁੁੋੋੈੈ")).toBe("ਅਨੀ");
  });

  it("leaves well-formed Punjabi untouched", () => {
    ["ਮੇਰੀ ਪੋਥੀ", "ਸਵੇਰ ਦਾ ਨਿਤਨੇਮ", "ਸੁਖਮਨੀ ਸਾਹਿਬ"].forEach((s) =>
      expect(sanitizeGurmukhi(s)).toBe(s)
    );
  });

  it("leaves Latin and mixed text untouched", () => {
    expect(sanitizeGurmukhi("Morning Nitnem")).toBe("Morning Nitnem");
  });
});
