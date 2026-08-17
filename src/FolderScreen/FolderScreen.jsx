import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@rneui/themed";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { PlusIcon } from "@common/icons";
import { isDefaultPothi } from "@common/pothi/model";
import { resolveBanis } from "@common/pothi/selectors";
import {
  actions,
  BaniList,
  constant,
  GradientDivider,
  SafeArea,
  showConfirm,
  StatusBarComponent,
  STRINGS,
} from "@common";
import { Button, Row, ScreenHeader, Sheet, Text } from "../common/components/ui";
import { useBaniList } from "../HomeScreen/hooks";
import AddBanisSheet from "../Pothi/components/AddBanisSheet";
import BaniPickRow from "../Pothi/components/BaniPickRow";
import PothiActionsSheet from "../Pothi/components/PothiActionsSheet";
import useDeletePothi from "../Pothi/hooks/useDeletePothi";
import useRequireOnline from "../Pothi/hooks/useRequireOnline";

// Migrated onto the design system. The separate `header.js` and `styles.js` are
// deleted: the header is now the shared `ScreenHeader`, which centres its title
// exactly as this screen's own header did.
//
// Two defects went with them. The old header positioned the back arrow
// absolutely over the title and compensated with 48pt of padding plus
// `numberOfLines={1}`, so a long Gurmukhi folder title truncated; the shared
// header lays out in columns that cannot collide, so the title wraps instead.
// And the status bar was painted `colors.primary` (navy) while the header
// underneath it was `colors.surface` (white) — a mismatched strip in light
// mode.

