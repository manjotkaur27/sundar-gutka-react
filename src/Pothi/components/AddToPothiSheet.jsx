import React, { useState } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import {
  emptyPothis,
  listPothis,
  makeBaniItem,
  pothisContaining,
  SOURCE,
} from "@common/pothi/model";
import { actions, showToast, STRINGS, trackPothiEvent } from "@common";
import { ListSeparator, Sheet, Text } from "../../common/components/ui";
import useRequireOnline from "../hooks/useRequireOnline";
import CreatePothiSheet from "./CreatePothiSheet";
import NewPothiRow from "./NewPothiRow";
import PothiRow from "./PothiRow";

// "Add to Pothi", opened from a shabad.
//
// Shows every pothi with the ones already holding this shabad ticked, plus a
// "New Pothi" row that creates one and drops the shabad straight into it — so
// the user never leaves the shabad they were reading to go and make a folder
// first.
//
// Tapping a pothi that already holds the shabad is not an error and not a
// silent no-op: the model returns the same state, and this reports "already in
// {name}" rather than a success message that did nothing.

/** Stable empty list, so a missing store slice does not churn memoised props. */
const NO_BANIS = [];
const AddToPothiSheet = ({ visible, onClose, bani = null }) => {
  const { c, space, layout, radii } = useTokens();
  const dispatch = useDispatch();
  const pothis = useSelector((state) => state.pothis) ?? emptyPothis();
  // Straight from the store rather than `useBaniList`. The list is already
  // there by the time a shabad is open, and the hook mounts a fetching effect —
  // this sheet is mounted on the Reader and usually never opened, so it must
  // cost nothing until it is. Without it the create flow's second step opened
  // on an empty list.
  const baniListData = useSelector((state) => state.baniList) ?? NO_BANIS;
  const [creating, setCreating] = useState(false);
  const requireOnline = useRequireOnline();

  const rows = listPothis(pothis).filter((folder) => folder.source === SOURCE);
  const already = new Set(bani ? pothisContaining(pothis, bani.id) : []);

  const add = (pothi) => {
    if (!requireOnline()) return;
    if (already.has(pothi.id)) {
      showToast(STRINGS.formatString(STRINGS.POTHI_ALREADY_IN, { name: pothi.name }));
      onClose();
      return;
    }
    const item = makeBaniItem({ baaniId: bani.id, title: bani.gurmukhiUni || bani.gurmukhi });
    dispatch(actions.addBaniToPothi(pothi.id, item));
    trackPothiEvent("bani_added", { bani_id: bani.id, size: pothi.items.length + 1 });
    showToast(STRINGS.formatString(STRINGS.POTHI_ADDED, { name: pothi.name }), "success");
    onClose();
  };

  /** The tick on a pothi that already holds this shabad. */
  const alreadyBadge = (
    <View
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.xs,
        borderRadius: radii.pill,
        backgroundColor: c.accentSubtle,
      }}
    >
      <Text variant="caption" color="accent">
        ✓
      </Text>
    </View>
  );

  return (
    // Settings-scoped, like the other two pothi sheets — see CreatePothiSheet.
    <ScreenRolesProvider screen="settings">
      {/* No ScrollView in here: the floating Sheet's own body already is one,
          and nesting a second inside it gave two scrollers fighting over the
          same drag. */}
      <Sheet visible={visible} onClose={onClose} title={STRINGS.POTHI_ADD_TO}>
        {/* ONE child, so the sheet's gap between children falls under the title
            and nowhere else. The rows are separated by the list's own hairline,
            the way a list separates rows — an 8pt gap between each was what made
            this read as a stack of cards rather than a list. */}
        <View>
          {/* The SAME two rows the Folders tab draws, not a second set built
              here. This sheet had its own shorter row with a smaller glyph and
              no divider, so the one thing it lists — a pothi — looked different
              depending on which screen you were looking at it from. */}
          <NewPothiRow
            onPress={() => {
              if (requireOnline()) setCreating(true);
            }}
          />

          {rows.length === 0 ? (
            <Text
              variant="bodySmall"
              color="textSecondary"
              align="center"
              style={{ padding: layout.screenGutter }}
            >
              {STRINGS.POTHI_EMPTY_BODY}
            </Text>
          ) : (
            rows.map((pothi) => {
              const has = already.has(pothi.id);
              return (
                <View key={pothi.id}>
                  <ListSeparator />
                  <PothiRow
                    // `listPothis` returns the stored pothi, which carries its
                    // items but not the derived count the row shows.
                    pothi={{ ...pothi, count: pothi.items.length }}
                    onOpen={() => add(pothi)}
                    // Filing, not opening — so the row says so to a screen
                    // reader and wears the tick instead of the "Open Pothi"
                    // arrow. Null on the ones it is not in: an empty trailing
                    // slot, not the default affordance.
                    actionLabel={STRINGS.POTHI_ADD_TO}
                    trailing={has ? alreadyBadge : null}
                  />
                </View>
              );
            })
          )}
        </View>
      </Sheet>

      <CreatePothiSheet
        visible={creating}
        onClose={() => setCreating(false)}
        seedBani={bani}
        baniListData={baniListData}
        onCreated={(pothi) => {
          showToast(STRINGS.formatString(STRINGS.POTHI_ADDED, { name: pothi.name }), "success");
          onClose();
        }}
      />
    </ScreenRolesProvider>
  );
};

AddToPothiSheet.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** The bani being filed. Null while none is loaded. */
  bani: PropTypes.shape({
    id: PropTypes.number,
    gurmukhi: PropTypes.string,
    gurmukhiUni: PropTypes.string,
  }),
};

export default AddToPothiSheet;
