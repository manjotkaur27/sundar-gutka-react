import fs from "fs";
import path from "path";

// Choosing banis happens in two places — the second step of creating a pothi,
// and Add Banis on one that already exists — and for a while they were two
// implementations of the same screen. Every defect in the copy (the list too
// short, no Cancel/Done, the list running under them, no count) had to be found
// and fixed twice, and each was only ever fixed once.
//
// These are source-level guards rather than render tests on purpose: the thing
// being protected is that there is ONE implementation, which is a fact about the
// files, not about any single render.

const HERE = __dirname;

const read = (name) => fs.readFileSync(path.join(HERE, name), "utf8");

describe("the bani picker has one implementation", () => {
  it("is rendered by both sheets that offer it", () => {
    expect(read("CreatePothiSheet.jsx")).toContain("<PickBanisStep");
    expect(read("AddBanisSheet.jsx")).toContain("<PickBanisStep");
  });

  it("left no second copy behind", () => {
    // PickBanisField was the collapsible version of this, and its collapsed
    // state became unreachable once the picker was always a whole step.
    expect(fs.existsSync(path.join(HERE, "PickBanisField.jsx"))).toBe(false);
  });

  it("keeps the list, the search field and the actions out of its callers", () => {
    // The parts that drifted. A caller that grows its own is building the
    // second copy again, whatever it is called this time.
    ["CreatePothiSheet.jsx", "AddBanisSheet.jsx"].forEach((file) => {
      const text = read(file);
      expect(text).not.toContain("BaniPickRow");
      expect(text).not.toContain("GurmukhiTextField");
      expect(text).not.toContain("maxHeight");
    });
  });

  it("does not size the pick list at all, and does not scroll it either", () => {
    // It used to cap the list at a share of the window. Two things were wrong
    // with that and the in-app keyboard made both unbearable: the cap was
    // measured against the FULL window, so with the keys up it went on claiming
    // height that no longer existed and pushed the search field and both
    // buttons off a sheet with no way to scroll down to them; and a scroller
    // nested inside the sheet's own meant the two fought for every drag.
    //
    // The list is plain rows now and the host Sheet is the single scroller, so
    // the column is simply as tall as it is and everything stays reachable at
    // any text size. A `maxHeight` or a second ScrollView here would be the
    // old design coming back.
    const text = read("PickBanisStep.jsx");
    expect(text).not.toMatch(/maxHeight:/);
    expect(text).not.toMatch(/<ScrollView/);
  });

  it("is scrolled by both of its sheets, so nothing in it can be stranded", () => {
    // `scrollable={false}` on either host is what stranded the actions.
    ["CreatePothiSheet.jsx", "AddBanisSheet.jsx"].forEach((file) => {
      expect(read(file)).not.toMatch(/scrollable=\{(false|step === 1)\}/);
    });
  });
});
