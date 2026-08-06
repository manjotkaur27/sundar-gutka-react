import fs from "fs";
import path from "path";

// The Settings chooser is the one sheet on the old, flush presentation: no drag
// handle, a centred title over a rule, rows edge to edge. Every other sheet in
// the app — the Dashboard's, the audio settings, the time picker — stays on the
// floating default.
//
// Both the variant and the colours behind it are declared, not inlined, so a
// future theme changes one registry rather than a screen. These tests hold that
// line: a second caller of either would silently spread the Settings look.

const SRC = path.join(__dirname, "..", "..", "..");

const sourceFiles = () => {
  const out = [];
  const walk = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
        return;
      }
      if (!/\.(js|jsx)$/.test(entry.name) || /\.test\./.test(entry.name)) return;
      out.push({
        rel: path.relative(SRC, full).split(path.sep).join("/"),
        text: fs.readFileSync(full, "utf8"),
      });
    });
  };
  walk(SRC);
  return out;
};

describe("the flush sheet presentation is scoped to Settings", () => {
  it("is passed by the Settings choosers and nothing else", () => {
    const callers = sourceFiles()
      .filter(({ text }) => /variant="flush"/.test(text))
      .map(({ rel }) => rel)
      .sort();
    // Two, and only two: the single-choice chooser every settings row opens,
    // and Translations, which is multi-select so it cannot use SelectSheet but
    // must still look identical to it.
    expect(callers).toEqual([
      "Settings/components/comon/SelectSheet.jsx",
      "Settings/components/translation.jsx",
    ]);
  });

  it("is the only subtree scoped to a screen palette", () => {
    // The provider is how a sheet gets its own colours; a second user of it
    // would carry the Settings sheet's colours somewhere else.
    const users = sourceFiles()
      .filter(({ rel }) => rel !== "theme/ScreenRolesProvider.jsx")
      .filter(({ text }) => /<ScreenRolesProvider/.test(text))
      .map(({ rel }) => rel);
    expect(users).toEqual(["common/components/ui/Sheet.jsx"]);
  });

  it("defaults to the floating presentation", () => {
    const sheet = fs.readFileSync(path.join(__dirname, "Sheet.jsx"), "utf8");
    expect(sheet).toContain('variant = "floating"');
    // The handle, the body gap and the panel padding all key off one flag, so
    // there is no way to end up half-flush.
    expect(sheet).toContain('const flush = variant === "flush"');
  });
});
