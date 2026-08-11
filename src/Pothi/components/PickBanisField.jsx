import React, { useMemo } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import PropTypes from "prop-types";
import useBaniTitle from "@common/hooks/useBaniTitle";
import useTokens from "@common/hooks/useTokens";
import { ChevronDownIcon, ChevronRight } from "@common/icons";
import { makeBaniItem } from "@common/pothi/model";
import { STRINGS } from "@common";
import { GurmukhiTextField, Text } from "../../common/components/ui";
import BaniPickRow from "./BaniPickRow";

// Choose banis WHILE creating a pothi.
//
// Held as local state and handed to `createPothi`, so the pothi is born with
// its contents instead of always starting empty and needing a second pass.
//
// ── One control, not two ──────────────────────────────────────────────────
// This used to be a button labelled "Add banis" that, when tapped, revealed a
// SEPARATE search box underneath it — so the thing you tapped stayed on screen
// doing nothing while a second, different-looking field appeared below it to
// take your typing. Expanded, the row IS the search field now: same position,
// same box, it just becomes typable. Collapsed, it shows what is chosen.
const PickBanisField = ({
  picked,
  onChange,
  baniListData,
  open,
  onToggleOpen,
  query,
  onQueryChange,
  gurmukhiOpen,
  receivingKeys,
  onFocusSearch,
  tall = false,
}) => {
  const { c, space, radii, layout } = useTokens();
  const { height } = useWindowDimensions();
  const { titleFor, titleFontFamily } = useBaniTitle();

  // A share of the LIVE window, not a fixed slab. See layout.sheet for why.
  //
  // `tall` is the picker standing alone as its own step, where it gets the
  // screen to browse in rather than the slice it can spare beside other fields.
  const ratio = (() => {
    if (tall) {
      return gurmukhiOpen
        ? layout.sheet.pickStepListMaxHeightRatioWithKeyboard
        : layout.sheet.pickStepListMaxHeightRatio;
    }
    return gurmukhiOpen
      ? layout.sheet.listMaxHeightRatioWithKeyboard
      : layout.sheet.listMaxHeightRatio;
  })();
  const listMaxHeight = Math.max(layout.sheet.listMinHeight, height * ratio);

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

  const summary =
    picked.length === 1
      ? STRINGS.POTHI_SHABAD_COUNT_ONE
      : STRINGS.formatString(STRINGS.POTHI_SHABAD_COUNT, { count: picked.length });

  return (
    // `flexShrink` so the capped list inside can actually give space back to
    // the sheet's fixed actions — a default-0 container would swallow the
    // shrink before it reached the ScrollView.
    <View style={{ gap: layout.dialog.gap, flexShrink: 1 }}>
      {open ? (
        <GurmukhiTextField
          value={query}
          onChange={onQueryChange}
          placeholder={STRINGS.POTHI_SEARCH_BANIS}
          accessibilityLabel={STRINGS.POTHI_SEARCH_BANIS}
          returnKeyType="search"
          gurmukhiOpen={gurmukhiOpen}
          receivingKeys={receivingKeys}
          onFocus={onFocusSearch}
        />
      ) : (
        // Collapsed by default: naming is the required step, picking is not,
        // and a long list unfurled above the Create button buries it.
        <Pressable
          onPress={onToggleOpen}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          accessibilityLabel={STRINGS.POTHI_ADD_BANIS}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            minHeight: layout.touchTarget,
            paddingHorizontal: space.md,
            borderRadius: radii.sm,
            borderWidth: layout.borderWidth.hairline,
            borderColor: c.borderStrong,
            backgroundColor: pressed ? c.surfaceSelected : c.surface,
          })}
        >
          <Text variant="body" style={{ flex: 1 }}>
            {STRINGS.POTHI_ADD_BANIS}
          </Text>
          <Text variant="bodySmall" color={picked.length ? "accent" : "textSecondary"}>
            {summary}
          </Text>
          <ChevronRight size={20} color={c.textSecondary} />
        </Pressable>
      )}

      {open && (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            // `maxHeight` is a CEILING, not a demand. React Native defaults
            // `flexShrink` to 0, so without this the list insisted on its full
            // share and pushed the sheet's own actions off the bottom edge —
            // it must yield to the fixed furniture (search field, buttons)
            // before it takes the space that is left.
            style={{ maxHeight: listMaxHeight, flexShrink: 1 }}
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

          {/* Standing alone as its own step there is nothing to collapse back
              into, so the count moves up beside the keyboard toggle and this
              whole row goes — it was a touch target's worth of height spent on
              an action with nowhere to go. */}
          {!tall && (
            <Pressable
              onPress={onToggleOpen}
              accessibilityRole="button"
              accessibilityState={{ expanded: true }}
              accessibilityLabel={STRINGS.POTHI_DONE}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: space.sm,
                minHeight: layout.touchTarget,
                borderRadius: radii.sm,
                backgroundColor: pressed ? c.surfaceSelected : "transparent",
              })}
            >
              <Text variant="label" color="accent">
                {summary}
              </Text>
              <ChevronDownIcon size={18} color={c.accent} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
};

PickBanisField.propTypes = {
  /** Wire-shaped bani items chosen so far. */
  picked: PropTypes.arrayOf(PropTypes.shape({ baaniId: PropTypes.number })).isRequired,
  onChange: PropTypes.func.isRequired,
  baniListData: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  open: PropTypes.bool.isRequired,
  /** True when the picker IS the step, so the list takes the screen to browse in. */
  tall: PropTypes.bool,
  onToggleOpen: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  /** Whether the sheet's in-app keyboard is up at all. */
  gurmukhiOpen: PropTypes.bool.isRequired,
  /** Whether the search field is the one receiving its keys. */
  receivingKeys: PropTypes.bool.isRequired,
  onFocusSearch: PropTypes.func.isRequired,
};

export default PickBanisField;
