import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { createPothi, isValidName, makeBaniItem, MAX_NAME_LENGTH } from "@common/pothi/model";
import { actions, STRINGS, trackPothiEvent } from "@common";
import {
  Button,
  GurmukhiKeyboard,
  GurmukhiKeyboardToggle,
  Sheet,
} from "../../common/components/ui";
import useRequireOnline from "../hooks/useRequireOnline";
import PickBanisField from "./PickBanisField";
import PothiNameField from "./PothiNameField";

// Name a new pothi, optionally seeding it with a shabad.
//
// Laid out like the reminder sheets: `Sheet` owns the padding, the body is one
// gapped column, and the actions are a right-aligned ghost + primary row that
// share the width. Full-width stacked blocks gave every action equal weight and
// doubled the sheet's height.
//
// `seedBani` is what makes the add-to-pothi flow work without leaving the
// reader: the pothi is created and the current shabad lands in it in one step,
// which is why the id is minted here rather than by the reducer. It is the
// whole bani row, not just an id, because the API requires each item to carry
// its own display title and stores it verbatim.
const CreatePothiSheet = ({ visible, onClose, onCreated, seedBani = null, baniListData = [] }) => {
  const { space } = useTokens();
  const dispatch = useDispatch();
  const requireOnline = useRequireOnline();
  const [name, setName] = useState("");
  // Chosen before the pothi exists, so they go in with it. Without this a new
  // pothi was always born empty and had to be filled in a second pass.
  const [picked, setPicked] = useState([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [query, setQuery] = useState("");
  // ONE keyboard for the sheet, switched on above the fields; `focused` says
  // which field its keys go into. Tapping a field moves the keys to it, which
  // is how a real keyboard behaves — the alternative was a switch per field,
  // several controls all claiming the same single keyboard.
  const [gurmukhi, setGurmukhi] = useState(false);
  const [focused, setFocused] = useState("name");

  // A reopened sheet starts clean rather than showing the last name typed.
  useEffect(() => {
    if (visible) {
      setName("");
      setPicked([]);
      setPickOpen(false);
      setQuery("");
      setGurmukhi(false);
      setFocused("name");
    }
  }, [visible]);

  const submit = () => {
    if (!isValidName(name) || !requireOnline()) return;
    const pothi = createPothi({
      name,
      items: [
        ...(seedBani
          ? [
              makeBaniItem({
                baaniId: seedBani.id,
                title: seedBani.gurmukhiUni || seedBani.gurmukhi,
              }),
            ]
          : []),
        ...picked.filter((item) => item.baaniId !== seedBani?.id),
      ],
    });
    dispatch(actions.createPothi(pothi));
    trackPothiEvent("created", { seeded: seedBani != null, size: picked.length });
    onCreated(pothi);
    onClose();
  };

  return (
    // Scoped to the SETTINGS palette — the same one the reminder sheets get
    // from `withScreenRoles(Settings, "settings")` at the route. Without it a
    // sheet opened from Home or the Reader falls back to the bare semantic
    // layer, whose dark `surfaceElevated` is a grey, so the same control looked
    // like two different sheets depending on where it was opened from.
    <ScreenRolesProvider screen="settings">
      <Sheet
        visible={visible}
        onClose={onClose}
        title={STRINGS.POTHI_NEW}
        // Scrollable, and the keyboard is a PINNED footer: with the bani list
        // open there is more content than a capped sheet can show, so the body
        // has to give way rather than push the keys off the bottom.
        footer={
          gurmukhi ? (
            <GurmukhiKeyboard
              value={focused === "name" ? name : query}
              onKey={(key) =>
                focused === "name"
                  ? // Capped, never trimmed: trimming per keystroke would
                    // swallow the space key the moment it was pressed.
                    setName((name + key).slice(0, MAX_NAME_LENGTH))
                  : setQuery(query + key)
              }
              onBackspace={() =>
                focused === "name" ? setName(name.slice(0, -1)) : setQuery(query.slice(0, -1))
              }
            />
          ) : null
        }
      >
        <View style={{ gap: space.lg }}>
          {/* Above BOTH fields, because it switches the one keyboard they
              share. See GurmukhiKeyboardToggle. */}
          <GurmukhiKeyboardToggle
            label={STRINGS.POTHI_KEYBOARD_TOGGLE}
            active={gurmukhi}
            onToggle={() => setGurmukhi((on) => !on)}
          />

          <PothiNameField
            value={name}
            onChange={setName}
            onSubmit={submit}
            gurmukhiOpen={gurmukhi}
            receivingKeys={gurmukhi && focused === "name"}
            onFocus={() => setFocused("name")}
          />

          <PickBanisField
            picked={picked}
            onChange={setPicked}
            baniListData={baniListData}
            open={pickOpen}
            onToggleOpen={() => setPickOpen((on) => !on)}
            query={query}
            onQueryChange={setQuery}
            gurmukhiOpen={gurmukhi}
            receivingKeys={gurmukhi && focused === "search"}
            onFocusSearch={() => setFocused("search")}
          />

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: space.sm,
            }}
          >
            <Button
              title={STRINGS.CANCEL}
              onPress={onClose}
              variant="ghost"
              style={{ flexGrow: 1, flexBasis: "auto" }}
            />
            <Button
              title={STRINGS.POTHI_CREATE}
              onPress={submit}
              disabled={!isValidName(name)}
              style={{ flexGrow: 1, flexBasis: "auto" }}
            />
          </View>

        </View>
      </Sheet>
    </ScreenRolesProvider>
  );
};

CreatePothiSheet.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** Receives the created pothi, so the caller can report which one it went into. */
  onCreated: PropTypes.func.isRequired,
  /** Rows from `useBaniList()`, so banis can be picked before the pothi exists. */
  baniListData: PropTypes.arrayOf(PropTypes.shape()),
  /** A bani row to drop into the new pothi immediately — the add-to-pothi flow. */
  seedBani: PropTypes.shape({
    id: PropTypes.number,
    gurmukhi: PropTypes.string,
    gurmukhiUni: PropTypes.string,
  }),
};

export default CreatePothiSheet;
