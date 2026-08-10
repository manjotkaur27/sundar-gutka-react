import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { FolderIcon, PlusIcon } from "@common/icons";
import {
  emptyPothis,
  listPothis,
  makeBaniItem,
  pothisContaining,
  SOURCE,
} from "@common/pothi/model";
import { actions, showToast, STRINGS, trackPothiEvent } from "@common";
import { Sheet, Text } from "../../common/components/ui";
import useRequireOnline from "../hooks/useRequireOnline";
import CreatePothiSheet from "./CreatePothiSheet";

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
const AddToPothiSheet = ({ visible, onClose, bani = null }) => {
  const { c, space, layout, radii } = useTokens();
  const dispatch = useDispatch();
  const pothis = useSelector((state) => state.pothis) ?? emptyPothis();
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

  const rowStyle = ({ pressed }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: space.md_12,
    minHeight: layout.touchTarget,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: space.md_12,
    backgroundColor: pressed ? c.surfaceSelected : "transparent",
  });

  return (
    // Settings-scoped, like the other two pothi sheets — see CreatePothiSheet.
    <ScreenRolesProvider screen="settings">
      <Sheet visible={visible} onClose={onClose} title={STRINGS.POTHI_ADD_TO}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => {
              if (requireOnline()) setCreating(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.POTHI_NEW}
            style={rowStyle}
          >
            <PlusIcon size={22} color={c.accent} />
            <Text variant="body" color="accent">
              {STRINGS.POTHI_NEW}
            </Text>
          </Pressable>

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
                <Pressable
                  key={pothi.id}
                  onPress={() => add(pothi)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: has }}
                  accessibilityLabel={pothi.name}
                  style={rowStyle}
                >
                  <FolderIcon size={22} color={c.textSecondary} />
                  <Text variant="body" numberOfLines={2} style={{ flex: 1 }}>
                    {pothi.name}
                  </Text>
                  {has && (
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
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Sheet>

      <CreatePothiSheet
        visible={creating}
        onClose={() => setCreating(false)}
        seedBani={bani}
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
