import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import { NEST_OVERLAYS_IN_SHEET } from "@common/components/ui/Overlay";
import useTokens from "@common/hooks/useTokens";
import { isDefaultPothi, isValidName, MAX_NAME_LENGTH } from "@common/pothi/model";
import { actions, ConfirmDialogHost, showConfirm, STRINGS, trackPothiEvent } from "@common";
import { Button, GurmukhiKeyboard, Sheet, SheetActions } from "../../common/components/ui";
import useDeletePothi from "../hooks/useDeletePothi";
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
  const confirmDelete = useDeletePothi();
  // Morning and Evening Nitnem cannot be deleted or renamed. Morning Nitnem IS
  // Today's Nitnem on the Dashboard, and the API seeds the pair exactly once per
  // user, so a deletion is permanent. A rename breaks the link on any other
  // device, which has to find the pair by its banis or its name — see
  // resolveDefaultId. Their banis still edit like any other pothi's.
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
    if (!isValidName(name) || isDefault) return;
    dispatch(actions.renamePothi(pothi.id, name));
    trackPothiEvent("renamed");
    onClose();
  };

  // The sheet stays OPEN behind the confirm and closes only once the delete is
  // through — the shape ReminderEditSheet already uses.
  //
  // Closing first is what broke it: `showConfirm` goes to the innermost mounted
  // host, which is the one rendered at the bottom of this sheet, so a confirm
  // raised in the same tick as `onClose` was handed to a host React unmounted in
  // that very commit. The dialog never appeared and nothing was deleted, on both
  // platforms. Cancelling closes the sheet too: the choice was made, and backing
  // out of it means backing out, not landing on the same Delete/Rename row.
  const askDelete = () => confirmDelete(pothi, onClose, onClose);

  // Asked only when there is something to lose. Backing out of a name the
  // user never changed is not a discard, and being questioned about it is one
  // more tap for nothing.
  const cancelRename = () => {
    // Cancelling a rename closes the sheet — from the Folders tab as from the
    // folder screen — rather than going back to the Delete/Rename row.
    if (name === pothi.name) {
      onClose();
      return;
    }
    showConfirm({
      title: STRINGS.formatString(STRINGS.POTHI_DISCARD_EDITS_CONFIRM, { name: pothi.name }),
      cancelText: STRINGS.POTHI_KEEP_EDITING,
      confirmText: STRINGS.POTHI_DISCARD,
      destructive: true,
      onConfirm: onClose,
    });
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
        // While renaming, the field is fixed at the top and Cancel and Save are
        // fixed at the bottom, above the keys — see SheetActions. The choice
        // row stays in the body as buttons, because Delete and Rename are
        // choices, not a confirmation.
        header={
          renaming ? (
            <PothiNameField
              value={name}
              onChange={setName}
              onSubmit={submitRename}
              gurmukhiOpen={gurmukhi}
              receivingKeys={gurmukhi}
              onFocus={() => {}}
              onToggleGurmukhi={() => setGurmukhi((on) => !on)}
            />
          ) : null
        }
        // Scrollable, so on a short screen the choice row can still be reached.
        scrollable
        // Pinned while renaming: Cancel and Save as words, then the keys under
        // them, so neither can be pushed past the bottom edge.
        footer={
          renaming ? (
            <SheetActions
              onCancel={cancelRename}
              cancelLabel={STRINGS.CANCEL}
              confirmLabel={STRINGS.SAVE}
              onConfirm={submitRename}
              confirmDisabled={!isValidName(name)}
            />
          ) : null
        }
        keyboard={
          renaming && gurmukhi ? (
            <GurmukhiKeyboard
              lettersLabel={STRINGS.POTHI_KEYBOARD_LETTERS}
              signsLabel={STRINGS.POTHI_KEYBOARD_SIGNS}
              value={name}
              onChange={(next) => setName(next.slice(0, MAX_NAME_LENGTH))}
            />
          ) : null
        }
      >
        <View style={{ gap: space.lg }}>
          {renaming
            ? null
            : actionRow(
                <>
                  {isDefault ? null : (
                    <Button
                      title={STRINGS.POTHI_DELETE}
                      onPress={askDelete}
                      // Red, like every other delete in the pothi screens.
                      variant="danger"
                      style={grow}
                    />
                  )}
                  {isDefault ? null : (
                    <Button
                      title={STRINGS.POTHI_RENAME}
                      onPress={() => setRenaming(true)}
                      style={grow}
                    />
                  )}
                </>
              )}
        </View>

        {/* Confirms raised from in here are presented BY this sheet.
            `showConfirm`'s host is normally the one at the app root, which on
            iOS is presented by the root controller — and that controller is
            already presenting this sheet, so the dialog never appeared and the
            screen sat frozen. A host mounted here registers as the innermost
            and takes over for as long as the sheet is open. See ConfirmDialog.

            Outside the settings scope, though. That scope dresses this SHEET in
            the Settings palette and is dark-mode only, so a dialog inheriting it
            came up navy on the Folders tab while every other confirm in the app
            stayed on the default elevated surface. The dialog is app-wide
            furniture, not part of the sheet.

            iOS only — see NEST_OVERLAYS_IN_SHEET. On Android a Modal inside a
            Modal is a second React root whose teardown races the sheet's, and
            the app-root host has always been able to open a Dialog over this
            sheet anyway. */}
        {NEST_OVERLAYS_IN_SHEET && (
          <ScreenRolesProvider screen={null}>
            <ConfirmDialogHost />
          </ScreenRolesProvider>
        )}
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
