import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import { actions, STRINGS, trackPothiEvent } from "@common";
import { GurmukhiKeyboard, Sheet } from "../../common/components/ui";
import useRequireOnline from "../hooks/useRequireOnline";
import PickBanisStep from "./PickBanisStep";

// Fill a pothi that already exists.
//
// The step itself is `PickBanisStep`, the same component the second step of
// creating a pothi renders — not a copy of it. This file is only the two things
// that actually differ: where the selection lives, and what Done means.
//
// Every row applies immediately rather than staging a draft. The list can be
// long, `Done` is really just "close", and a staged draft would silently lose
// ticks if the sheet were dismissed by the scrim.
const AddBanisSheet = ({ visible, onClose, pothiId = null, baniListData }) => {
  const dispatch = useDispatch();
  const requireOnline = useRequireOnline();
  // Read LIVE from the store, by id. Holding the row object the list handed
  // over froze the ticks: every add produced a new pothi in the store while
  // this still pointed at the snapshot taken when the sheet opened.
  const pothi = useSelector((state) => (state.pothis?.folders ?? []).find((f) => f.id === pothiId));
  const [query, setQuery] = useState("");
  const [gurmukhi, setGurmukhi] = useState(false);

  // A reopened sheet starts from a clean search with the keyboard down.
  useEffect(() => {
    if (visible) {
      setQuery("");
      setGurmukhi(false);
    }
  }, [visible]);

  if (!pothi) return null;

  // The step hands back the whole next selection, which is what a draft wants.
  // A pothi that already exists is edited one item at a time, so the difference
  // is dispatched instead — an add or a remove, never a wholesale replacement
  // that would rewrite items the user did not touch.
  const apply = (next) => {
    if (!requireOnline()) return;
    const before = new Set(pothi.items.map((item) => item.baaniId));
    const after = new Set(next.map((item) => item.baaniId));
    next
      .filter((item) => !before.has(item.baaniId))
      .forEach((item) => {
        trackPothiEvent("bani_added", { bani_id: item.baaniId, size: after.size });
        dispatch(actions.addBaniToPothi(pothi.id, item));
      });
    pothi.items
      .filter((item) => !after.has(item.baaniId))
      .forEach((item) => {
        trackPothiEvent("bani_removed", { bani_id: item.baaniId });
        dispatch(actions.removeBaniFromPothi(pothi.id, item.baaniId));
      });
  };

  return (
    // Settings-scoped, like the other pothi sheets — see CreatePothiSheet.
    <ScreenRolesProvider screen="settings">
      <Sheet
        visible={visible}
        onClose={onClose}
        title={STRINGS.POTHI_ADD_BANIS}
        // The step's list scrolls inside its own capped box; scrolling the
        // sheet as well would let the search field and the actions slide away
        // while browsing, which is the one time they are needed.
        scrollable={false}
        // Pinned below the body, so the keys can never be pushed past the
        // bottom edge however long the list gets.
        footer={
          gurmukhi ? (
            <GurmukhiKeyboard
              value={query}
              onKey={(key) => setQuery(query + key)}
              onBackspace={() => setQuery(query.slice(0, -1))}
            />
          ) : null
        }
      >
        <PickBanisStep
          picked={pothi.items}
          onChange={apply}
          baniListData={baniListData}
          query={query}
          onQueryChange={setQuery}
          gurmukhiOpen={gurmukhi}
          onToggleGurmukhi={() => setGurmukhi((on) => !on)}
          onCancel={onClose}
          confirmTitle={STRINGS.POTHI_DONE}
          onConfirm={onClose}
        />
      </Sheet>
    </ScreenRolesProvider>
  );
};

AddBanisSheet.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** Id of the pothi being filled. Null closes the sheet. */
  pothiId: PropTypes.string,
  baniListData: PropTypes.arrayOf(PropTypes.shape()).isRequired,
};

export default AddBanisSheet;
