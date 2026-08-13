import React, { useMemo } from "react";
import { View } from "react-native";
import PropTypes from "prop-types";
import useBaniTitle from "@common/hooks/useBaniTitle";
import useTokens from "@common/hooks/useTokens";
import { makeBaniItem } from "@common/pothi/model";
import { STRINGS } from "@common";
import {
  Button,
  GurmukhiKeyboardToggle,
  GurmukhiTextField,
  Text,
} from "../../common/components/ui";
import BaniPickRow from "./BaniPickRow";
import { shabadCountLabel } from "./PothiRow";

// "Choose banis" as a whole sheet step: the count, the keyboard switch, the
// search field, the scrolling list and the two actions.
//
// ONE implementation, used by both places that offer it — the second step of
// creating a pothi, and Add Banis on a pothi that already exists. Those were two
// copies of the same screen, and every defect in the copy (the list too short,
// no Cancel/Done, the list running underneath them, no count) had to be fixed
// twice and was only ever fixed once. There is nothing left to keep in step.
//
// The picker is always expanded. It is the entire step, so there is nothing to
// collapse back into and nothing else on the sheet competing for the height.
//
// The in-app keyboard is deliberately NOT here: only the host `Sheet` can pin
// something outside its own scrolling body, so each caller puts the keys in its
// `footer` and passes the state down.
const PickBanisStep = ({
  picked,
  onChange,
  baniListData,
  query,
  onQueryChange,
  gurmukhiOpen,
  onToggleGurmukhi,
  onCancel,
  confirmTitle,
  onConfirm,
  confirmDisabled = false,
}) => {
  const { space } = useTokens();
  const { titleFor, titleFontFamily } = useBaniTitle();

  // Leaf banis only. A bundled folder is a container, not something a pothi can
  // hold — its children are offered individually instead.
  const options = useMemo(() => {
    const leaves = (baniListData ?? []).filter((b) => !Array.isArray(b.folder) && b.id != null);
    const needle = query.trim().toLowerCase();
    if (!needle) return leaves;
    return leaves.filter((bani) =>
      [bani.gurmukhiUni, bani.gurmukhi, bani.translit]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle))
    );
  }, [baniListData, query]);

  const chosen = useMemo(() => new Set(picked.map((item) => item.baaniId)), [picked]);

  const toggle = (bani) => {
    if (chosen.has(bani.id)) {
      onChange(picked.filter((item) => item.baaniId !== bani.id));
      return;
    }
    onChange([...picked, makeBaniItem({ baaniId: bani.id, title: titleFor(bani) })]);
  };

  const grow = { flexGrow: 1, flexBasis: "auto" };

  return (
    // `flexShrink` has to run the whole way down: the sheet body shrinks, so
    // this column must too, or the capped list below never gives up its height
    // to the actions underneath it.
    <View style={{ gap: space.lg, flexShrink: 1 }}>
      {/* The count is a readout, not an action, so it rides the switch's row
          rather than owning one — no extra height, no tap target. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.md,
        }}
      >
        <Text
          variant="bodySmall"
          color={picked.length ? "accent" : "textSecondary"}
          style={{ flexShrink: 1 }}
        >
          {shabadCountLabel(picked.length)}
        </Text>
        <GurmukhiKeyboardToggle
          label={STRINGS.POTHI_KEYBOARD_TOGGLE}
          active={gurmukhiOpen}
          onToggle={onToggleGurmukhi}
        />
      </View>

      <GurmukhiTextField
        value={query}
        onChange={onQueryChange}
        placeholder={STRINGS.POTHI_SEARCH_BANIS}
        accessibilityLabel={STRINGS.POTHI_SEARCH_BANIS}
        returnKeyType="search"
        gurmukhiOpen={gurmukhiOpen}
        receivingKeys={gurmukhiOpen}
      />

      {/* The list does NOT scroll itself. The host Sheet does, and one scroller
          is the whole point.

          It used to be a ScrollView capped at a share of the window. Two
          problems, both of which the keyboard made unbearable. A nested
          vertical scroller inside the sheet's own meant the two fought for
          every drag, which is why scrolling these sheets was so hard. And the
          cap was measured against the FULL window with a `listMinHeight`
          FLOOR — so with the keys up it went on claiming height that no longer
          existed, and the search field and both buttons were pushed off the
          bottom of a sheet that could not scroll to reach them.

          Rendered inline, the column is simply as tall as it is and the sheet
          scrolls it. Nothing is ever unreachable at any text size, and the keys
          stay pinned below because they are the Sheet's footer, not part of
          this. The rows were already all rendered by this map, so nothing is
          virtualised now that was not before. */}
      <View style={{ paddingVertical: space.md_12 }}>
        {options.map((bani) => (
          <BaniPickRow
            key={bani.id}
            title={titleFor(bani)}
            checked={chosen.has(bani.id)}
            fontFamily={titleFontFamily}
            onPress={() => toggle(bani)}
          />
        ))}
      </View>

      {/* Wraps rather than clips: at a large OS font size two translated labels
          do not fit one row, and each grows to share the width it does get. */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: space.sm,
        }}
      >
        <Button title={STRINGS.CANCEL} onPress={onCancel} variant="ghost" style={grow} />
        <Button title={confirmTitle} onPress={onConfirm} disabled={confirmDisabled} style={grow} />
      </View>
    </View>
  );
};

PickBanisStep.propTypes = {
  /** Wire-shaped bani items chosen so far. */
  picked: PropTypes.arrayOf(PropTypes.shape({ baaniId: PropTypes.number })).isRequired,
  /** Receives the whole next selection; the caller decides how to apply it. */
  onChange: PropTypes.func.isRequired,
  baniListData: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  /** Whether the sheet's in-app keyboard is up; the caller renders the keys. */
  gurmukhiOpen: PropTypes.bool.isRequired,
  onToggleGurmukhi: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  /** Label for the confirming action — "Create" here, "Done" there. */
  confirmTitle: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  confirmDisabled: PropTypes.bool,
};

export default PickBanisStep;
