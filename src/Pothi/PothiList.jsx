import React, { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import useScreenPalette from "@common/hooks/useScreenPalette";
import useTokens from "@common/hooks/useTokens";
import { DragHandleIcon } from "@common/icons";
import { countPinned, emptyPothis, MAX_PINNED } from "@common/pothi/model";
import { folderTabRows, resolveBanis } from "@common/pothi/selectors";
import { actions, STRINGS, trackPothiEvent, useCustomScrollbar } from "@common";
import { ListSeparator, Text } from "../common/components/ui";
import NewPothiRow from "./components/NewPothiRow";
import PothiActionsSheet from "./components/PothiActionsSheet";
import PothiRow from "./components/PothiRow";
import usePothiTitle from "./hooks/usePothiTitle";
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
const PothiList = ({ baniListData, onOpenPothi, onCreatePress, onPinLimit }) => {
  const { c, space, layout } = useTokens();
  // The same ground the bani list draws on, so the two tabs are one surface.
  const ground = useScreenPalette("baniList").surface;
  const dispatch = useDispatch();
  // Falls back to an empty set: the slice is absent in a partial store and for
  // the instant before rehydration completes.
  const pothis = useSelector((state) => state.pothis) ?? emptyPothis();
  // Reading a pothi works offline; changing one does not. See useRequireOnline.
  const requireOnline = useRequireOnline();
  // The app-wide themed scrollbar, not a standalone one.
  const { ownedScrollProps, Indicator } = useCustomScrollbar();
  const { titleFor, variantFor } = usePothiTitle();
  useSignedOutPothiHint();
  // The pothi whose rename/delete sheet is open, or null.
  const [acting, setActing] = useState(null);

  const rows = useMemo(() => folderTabRows(pothis, baniListData), [pothis, baniListData]);
  const bundled = useMemo(() => rows.filter((row) => row.system), [rows]);
  // A PINNED pothi is anchored: it is not in the draggable list at all.
  //
  // Withholding its drag handle was not enough. It still sat inside
  // DraggableFlatList's data, so another row could be dragged over or past it
  // and the pinned block visibly moved — then snapped back on the next render,
  // because `listPothis` re-anchors pinned to the top and only unpinned ids are
  // saved. Keeping them in a separate, non-draggable block means the drag
  // cannot reach them and there is nothing to snap back.
  const pinned = useMemo(() => rows.filter((row) => !row.system && row.pinned), [rows]);
  const mine = useMemo(() => rows.filter((row) => !row.system && !row.pinned), [rows]);

  // A pothi's banis open on their own screen, in the ordinary All Banis list,
  // so a bani inside a pothi behaves exactly as it does anywhere else — the
  // same rows, the same press, the same reader. The title is resolved here
  // because only this side knows whether the name is a bundled folder's ASCII
  // or something the user typed; see usePothiTitle.
  const openPothi = useCallback(
    (row) => {
      trackPothiEvent("opened", { size: row.count, system: row.system });
      onOpenPothi({
        data: resolveBanis(row.baniIds, baniListData),
        title: titleFor(row),
        titleVariant: variantFor(row),
        // Only a user pothi is editable; a bundled folder sends none.
        pothiId: row.system ? null : row.id,
      });
    },
    [baniListData, onOpenPothi, titleFor, variantFor]
  );

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

  const renderPothi = useCallback(
    (row, { drag = null } = {}) => (
      <PothiRow
        pothi={row}
        onOpen={() => openPothi(row)}
        onTogglePin={row.system ? null : () => togglePin(row)}
        onLongPress={
          row.system
            ? null
            : () => {
                if (requireOnline()) setActing(row);
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
      />
    ),
    [openPothi, togglePin, requireOnline, layout, c]
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
      {/* No local requireOnline() wrapper: onCreatePress (usePothiActions'
          openCreate) already does its own complete gating — sign-in first
          (redirecting to Settings), then connectivity. */}
      <NewPothiRow onPress={onCreatePress} />

      {/* The pinned block, above the draggable list and outside it. Rendered
          with the same row and the same separators, so it reads as one list —
          it simply cannot be dragged, which is what being pinned means. */}
      {pinned.map((row, index) => (
        <View key={row.id}>
          {index > 0 && <ListSeparator />}
          {renderPothi(row)}
        </View>
      ))}
      {pinned.length > 0 && mine.length > 0 && <ListSeparator />}
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
        {sectionLabel(STRINGS.POTHI_DEFAULT_FOLDERS)}
        {bundled.map((row, index) => (
          <View key={row.id}>
            {index > 0 && <ListSeparator />}
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
        // `data` is the unpinned lane only, so the result needs no filtering:
        // a pinned pothi is never in this list to be moved in the first place.
        onDragEnd={({ data }) => {
          if (!requireOnline()) return;
          const next = data.map((row) => row.id);
          trackPothiEvent("reordered", { count: next.length });
          dispatch(actions.setPothiOrder(next));
        }}
        activationDistance={12}
        renderItem={({ item, drag }) => (
          <ScaleDecorator>{renderPothi(item, { drag })}</ScaleDecorator>
        )}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        // No `style` prop: DraggableFlatList forwards it to an inner animated
        // wrapper, and a flex there fights the gesture root above, collapsing
        // the list to zero height — which rendered a blank page. The root
        // carries the flex, exactly as EditBaniOrder does.
        contentContainerStyle={{ paddingBottom: layout.screenPaddingBottom }}
        // The app's own themed scrollbar, the same one the bani list and
        // Settings draw. DraggableFlatList keeps its own `onScroll`, so this is
        // the offset-reporting form of the shared hook — see useCustomScrollbar.
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...ownedScrollProps}
      />
      {Indicator}
      {/* Adding banis is NOT offered here. A pothi's contents are edited from
          its own screen's overflow, where the list you are changing is in front
          of you — see FolderScreen. */}
      <PothiActionsSheet pothi={acting} visible={acting !== null} onClose={() => setActing(null)} />
    </GestureHandlerRootView>
  );
};

PothiList.propTypes = {
  /** Rows from `useBaniList()` — the source for both bundled folders and id lookup. */
  baniListData: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  /** Opens a pothi's banis on their own screen. */
  onOpenPothi: PropTypes.func.isRequired,
  onCreatePress: PropTypes.func.isRequired,
  /** Called instead of pinning when the user is already at the ceiling. */
  onPinLimit: PropTypes.func.isRequired,
};

export default PothiList;
