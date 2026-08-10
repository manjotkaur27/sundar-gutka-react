import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useBaniTitle from "@common/hooks/useBaniTitle";
import useTokens from "@common/hooks/useTokens";
import { makeBaniItem } from "@common/pothi/model";
import { actions, STRINGS, trackPothiEvent } from "@common";
import {
  Button,
  GurmukhiKeyboard,
  GurmukhiKeyboardToggle,
  GurmukhiTextField,
  Sheet,
} from "../../common/components/ui";
import useRequireOnline from "../hooks/useRequireOnline";
import BaniPickRow from "./BaniPickRow";

// Fill a pothi that already exists.
//
// Every row toggles immediately rather than staging a draft and applying on
// Done. The list can be long, `Done` is really just "close", and a staged draft
// would silently lose ticks if the sheet were dismissed by the scrim.
//
// The Punjabi keyboard is pinned BELOW the list, at the bottom of the sheet.
// Anywhere else and the list — or the OS keyboard the search field would
// otherwise raise — covers the very field being typed into.
const AddBanisSheet = ({ visible, onClose, pothiId = null, baniListData }) => {
  const { space, layout } = useTokens();
  const { height } = useWindowDimensions();
  const dispatch = useDispatch();
  const requireOnline = useRequireOnline();
  const { titleFor, titleFontFamily } = useBaniTitle();
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

  // A share of the LIVE window, not a fixed slab. See layout.sheet for why.
  const listMaxHeight = Math.max(
    layout.sheet.listMinHeight,
    height *
      (gurmukhi ? layout.sheet.listMaxHeightRatioWithKeyboard : layout.sheet.listMaxHeightRatio)
  );

  // Leaf banis only. A bundled folder is a container, not something a pothi can
  // hold — its children are offered individually instead.
  const options = useMemo(() => {
    const leaves = [];
    (baniListData ?? []).forEach((bani) => {
      if (Array.isArray(bani.folder)) return;
      if (bani.id != null) leaves.push(bani);
    });
    const needle = query.trim().toLowerCase();
    if (!needle) return leaves;
    return leaves.filter((bani) =>
      [bani.gurmukhiUni, bani.gurmukhi, bani.translit]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle))
    );
  }, [baniListData, query]);

  const chosen = useMemo(() => new Set((pothi?.items ?? []).map((i) => i.baaniId)), [pothi]);

  const toggle = (bani) => {
    if (!requireOnline()) return;
    if (chosen.has(bani.id)) {
      trackPothiEvent("bani_removed", { bani_id: bani.id });
      dispatch(actions.removeBaniFromPothi(pothi.id, bani.id));
      return;
    }
    trackPothiEvent("bani_added", { bani_id: bani.id, size: chosen.size + 1 });
    dispatch(
      actions.addBaniToPothi(pothi.id, makeBaniItem({ baaniId: bani.id, title: titleFor(bani) }))
    );
  };

  if (!pothi) return null;

  return (
    // Settings-scoped, like the other pothi sheets — see CreatePothiSheet.
    <ScreenRolesProvider screen="settings">
      <Sheet
        visible={visible}
        onClose={onClose}
        title={STRINGS.POTHI_ADD_BANIS}
        scrollable={false}
        // Pinned, so the keys stay on screen no matter how long the list is.
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
        {/* `space.lg`, the same column rhythm CreatePothiSheet uses — the two
            sheets sit one after the other in the same flow and were spacing
            their fields differently. `paddingTop` because the sheet title only
            clears itself by `space.sm`, which left the first control almost
            touching the heading. */}
        <View style={{ gap: space.lg, paddingTop: space.sm }}>
          {/* Above the field it serves, not inside it — one switch, one
              keyboard. See GurmukhiKeyboardToggle. */}
          <GurmukhiKeyboardToggle
            label={STRINGS.POTHI_KEYBOARD_TOGGLE}
            active={gurmukhi}
            onToggle={() => setGurmukhi((on) => !on)}
          />

          <GurmukhiTextField
            value={query}
            onChange={setQuery}
            placeholder={STRINGS.POTHI_SEARCH_BANIS}
            accessibilityLabel={STRINGS.POTHI_SEARCH_BANIS}
            returnKeyType="search"
            gurmukhiOpen={gurmukhi}
            receivingKeys={gurmukhi}
          />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            // Shorter while the keyboard is up, so the list gives way to it
            // rather than the two together overflowing the sheet.
            style={{ maxHeight: listMaxHeight }}
            // Breathing room at both ends, so the first and last rows are not
            // flush against the search field and the Done button.
            contentContainerStyle={{ paddingVertical: space.md_12 }}
          >
            {options.map((bani) => (
              <BaniPickRow
                key={bani.id}
                title={titleFor(bani)}
                checked={chosen.has(bani.id)}
                fontFamily={titleFontFamily}
                onPress={() => toggle(bani)}
              />
            ))}
          </ScrollView>

          {/* `fullWidth`: Button is content-sized and left-aligned by default,
              so without it the sole action of the sheet sat hard against the
              left corner instead of spanning the width like a primary action. */}
          <Button title={STRINGS.POTHI_DONE} onPress={onClose} fullWidth />
        </View>
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
