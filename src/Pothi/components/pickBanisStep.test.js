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

  it("is the only thing that sizes the pick list", () => {
    const callers = fs
      .readdirSync(HERE)
      .filter((name) => /\.jsx$/.test(name))
      .filter((name) => /pickStepListMaxHeightRatio/.test(read(name)));
    expect(callers).toEqual(["PickBanisStep.jsx"]);
  });
});
