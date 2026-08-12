import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { isDefaultPothi, isValidName, MAX_NAME_LENGTH } from "@common/pothi/model";
import { actions, STRINGS, trackPothiEvent } from "@common";
import {
  Button,
  GurmukhiKeyboard,
  GurmukhiKeyboardToggle,
  Sheet,
} from "../../common/components/ui";
import useDeletePothi from "../hooks/useDeletePothi";
import useRequireOnline from "../hooks/useRequireOnline";
import PothiNameField from "./PothiNameField";

// Rename and delete, reached by long-pressing a pothi.
//
// Long-press rather than a permanent overflow button on every row: these are
// the two rarest actions on the screen and a third control in each row would
// crowd the pin and the chevron, which are used constantly.
//
// Same layout language as CreatePothiSheet and TimePickerSheet — Sheet owns the
// padding, one gapped column, a right-aligned ghost + primary action row.
//
// Deleting asks first, and the confirmation says explicitly that the banis
// themselves survive — a folder of scripture disappearing is alarming enough
// that "Delete" alone is not an honest label.
const PothiActionsSheet = ({ pothi = null, visible, onClose, startRenaming = false }) => {
  const { space } = useTokens();
  const dispatch = useDispatch();
  const requireOnline = useRequireOnline();
  const confirmDelete = useDeletePothi();
  // Morning and Evening Nitnem cannot be deleted: Morning Nitnem IS Today's
  // Nitnem on the Dashboard, and the API seeds the pair exactly once per user,
  // so a deletion is permanent — there is no way back to them from the app.
  // They rename and edit like any other pothi.
  const isDefault = useSelector((state) => isDefaultPothi(state.pothis, pothi?.id));
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [gurmukhi, setGurmukhi] = useState(false);
  // Reopening on a different pothi starts from that pothi's current name.
  useEffect(() => {
    if (visible) {
      // Opened from the folder screen's overflow, rename IS the action, so the
      // sheet starts there rather than on the delete/rename choice row.
      setRenaming(startRenaming);
      setGurmukhi(false);
      setName(pothi?.name ?? "");
    }
  }, [visible, pothi, startRenaming]);

  if (!pothi) return null;

  const submitRename = () => {
    if (!isValidName(name) || !requireOnline()) return;
    dispatch(actions.renamePothi(pothi.id, name));
    trackPothiEvent("renamed");
    onClose();
  };

  // The pothi is captured here because the sheet closes first: once it does,
  // `pothi` is null and this component renders nothing, while the confirm is
  // hosted at the app root and outlives it.
  const askDelete = () => {
    const target = pothi;
    onClose();
    confirmDelete(target);
  };

  const actionRow = (children) => (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        gap: space.sm,
        paddingTop: space.md,
      }}
    >
      {children}
    </View>
  );

  const grow = { flexGrow: 1, flexBasis: "auto" };

  return (
    // Same settings-scoped palette as the reminder sheets — see CreatePothiSheet.
    <ScreenRolesProvider screen="settings">
      <Sheet
        visible={visible}
        onClose={onClose}
        title={pothi.name}
        scrollable={false}
        // Pinned, so the keys cannot be pushed past the bottom edge.
        footer={
          renaming && gurmukhi ? (
            <GurmukhiKeyboard
              value={name}
              onKey={(key) => setName((name + key).slice(0, MAX_NAME_LENGTH))}
              onBackspace={() => setName(name.slice(0, -1))}
            />
          ) : null
        }
      >
        <View style={{ gap: space.lg }}>
          {renaming ? (
            <>
              {/* Above the field it serves — see GurmukhiKeyboardToggle. */}
              <GurmukhiKeyboardToggle
                label={STRINGS.POTHI_KEYBOARD_TOGGLE}
                active={gurmukhi}
                onToggle={() => setGurmukhi((on) => !on)}
              />
              <PothiNameField
                value={name}
                onChange={setName}
                onSubmit={submitRename}
                gurmukhiOpen={gurmukhi}
                receivingKeys={gurmukhi}
                onFocus={() => {}}
              />
              {actionRow(
                <>
                  <Button
                    title={STRINGS.CANCEL}
                    onPress={() => setRenaming(false)}
                    variant="ghost"
                    style={grow}
                  />
                  <Button
                    title={STRINGS.SAVE}
                    onPress={submitRename}
                    disabled={!isValidName(name)}
                    style={grow}
                  />
                </>
              )}
            </>
          ) : (
            actionRow(
              <>
                {isDefault ? null : (
                  <Button
                    title={STRINGS.POTHI_DELETE}
                    onPress={askDelete}
                    variant="ghost"
                    style={grow}
                  />
                )}
                <Button
                  title={STRINGS.POTHI_RENAME}
                  onPress={() => setRenaming(true)}
                  style={grow}
                />
              </>
            )
          )}
        </View>
      </Sheet>
    </ScreenRolesProvider>
  );
};

PothiActionsSheet.propTypes = {
  /** Null when no row is targeted — the sheet renders nothing. */
  pothi: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    count: PropTypes.number,
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** Opens straight into rename, for a caller whose only action is renaming. */
  startRenaming: PropTypes.bool,
};

export default PothiActionsSheet;
