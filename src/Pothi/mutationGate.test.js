import fs from "fs";
import path from "path";

// A pothi mutation is never dispatched without asking the gate first.
//
// A pothi is cached for READING offline and signed out; changing one needs an
// account to sync to and a connection to reach it (see useRequireOnline). Each
// screen that writes has to remember to ask, and FolderScreen — the screen where
// a pothi is actually edited — did not. Its "Delete Banis" reached
// `removeBaniFromPothi` with no check at all, so a signed-out user could empty
// their Morning Nitnem and watch it come back on the next sync.
//
// A unit test per screen would not have found that: the defect was a call that
// was never written, in a screen that had no test. This reads the source
// instead, which is the same thing sheetVariant.test.js does for the screen
// palettes and for the same reason — the property being protected is "nobody
// anywhere does this", and only the whole tree can answer that.
//
// It is a coarse check by design. It proves the gate is REFERENCED in a file
// that writes, not that it guards every branch; that much is worth having,
// because forgetting it entirely is the failure that actually happened.

const SRC = path.join(__dirname, "..");

/** The seven transitions that change a pothi and therefore need syncing. */
const MUTATIONS = [
  "addBaniToPothi",
  "removeBaniFromPothi",
  "renamePothi",
  "deletePothi",
  "createPothi",
  "togglePothiPin",
  "setPothiOrder",
];

// `actions.x(` — the DISPATCH, not the action creator's own definition in
// common/actions, which is written as a bare export.
const DISPATCHES = new RegExp(`actions\\.(${MUTATIONS.join("|")})\\(`);
const ASKS_THE_GATE = /requireOnline\(\)/;

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

const writers = () => sourceFiles().filter(({ text }) => DISPATCHES.test(text));

describe("every pothi mutation is gated", () => {
  it("no file dispatches one without asking useRequireOnline", () => {
    const ungated = writers()
      .filter(({ text }) => !ASKS_THE_GATE.test(text))
      .map(({ rel }) => rel)
      .sort();
    expect(ungated).toEqual([]);
  });

  it("is dispatched only from the places that are meant to write", () => {
    // A registry, so a NEW write site has to be added here deliberately and
    // its gating looked at rather than being waved through by the check above.
    //
    // Two hooks and four components. `useSetPothiBanis` and `useDeletePothi`
    // exist precisely so the callers that share those jobs cannot word or gate
    // them differently; FolderScreen writes directly only for the multi-select
    // remove, which has no other caller.
    expect(
      writers()
        .map(({ rel }) => rel)
        .sort()
    ).toEqual([
      "FolderScreen/FolderScreen.jsx",
      "Pothi/PothiList.jsx",
      "Pothi/components/AddToPothiSheet.jsx",
      "Pothi/components/CreatePothiSheet.jsx",
      "Pothi/components/PothiActionsSheet.jsx",
      "Pothi/hooks/useDeletePothi.js",
      "Pothi/hooks/useSetPothiBanis.js",
    ]);
  });
});
