import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import { STRINGS } from "@common";
import { GurmukhiKeyboard, Sheet } from "../../common/components/ui";
import useSetPothiBanis from "../hooks/useSetPothiBanis";
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
  const setBanis = useSetPothiBanis();
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
        {/* The step hands back the whole next selection, which is what a draft
            wants; `setBanis` turns it into the adds and removes an existing
            pothi is edited with. */}
        <PickBanisStep
          picked={pothi.items}
          onChange={(next) => setBanis(pothi, next)}
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
