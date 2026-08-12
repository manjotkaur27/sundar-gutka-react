import fs from "fs";
import path from "path";

// Today's Nitnem IS the Morning Nitnem pothi.
//
// It used to be a second, unrelated list: the Dashboard kept its own
// `todaysNitnem.selectedBaniIds`, seeded [2, 6, 4, 9, 21, 1], while the Morning
// Nitnem pothi held [2, 4, 6, 9, 10]. Editing one never touched the other, so
// the same user had two different Nitnems depending on which screen they were
// looking at.
//
// Source-level guards rather than render tests, because what is being protected
// is that there is ONE list — a fact about the files, not about any one render.

const HERE = __dirname;
const SRC = path.join(HERE, "..", "..");

const read = (file) => fs.readFileSync(file, "utf8");
const here = (name) => read(path.join(HERE, name));

/** Every .js/.jsx under src, so a reintroduced writer cannot hide in a new file. */
const sourceFiles = (dir = SRC) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name) ? [full] : [];
  });

describe("Today's Nitnem is the Morning Nitnem pothi", () => {
  it("reads the pothi rather than a list of its own", () => {
    const card = here("TodaysNitnem.jsx");
    expect(card).toContain('defaultPothi(state.pothis, "morning")');
    expect(card).not.toContain("state.todaysNitnem).selectedBaniIds");
  });

  it("edits that pothi through the shared apply, not a second diff", () => {
    const modal = here("EditBanisModal.jsx");
    expect(modal).toContain("useSetPothiBanis");
    expect(modal).toContain('defaultPothi(state.pothis, "morning")');
  });

  it("left no way to write a separate nitnem bani set", () => {
    // The action, its type and the old dashboard-only default are all gone. A
    // reference anywhere is a second source of truth growing back.
    const offenders = sourceFiles().filter((file) =>
      /SET_NITNEM_BANIS|setNitnemBanis|DEFAULT_NITNEM_BANI_IDS/.test(read(file))
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the heading, which is the one thing that does not change", () => {
    expect(here("TodaysNitnem.jsx")).toContain("STRINGS.TODAYS_NITNEM");
  });
});

// A finished Nitnem left two controls on the card that answered a tap with
// nothing: Continue was `disabled` but kept its filled accent so it still read
// as live, and Mark Done stayed enabled while dispatching a no-op. The row
// collapses to one live action instead.
describe("the Nitnem card offers no dead controls", () => {
  // Source files are CRLF; normalise so the block splits below can key on
  // indentation without every marker needing a \r.
  const card = () => here("TodaysNitnem.jsx").replace(/\r\n/g, "\n");

  /** The `actionsFor` branch that runs once every bani is ticked. */
  const completedBranch = () =>
    card().split("if (!firstIncomplete) {")[1].split("\n    return (")[0];

  it("drops Mark Done and Continue once there is nothing left to do", () => {
    expect(completedBranch()).not.toContain("STRINGS.MARK_DONE");
    expect(completedBranch()).not.toContain("STRINGS.CONTINUE");
    // Both still exist — for the state that can actually use them.
    expect(card()).toContain("STRINGS.MARK_DONE");
    expect(card()).toContain("STRINGS.CONTINUE");
  });

  it("shows a completion badge in their place, and no press handler on it", () => {
    expect(completedBranch()).toContain("STRINGS.NITNEM_COMPLETE");
    // A status, not a control: nothing to tap, so nothing can look tappable.
    expect(completedBranch()).not.toContain("onPress");
    expect(completedBranch()).not.toContain("Pressable");
  });

  it("shows no action row at all when the pothi is empty", () => {
    expect(card()).toContain("if (selectedBaniIds.length === 0) return null;");
  });

  // The header already reads 5/5 with "All done today" beside it. A third
  // statement of the same fact where an action used to be reads as breakage.
  it("does not repeat the all-done message under the ring", () => {
    const [, actions] = card().split("const actionsFor = () => {");
    expect(actions).not.toContain("ALL_DONE_TODAY");
  });
});

// Turning transliteration off writes ONLY `isTransliteration`:
// `transliterationLanguage` keeps its last value and the cached bani list is
// untouched (see Settings/components/transliteration.jsx). So a row that
// renders `translit` without consulting the toggle keeps showing the language
// last chosen, and nothing re-runs to correct it — which is why switching
// languages looked right in this sheet while Off did nothing at all.
describe("the Edit Banis sheet follows the transliteration setting", () => {
  const modal = () => here("EditBanisModal.jsx");

  it("shows the roman line only while transliteration is on", () => {
    expect(modal()).toContain("isTransliteration && b.translit");
  });

  it("reads the toggle, not just the language", () => {
    expect(modal()).toContain("state.isTransliteration");
  });

  // `getBaniList` picks the transliteration by ENGLISH/HINDI/SHAHMUKHI/IPA and
  // falls through to English for anything else. `state.language` is the
  // INTERFACE language ("DEFAULT"), so passing it rendered English under every
  // name whatever the user had chosen.
  it("resolves transliterations by the transliteration language", () => {
    expect(modal()).toContain("getBaniList(transliterationLanguage)");
    // The selector itself, not a mention of it in a comment.
    expect(modal()).not.toMatch(/=>\s*state\.language\b/);
  });
});
