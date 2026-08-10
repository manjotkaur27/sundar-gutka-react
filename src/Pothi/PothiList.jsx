import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import useScreenPalette from "@common/hooks/useScreenPalette";
import useTokens from "@common/hooks/useTokens";
import { DragHandleIcon, PlusIcon } from "@common/icons";
import { countPinned, emptyPothis, MAX_PINNED } from "@common/pothi/model";
import { folderTabRows, resolveBanis } from "@common/pothi/selectors";
import { actions, STRINGS, trackPothiEvent } from "@common";
import { Text } from "../common/components/ui";
import AddBanisSheet from "./components/AddBanisSheet";
import PothiActionsSheet from "./components/PothiActionsSheet";
import PothiRow from "./components/PothiRow";
import PothiShabadRow from "./components/PothiShabadRow";
import useRequireOnline from "./hooks/useRequireOnline";
import useSignedOutPothiHint from "./hooks/useSignedOutPothiHint";

// The Folders tab.
//
// Styled as the bani list is: one flat ground, rows separated by an inset
// hairline, no cards. Switching tabs should feel like changing what the list
// holds, not moving to a different kind of screen.
//
// Two lanes, deliberately: the user's own pothis are draggable, Sundar Gutka's
// bundled folders are not. They are one list visually but two data sources
// (see `pothi/selectors`), and only the user's lane is handed to
// DraggableFlatList — dragging a bundled folder would imply an order that is
// not the user's to change and that nothing would persist.
const PothiList = ({ baniListData, onOpenPothi, onOpenBani, onCreatePress, onPinLimit }) => {
  const { c, space, layout } = useTokens();
  // The same ground the bani list draws on, so the two tabs are one surface.
  const ground = useScreenPalette("baniList").surface;
  const dispatch = useDispatch();
  // Falls back to an empty set: the slice is absent in a partial store and for
  // the instant before rehydration completes.
  const pothis = useSelector((state) => state.pothis) ?? emptyPothis();
  // Reading a pothi works offline; changing one does not. See useRequireOnline.
  const requireOnline = useRequireOnline();
  useSignedOutPothiHint();
  const [expanded, setExpanded] = useState({});
  // The pothi whose rename/delete sheet is open, or null.
  const [acting, setActing] = useState(null);
  // The pothi whose bani picker is open, or null.
  const [filling, setFilling] = useState(null);

  const rows = useMemo(() => folderTabRows(pothis, baniListData), [pothis, baniListData]);
  const mine = useMemo(() => rows.filter((row) => !row.system), [rows]);
  const bundled = useMemo(() => rows.filter((row) => row.system), [rows]);

  const toggle = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const togglePin = useCallback(
    (row) => {
      if (!requireOnline()) return;
      // The model refuses a fourth pin by returning the same state, so the
      // ceiling is checked here to say WHY nothing happened.
      if (!row.pinned && countPinned(pothis) >= MAX_PINNED) {
        onPinLimit();
        return;
      }
      trackPothiEvent(row.pinned ? "unpinned" : "pinned", { pothi_size: row.count });
      dispatch(actions.togglePothiPin(row.id));
    },
    [dispatch, pothis, onPinLimit, requireOnline]
  );

  const contentsOf = useCallback(
    (row) =>
      resolveBanis(row.baniIds, baniListData).map((bani, index) => (
        <PothiShabadRow
          key={`${row.id}-${bani.id}`}
          bani={bani}
          // The pothi row above already ends in a rule.
          showSeparator={index > 0}
          onPress={() => onOpenBani(bani)}
          onRemove={
            row.system
              ? null
              : () => {
                  if (!requireOnline()) return;
                  trackPothiEvent("bani_removed", { bani_id: bani.id });
                  dispatch(actions.removeBaniFromPothi(row.id, bani.id));
                }
          }
        />
      )),
    [baniListData, dispatch, onOpenBani, requireOnline]
  );

  const renderPothi = useCallback(
    (row, { drag = null, isActive = false } = {}) => (
      <PothiRow
        pothi={row}
        expanded={Boolean(expanded[row.id]) && !isActive}
        onToggle={() => toggle(row.id)}
        onOpen={() => onOpenPothi(row)}
        onTogglePin={row.system ? null : () => togglePin(row)}
        onLongPress={
          row.system
            ? null
            : () => {
                if (requireOnline()) setActing(row);
              }
        }
        onAddBanis={
          row.system
            ? null
            : () => {
                if (requireOnline()) setFilling(row.id);
              }
        }
        dragHandle={
          drag && !row.pinned ? (
            <Pressable
              onLongPress={drag}
              delayLongPress={150}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.POTHI_REORDER}
              hitSlop={layout.hitSlop}
            >
              <DragHandleIcon size={20} color={c.textSecondary} />
            </Pressable>
          ) : null
        }
      >
        {contentsOf(row)}
      </PothiRow>
    ),
    [expanded, toggle, onOpenPothi, togglePin, contentsOf, requireOnline, layout, c]
  );

  // Inset on both sides, so it lines up with the row's text and stops short of
  // the screen edge — the same rule the bani list's separator follows.
  const Separator = useCallback(
    () => (
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: c.border,
          marginHorizontal: layout.screenGutter,
        }}
      />
    ),
    [c, layout]
  );

  // Both standing notices are gone from the list itself.
  //
  // The offline one was permanent furniture restating what the toast already
  // says at the moment it matters — `useRequireOnline` toasts when an edit is
  // actually blocked. The sign-in hint is a toast now too (see MyPothisScreen),
  // for the same reason: a banner above the list is read once and then becomes
  // noise the user scrolls past forever.
  const header = (
    // No paddingBottom: the New Pothi row carries a list row's own vertical
    // padding, so any here doubles the gap before the first pothi.
    <View style={{ paddingTop: space.md_12 }}>
      <Pressable
        // No local requireOnline() wrapper: onCreatePress (usePothiActions'
        // openCreate) already does its own complete gating — sign-in first
        // (redirecting to Settings), then connectivity.
        onPress={onCreatePress}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.POTHI_NEW}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          // Matched to PothiRow so the action reads as the first row of the
          // list rather than a smaller control floating above it.
          minHeight: layout.row.minHeight,
          paddingHorizontal: layout.screenGutter,
          paddingVertical: space.lg,
          backgroundColor: pressed ? c.surfaceSelected : "transparent",
        })}
      >
        <PlusIcon size={22} color={c.accent} />
        <Text variant="body" color="accent">
          {STRINGS.POTHI_NEW}
        </Text>
      </Pressable>
    </View>
  );

  /** A quiet section label — the only thing dividing the two lanes. */
  const sectionLabel = (text) => (
    <Text
      variant="label"
      color="textSecondary"
      style={{
        paddingHorizontal: layout.screenGutter,
        paddingTop: space.xl,
        // The row below brings its own `space.lg`; more than a hair here reads
        // as a gap between the heading and the section it labels.
        paddingBottom: space.xs,
      }}
    >
      {text}
    </Text>
  );

  const footer =
    bundled.length === 0 ? null : (
      <View>
        {sectionLabel(STRINGS.POTHI_SUNDAR_GUTKA)}
        {bundled.map((row, index) => (
          <View key={row.id}>
            {index > 0 && <Separator />}
            {renderPothi(row)}
          </View>
        ))}
      </View>
    );

  // No action button here: the header's "+ New Pothi" row is already visible
  // above this (ListHeaderComponent renders before ListEmptyComponent), so a
  // second create button here was the same action offered twice at once.
  const empty = (
    <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.xxl }}>
      <Text variant="subheading" align="center">
        {STRINGS.POTHI_EMPTY_TITLE}
      </Text>
      <Text
        variant="bodySmall"
        color="textSecondary"
        align="center"
        style={{ paddingHorizontal: layout.screenGutter }}
      >
        {STRINGS.POTHI_EMPTY_BODY}
      </Text>
    </View>
  );

  return (
    // DraggableFlatList needs a gesture root with a real height. Without one the
    // list renders but neither scrolls nor drags — exactly how this behaved.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: ground }}>
      <DraggableFlatList
        data={mine}
        keyExtractor={(row) => row.id}
        // Pinned rows are excluded from the drag result before it is saved, so a
        // drag can never reorder the pinned lane.
        onDragEnd={({ data }) => {
          if (!requireOnline()) return;
          const next = data.filter((row) => !row.pinned).map((row) => row.id);
          trackPothiEvent("reordered", { count: next.length });
          dispatch(actions.setPothiOrder(next));
        }}
        activationDistance={12}
        renderItem={({ item, drag, isActive }) => (
          <ScaleDecorator>{renderPothi(item, { drag, isActive })}</ScaleDecorator>
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        // No `style` prop: DraggableFlatList forwards it to an inner animated
        // wrapper, and a flex there fights the gesture root above, collapsing
        // the list to zero height — which rendered a blank page. The root
        // carries the flex, exactly as EditBaniOrder does.
        contentContainerStyle={{ paddingBottom: layout.screenPaddingBottom }}
      />
      <PothiActionsSheet pothi={acting} visible={acting !== null} onClose={() => setActing(null)} />
      <AddBanisSheet
        pothiId={filling}
        visible={filling !== null}
        onClose={() => setFilling(null)}
        baniListData={baniListData}
      />
    </GestureHandlerRootView>
  );
};

PothiList.propTypes = {
  /** Rows from `useBaniList()` — the source for both bundled folders and id lookup. */
  baniListData: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  onOpenPothi: PropTypes.func.isRequired,
  onOpenBani: PropTypes.func.isRequired,
  onCreatePress: PropTypes.func.isRequired,
  /** Called instead of pinning when the user is already at the ceiling. */
  onPinLimit: PropTypes.func.isRequired,
};

export default PothiList;