const FolderScreen = ({ navigation, route }) => {
  const { c, layout, space, radii } = useTokens();
  const dispatch = useDispatch();
  const { navigate } = navigation;
  // `baniTitle` is the GurbaniAkhar face, right for a bundled folder whose name
  // is ASCII-encoded Gurmukhi and wrong for a pothi the user typed. The caller
  // has already resolved the string, so it says which face it wants rather than
  // this screen guessing from the text.
  const { data, title, titleVariant = "baniTitle", pothiId = null } = route.params.params;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  // Non-null puts the screen in delete-selection mode; the Set holds bani ids.
  const [picked, setPicked] = useState(null);
  const { baniListData } = useBaniList();
  // The same confirm-then-delete the Folders tab's long-press raises. See
  // useDeletePothi — one implementation, so the two cannot word it differently.
  const confirmDeletePothi = useDeletePothi();
  // Every action on this screen writes to the pothi, and a signed-out or
  // offline user has nowhere to write to. The Folders tab has gated its
  // long-press, pin and reorder since they were built; this screen — which is
  // where a pothi is ACTUALLY edited — was gating none of its four, and
  // "Delete Banis" reached `removeBaniFromPothi` with no check at all.
  const requireOnline = useRequireOnline();

  // A USER pothi's contents are read live from the store, not from the route.
  // Route params are a snapshot taken when the screen was pushed, so a bani
  // added or removed by the sheet below would not appear until the user backed
  // out and came in again. A bundled Sundar Gutka folder has no pothiId and is
  // fixed, so it keeps the rows it was handed.
  const pothi = useSelector((state) =>
    pothiId ? (state.pothis?.folders ?? []).find((f) => f.id === pothiId) : null
  );
  const isDefault = useSelector((state) => isDefaultPothi(state.pothis, pothiId));
  const rows = useMemo(
    () =>
      pothi
        ? resolveBanis(
            pothi.items.map((item) => item.baaniId),
            baniListData
          )
        : data,
    [pothi, baniListData, data]
  );

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const selecting = picked !== null;
  const allPicked = selecting && rows.length > 0 && rows.every((b) => picked.has(b.id));

  const togglePick = useCallback((id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirmRemove = useCallback(() => {
    const ids = [...picked];
    if (ids.length === 0) return;
    showConfirm({
      title: STRINGS.POTHI_DELETE_BANIS,
      // Says plainly that the bani itself survives — a folder of scripture
      // appearing to be deleted is alarming enough to spell out.
      message: STRINGS.formatString(STRINGS.POTHI_DELETE_BANIS_CONFIRM, { count: ids.length }),
      cancelText: STRINGS.CANCEL,
      confirmText: STRINGS.POTHI_DELETE,
      destructive: true,
      // Checked again HERE, not only on the tap that opened selection mode.
      // Picking banis takes as long as the user likes, and a connection can go
      // in that time — the answer that matters is the one at the moment of the
      // write. This is the dispatch that was running ungated.
      onConfirm: () => {
        if (!requireOnline()) return;
        ids.forEach((id) => dispatch(actions.removeBaniFromPothi(pothiId, id)));
        setPicked(null);
      },
    });
  }, [picked, dispatch, pothiId, requireOnline]);

  const onPress = (row) => {
    const { item } = row;
    const { id, gurmukhi, gurmukhiUni } = item;
    dispatch(actions.toggleAudio(false));
    navigate(constant.READER, {
      key: `Reader-${id}`,
      // Pass titleUni too (like HomeScreen) so the Reader header renders proper
      // Gurmukhi under the Unicode font instead of raw ASCII GurbaniAkhar text.
      params: { id, title: gurmukhi, titleUni: gurmukhiUni },
    });
  };

  // Selecting → a delete button carrying the count, exactly as ManageDownloads
  // does. Otherwise the overflow, and only for a pothi the user owns.
  const headerAction = () => {
    if (selecting) {
      return (
        <Pressable
          onPress={confirmRemove}
          disabled={picked.size === 0}
          accessibilityRole="button"
          accessibilityLabel={`${STRINGS.POTHI_DELETE} (${picked.size})`}
          hitSlop={layout.hitSlop}
          style={{
            minWidth: layout.touchTarget,
            minHeight: layout.touchTarget,
            alignItems: "center",
            justifyContent: "center",
            opacity: picked.size === 0 ? 0.4 : 1,
          }}
        >
          <Icon
            name="delete-outline"
            type="material-community"
            size={layout.icon.md}
            color={c.error}
          />
        </Pressable>
      );
    }
    if (!pothi) return null;
    return (
      <Pressable
        onPress={() => setMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.POTHI_MORE_ACTIONS}
        hitSlop={layout.hitSlop}
        style={{
          minWidth: layout.touchTarget,
          minHeight: layout.touchTarget,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name="dots-vertical"
          type="material-community"
          size={layout.icon.md}
          color={c.textPrimary}
        />
      </Pressable>
    );
  };

  // A pothi the user has emptied, or one created without picking anything.
  //
  // Centred in the body rather than pinned under the header: an empty screen has
  // nothing to read past, so the message belongs where the eye already is. The
  // action repeats what the overflow offers, because an empty screen's whole job
  // is to offer the one thing that fills it — and a bundled Sundar Gutka folder
  // is never the user's to fill, so it gets the message without the button.
  const readingBody =
    rows.length === 0 ? (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: space.lg,
          padding: layout.screenGutter,
        }}
      >
        <Text variant="subheading" align="center">
          {STRINGS.POTHI_NO_BANIS}
        </Text>
        {pothi ? (
          <Button
            title={STRINGS.POTHI_ADD_BANIS}
            // `ghost`, whose foreground IS `accent` — so the glyph takes the
            // same colour the label does without restating the button's own
            // role resolution here. It also matches the "+ New Pothi" row on
            // the Folders tab, which is the same offer one level up.
            variant="ghost"
            icon={<PlusIcon size={layout.icon.sm} color={c.accent} />}
            // The same offer as the overflow's "Add Banis", so the same gate.
            onPress={() => {
              if (requireOnline()) setEditing(true);
            }}
            // Button sets `alignSelf: "flex-start"` on itself, and a child's
            // own alignSelf beats the parent's alignItems — so the column
            // centring the message above had no effect on it.
            style={{ alignSelf: "center" }}
          />
        ) : null}
      </View>
    ) : (
      <BaniList data={rows} onPress={onPress} />
    );

  return (
    // `backgroundAlt` and no bottom navigation, exactly as ManageDownloads and
    // the other pushed utility screens: this is a destination reached from a
    // list, not one of the four tabs, so a tab bar here offers a way "back" that
    // is not the one the user took to get in.
    <SafeArea backgroundColor={c.backgroundAlt} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor={c.backgroundAlt} />
      <View style={{ flex: 1, backgroundColor: c.backgroundAlt }}>
        <ScreenHeader
          title={title}
          titleVariant={titleVariant}
          showBorder={false}
          // Selecting: Back leaves the selection rather than the screen, so the
          // mode is always escapable without losing your place.
          onBack={() => (selecting ? setPicked(null) : navigation.goBack())}
          backAccessibilityLabel={STRINGS.GO_BACK}
          // Editing is offered only for a user's own pothi. A bundled folder is
          // Sundar Gutka's, and its contents are not the user's to change.
          actions={headerAction()}
        />
        <GradientDivider />

        {selecting ? (
          <>
            {/* The selection bar, built to ManageDownloads' own measurements —
                master tick on the left aligned to the rows' checkbox column,
                the count on the right. It was a bare padded label before, which
                is why the spacing did not match and there was no sign of how
                many were selected. */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: space.sm,
                paddingHorizontal: layout.row.paddingHorizontal,
                paddingVertical: space.sm,
                backgroundColor: c.backgroundAlt,
              }}
            >
              <Pressable
                onPress={() => setPicked(allPicked ? new Set() : new Set(rows.map((b) => b.id)))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allPicked }}
                accessibilityLabel={allPicked ? STRINGS.DESELECT_ALL : STRINGS.SELECT_ALL}
                hitSlop={layout.hitSlop}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: layout.touchTarget,
                  flexShrink: 1,
                }}
              >
                <View
                  style={{
                    width: layout.checkbox,
                    height: layout.checkbox,
                    borderRadius: radii.sm,
                    borderWidth: layout.borderWidth.thick,
                    borderColor: c.accent,
                    backgroundColor: allPicked ? c.accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: space.md,
                    flexShrink: 0,
                  }}
                >
                  {allPicked && (
                    <Icon name="check" type="material" size={layout.icon.xs} color={c.onAccent} />
                  )}
                </View>
                <Text variant="body" style={{ flexShrink: 1 }}>
                  {allPicked ? STRINGS.DESELECT_ALL : STRINGS.SELECT_ALL}
                </Text>
              </Pressable>

              {/* Numerals only — nothing to translate, and it reads the same in
                  every language. */}
              <Text variant="caption" color="textSecondary" style={{ flexShrink: 1 }}>
                {`${picked.size} / ${rows.length}`}
              </Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: layout.screenPaddingBottom }}>
              {rows.map((bani) => (
                <BaniPickRow
                  key={bani.id}
                  title={bani.gurmukhiUni || bani.gurmukhi}
                  checked={picked.has(bani.id)}
                  onPress={() => togglePick(bani.id)}
                />
              ))}
            </ScrollView>
          </>
        ) : (
          readingBody
        )}
      </View>

      {/* The overflow's actions.
          Built from the SAME parts every Settings chooser uses — the `flush`
          sheet and the shared `Row` with its divider — rather than a hand-rolled
          list of Pressables, which is why this one had no separators while every
          other sheet in the app did. Each action hands off to the control that
          already owns that job. */}
      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={title} variant="flush">
        {[
          { label: STRINGS.POTHI_ADD_BANIS, run: () => setEditing(true) },
          { label: STRINGS.POTHI_RENAME, run: () => setRenaming(true) },
          {
            label: STRINGS.POTHI_DELETE_BANIS,
            // Red like the delete below it: both remove something, and a row
            // that removes should not read as the same kind of action as "Add
            // banis" or "Rename", which only ever add or relabel. What separates
            // the two deletes is order and wording, not colour — this one edits
            // the contents, the last one destroys the pothi itself.
            destructive: true,
            run: () => setPicked(new Set()),
          },
          // Morning and Evening Nitnem are not offered a delete at all — see
          // PothiActionsSheet for why. Filtered out rather than disabled: a
          // greyed row invites a tap and then explains nothing.
          ...(isDefault
            ? []
            : [
                {
                  label: STRINGS.POTHI_DELETE_POTHI,
                  // Last, and the heavier of the two deletes — it destroys the
                  // whole pothi rather than editing its contents. The confirm is
                  // raised at the app root, which is why leaving the screen
                  // straight after does not take it down with us.
                  destructive: true,
                  run: () =>
                    confirmDeletePothi({ id: pothiId, name: pothi?.name, count: rows.length }, () =>
                      navigation.goBack()
                    ),
                },
              ]),
        ].map((action) => (
          <Row
            key={action.label}
            title={action.label}
            titleStyle={action.destructive ? { color: c.error } : undefined}
            // Gated on the TAP, not when the sheet or dialog it opens is
            // finally submitted. Letting a signed-out user tick twenty banis,
            // type a new name or read through a delete confirmation and only
            // then be told none of it could be saved is the worst possible
            // moment to say so. One check here covers all four actions, so a
            // fifth cannot be added past it.
            onPress={() => {
              setMenuOpen(false);
              if (!requireOnline()) return;
              action.run();
            }}
            accessibilityRole="button"
            showDivider
          />
        ))}
      </Sheet>

      {/* The same multi-select the create flow uses: ticking adds, unticking
          removes, so one sheet covers both halves of "edit the contents". */}
      <AddBanisSheet
        pothiId={pothiId}
        visible={editing}
        onClose={() => setEditing(false)}
        baniListData={baniListData}
      />

      {/* Rename reuses the pothi actions sheet, which already owns rename and
          delete for a whole pothi — opened straight into its rename state. */}
      <PothiActionsSheet
        pothi={pothi ? { id: pothi.id, name: pothi.name, count: rows.length } : null}
        visible={renaming}
        startRenaming
        onClose={() => setRenaming(false)}
      />
    </SafeArea>
  );
};

FolderScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    setOptions: PropTypes.func,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      params: PropTypes.shape({
        data: PropTypes.arrayOf(PropTypes.shape()),
        title: PropTypes.string,
        titleVariant: PropTypes.string,
        pothiId: PropTypes.string,
      }),
    }),
  }).isRequired,
};

export default FolderScreen;
