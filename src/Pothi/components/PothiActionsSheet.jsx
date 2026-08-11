import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { isValidName, MAX_NAME_LENGTH } from "@common/pothi/model";
import { actions, showConfirm, showToast, STRINGS, trackPothiEvent } from "@common";
import {
  Button,
  GurmukhiKeyboard,
  GurmukhiKeyboardToggle,
  Sheet,
} from "../../common/components/ui";
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
const PothiActionsSheet = ({ pothi = null, visible, onClose }) => {
  const { space } = useTokens();
  const dispatch = useDispatch();
  const requireOnline = useRequireOnline();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [gurmukhi, setGurmukhi] = useState(false);
  // Reopening on a different pothi starts from that pothi's current name.
  useEffect(() => {
    if (visible) {
      setRenaming(false);
      setGurmukhi(false);
      setName(pothi?.name ?? "");
    }
  }, [visible, pothi]);

  if (!pothi) return null;

  const submitRename = () => {
    if (!isValidName(name) || !requireOnline()) return;
    dispatch(actions.renamePothi(pothi.id, name));
    trackPothiEvent("renamed");
    onClose();
  };

  // The same compact confirm the audio player raises for "Remove offline
  // audio?" — a small card with plain text actions and the destructive one in
  // red, rather than a second full sheet of buttons stacked over this one.
  //
  // The pothi is captured here because the sheet closes first: once it does,
  // `pothi` is null and this component renders nothing, while the confirm is
  // hosted at the app root and outlives it.
  const askDelete = () => {
    const { id, count } = pothi;
    onClose();
    showConfirm({
      title: STRINGS.POTHI_DELETE,
      message: STRINGS.POTHI_DELETE_CONFIRM,
      cancelText: STRINGS.CANCEL,
      confirmText: STRINGS.POTHI_DELETE,
      destructive: true,
      onConfirm: () => {
        if (!requireOnline()) return;
        dispatch(actions.deletePothi(id));
        trackPothiEvent("deleted", { size: count });
        showToast(STRINGS.POTHI_DELETED, "success");
      },
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
                <Button
                  title={STRINGS.POTHI_DELETE}
                  onPress={askDelete}
                  variant="ghost"
                  style={grow}
                />
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
};

export default PothiActionsSheet;
