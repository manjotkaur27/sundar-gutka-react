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
  Text,
} from "../../common/components/ui";
import useRequireOnline from "../hooks/useRequireOnline";
import PickBanisField from "./PickBanisField";
import PothiNameField from "./PothiNameField";
import { shabadCountLabel } from "./PothiRow";

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
  // Two steps: name the pothi, then fill it. Splitting them is what gives the
  // bani list room to browse in — sharing one sheet with the name field left it
  // a sliver. Each step owns the single keyboard, so there is no `focused`
  // question to answer any more: step 1 types the name, step 2 the search.
  const [step, setStep] = useState(1);

  // A reopened sheet starts clean rather than showing the last name typed.
  useEffect(() => {
    if (visible) {
      setName("");
      setPicked([]);
      setPickOpen(true);
      setQuery("");
      setGurmukhi(false);
      setStep(1);
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
        // Step 2 is about THIS pothi, so it wears the name just typed.
        title={step === 1 ? STRINGS.POTHI_NEW : name}
        // Step 2 must NOT scroll as a whole. The search field and the actions
        // are fixed furniture; the bani list is the only thing that moves, and
        // it scrolls inside its own capped box (see PickBanisField). Scrolling
        // the sheet as well let the search field and the buttons slide away
        // while browsing, which is the one time you need them.
        scrollable={step === 1}
        // Scrollable, and the keyboard is a PINNED footer: with the bani list
        // open there is more content than a capped sheet can show, so the body
        // has to give way rather than push the keys off the bottom.
        footer={
          gurmukhi ? (
            <GurmukhiKeyboard
              value={step === 1 ? name : query}
              onKey={(key) =>
                step === 1
                  ? // Capped, never trimmed: trimming per keystroke would
                    // swallow the space key the moment it was pressed.
                    setName((name + key).slice(0, MAX_NAME_LENGTH))
                  : setQuery(query + key)
              }
              onBackspace={() =>
                step === 1 ? setName(name.slice(0, -1)) : setQuery(query.slice(0, -1))
              }
            />
          ) : null
        }
      >
        {/* `flexShrink` carries the sheet's height limit down to the bani
            list, so it yields rather than pushing the actions off the sheet. */}
        <View style={{ gap: space.lg, flexShrink: 1 }}>
          {/* Above BOTH fields, because it switches the one keyboard they
              share. See GurmukhiKeyboardToggle. */}
          {/* On step 2 the picked count rides this row as plain text rather
              than owning a full row of its own under the list — it is a
              readout, not an action, so it costs no height and no tap target. */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: space.md,
            }}
          >
            {step === 2 && (
              <Text
                variant="bodySmall"
                color={picked.length ? "accent" : "textSecondary"}
                style={{ flexShrink: 1 }}
              >
                {shabadCountLabel(picked.length)}
              </Text>
            )}
            <GurmukhiKeyboardToggle
              label={STRINGS.POTHI_KEYBOARD_TOGGLE}
              active={gurmukhi}
              onToggle={() => setGurmukhi((on) => !on)}
            />
          </View>

          {step === 1 ? (
            <PothiNameField
              value={name}
              onChange={setName}
              onSubmit={() => isValidName(name) && setStep(2)}
              gurmukhiOpen={gurmukhi}
              receivingKeys={gurmukhi}
              onFocus={() => {}}
            />
          ) : (
            <PickBanisField
              picked={picked}
              onChange={setPicked}
              baniListData={baniListData}
              open={pickOpen}
              onToggleOpen={() => setPickOpen((on) => !on)}
              query={query}
              onQueryChange={setQuery}
              gurmukhiOpen={gurmukhi}
              receivingKeys={gurmukhi}
              onFocusSearch={() => {}}
              tall
            />
          )}

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
            {step === 1 ? (
              <Button
                title={STRINGS.NEXT}
                onPress={() => setStep(2)}
                disabled={!isValidName(name)}
                style={{ flexGrow: 1, flexBasis: "auto" }}
              />
            ) : (
              <Button
                title={STRINGS.POTHI_CREATE}
                onPress={submit}
                disabled={!isValidName(name)}
                style={{ flexGrow: 1, flexBasis: "auto" }}
              />
            )}
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
