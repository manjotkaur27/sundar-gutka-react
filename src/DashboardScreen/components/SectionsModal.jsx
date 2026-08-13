import React, { useState, useEffect, useCallback } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import DraggableFlatList, {
  ShadowDecorator,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { ChevronRight, DragHandleIcon, EyeIcon } from "@common/icons";
import { CustomText, STRINGS, constant, actions, showErrorToast } from "@common";
import useDashboardTheme from "./dashboardTheme";
import { sectionLabel } from "./sectionRegistry";
import SheetModal from "./SheetModal";

// The Dashboard's section list, in two views.
//
// BROWSE is what opens: a plain list of the sections on the page, and tapping
// one closes the sheet and takes you to it. That is what this sheet is for most
// of the time — the page is long, and scrolling to the calendar was the only
// way to reach it.
//
// EDIT is the old sheet, reached by the button in the header: press and hold to
// reorder, and an eye to show or hide. Rearranging your dashboard is a rare,
// deliberate act, so it no longer greets everyone who wants to jump to
// Reminders.
const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  container: { flex: 1 },
  listContent: { padding: 20, paddingTop: 6, paddingBottom: 24 },
  listWrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  // Wraps onto a second line rather than clipping — "Customize Layout"
  // reduced to "Customi…" no longer names the sheet you are looking at.
  // `flex: 1` already keeps it clear of Cancel and Save, so a taller title
  // only makes the header taller.
  headerTitle: { flex: 1, fontSize: 17, textAlign: "center", paddingHorizontal: 8 },
  // 44pt minimum touch targets on both header controls.
  headerBtn: { minHeight: 44, minWidth: 60, justifyContent: "center" },
  headerBtnEnd: { alignItems: "flex-end" },
  action: { fontSize: 15 },
  saveBtn: {
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // See EditBanisModal: colour comes from c.onAccent at render.
  saveText: { fontSize: 15 },
  pressed: { opacity: 0.7 },
  hint: { fontSize: 12, paddingHorizontal: 20, paddingTop: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    // A solid 1dp, not a hairline: on a non-integer density a hairline rounds
    // to zero on alternate rows, so half the rules simply vanish.
    borderBottomWidth: 1,
  },
  // A minimum, so a long translation makes the row taller rather than clipping.
  browseRow: { minHeight: 56 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  // The eye is its own target inside a row that is itself draggable, so it
  // needs a full-size box of its own rather than relying on the glyph.
  eyeBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  resetBtn: { alignItems: "center", paddingVertical: 18 },
  resetText: { fontSize: 14 },
});

const SectionsModal = ({ visible, onClose, onSelectSection }) => {
  const { cardBg, accentBlue, primaryText, mutedText, separator, theme, c, palette } =
    useDashboardTheme();
  // Explicit fontFamily (no fontWeight alongside it) — pairing a numeric
  // fontWeight with a custom TTF makes Android synthesize a fake bold and
  // silently fall back off the real glyph, which was making the title/Save
  // text render in the system font instead of Baloo Paaji.
  const boldFont = theme.typography.fonts.balooPaajiSemiBold;
  const dispatch = useDispatch();
  const layout = useSelector((state) => state.dashboardLayout);

  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState(layout.order);
  // Measured space left for the list once the header and hint have taken theirs.
  const [listHeight, setListHeight] = useState(0);
  const onListWrapLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    setListHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, []);
  const [hidden, setHidden] = useState(layout.hidden);

  // A reopened sheet starts in BROWSE with the saved layout, so an abandoned
  // edit is never waiting where a jump was expected.
  useEffect(() => {
    if (visible) {
      setEditing(false);
      setOrder(layout.order);
      setHidden(layout.hidden);
    }
  }, [visible, layout]);

  const visibleCount = order.filter((k) => !hidden.includes(k)).length;

  const toggleHidden = useCallback(
    (key) => {
      setHidden((prev) => {
        if (prev.includes(key)) return prev.filter((k) => k !== key);
        // Enforce minimum visible sections.
        if (visibleCount <= constant.DASHBOARD_MIN_VISIBLE) {
          showErrorToast(`Keep at least ${constant.DASHBOARD_MIN_VISIBLE} sections visible`);
          return prev;
        }
        return [...prev, key];
      });
    },
    [visibleCount]
  );

  const save = useCallback(() => {
    dispatch(actions.setDashboardLayout({ order, hidden }));
    setEditing(false);
  }, [order, hidden, dispatch]);

  const reset = useCallback(() => {
    dispatch(actions.resetDashboardLayout());
    setEditing(false);
  }, [dispatch]);

  // Only what is actually ON the page can be jumped to, so browse lists the
  // visible sections in their rendered order — the same list the Dashboard
  // maps over. A hidden section has nowhere to scroll to.
  const browsable = layout.order.filter((key) => !layout.hidden.includes(key));

  const renderItem = useCallback(
    ({ item: key, drag, isActive }) => {
      const isVisible = !hidden.includes(key);
      return (
        <ShadowDecorator>
          <ScaleDecorator>
            {/* Long-press anywhere on the row to pick it up and drag (same gesture
                as Edit Bani Order). Rows render flat on the screen background with
                a subtle divider — no card rectangle. The eye handles its own taps. */}
            <Pressable
              onLongPress={drag}
              disabled={isActive}
              delayLongPress={150}
              style={[
                styles.row,
                { borderBottomColor: palette.listDivider },
                isActive && { backgroundColor: cardBg, borderBottomColor: "transparent" },
              ]}
            >
              <DragHandleIcon color={mutedText} />
              <CustomText
                style={[styles.rowLabel, { color: isVisible ? primaryText : mutedText }]}
                numberOfLines={2}
              >
                {sectionLabel(key)}
              </CustomText>
              {/* An eye rather than a switch: a switch is a setting you leave
                  on or off, and this is one row's visibility among many. The
                  struck-through eye says "hidden" without depending on colour. */}
              <Pressable
                onPress={() => toggleHidden(key)}
                hitSlop={8}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityState={{ selected: isVisible }}
                accessibilityLabel={`${sectionLabel(key)}, ${
                  isVisible ? STRINGS.SECTION_HIDE : STRINGS.SECTION_SHOW
                }`}
              >
                <EyeIcon size={22} off={!isVisible} color={isVisible ? accentBlue : mutedText} />
              </Pressable>
            </Pressable>
          </ScaleDecorator>
        </ShadowDecorator>
      );
    },
    [hidden, cardBg, mutedText, primaryText, accentBlue, palette, toggleHidden]
  );

  const header = editing ? (
    <View style={[styles.header, { borderBottomColor: separator }]}>
      <Pressable onPress={() => setEditing(false)} style={styles.headerBtn} hitSlop={8}>
        <CustomText style={[styles.action, { color: mutedText }]}>{STRINGS.CANCEL}</CustomText>
      </Pressable>
      <CustomText
        style={[styles.headerTitle, { color: primaryText, fontFamily: boldFont }]}
        numberOfLines={2}
      >
        {STRINGS.CUSTOMIZE_LAYOUT}
      </CustomText>
      {/* Primary action, styled as a button — matches Edit Banis. */}
      <Pressable
        onPress={save}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: accentBlue },
          pressed && styles.pressed,
        ]}
        hitSlop={8}
      >
        <CustomText style={[styles.saveText, { fontFamily: boldFont, color: c.onAccent }]}>
          {STRINGS.SAVE}
        </CustomText>
      </Pressable>
    </View>
  ) : (
    <View style={[styles.header, { borderBottomColor: separator }]}>
      <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
        <CustomText style={[styles.action, { color: mutedText }]}>{STRINGS.CANCEL}</CustomText>
      </Pressable>
      <CustomText
        style={[styles.headerTitle, { color: primaryText, fontFamily: boldFont }]}
        numberOfLines={2}
      >
        {STRINGS.SECTIONS}
      </CustomText>
      {/* Rearranging is the rarer job, so it is a quiet link here rather than
          the filled button — that weight belongs to Save, inside the edit view. */}
      <Pressable
        onPress={() => setEditing(true)}
        style={[styles.headerBtn, styles.headerBtnEnd]}
        hitSlop={8}
        accessibilityRole="button"
      >
        <CustomText style={[styles.action, { color: accentBlue, fontFamily: boldFont }]}>
          {STRINGS.EDIT}
        </CustomText>
      </Pressable>
    </View>
  );

  return (
    <SheetModal visible={visible} onClose={onClose} heightRatio={0.75}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.container}>
          {header}

          <CustomText style={[styles.hint, { color: mutedText }]}>
            {editing ? STRINGS.DRAG_TO_REORDER : STRINGS.SECTIONS_HINT}
          </CustomText>

          {/* DraggableFlatList needs an EXPLICIT height. Inside a Modal a
              flex:1 chain does not resolve reliably — the list measured zero
              and rendered nothing — so this wrapper is measured and the height
              handed to the list directly. The list is withheld until that
              first layout arrives rather than mounted at zero height. */}
          <View style={styles.listWrap} onLayout={onListWrapLayout}>
            {listHeight > 0 && editing ? (
              <DraggableFlatList
                data={order}
                keyExtractor={(key) => key}
                renderItem={renderItem}
                onDragEnd={({ data }) => setOrder(data)}
                style={{ height: listHeight }}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={
                  <Pressable onPress={reset} style={styles.resetBtn} hitSlop={6}>
                    <CustomText style={[styles.resetText, { color: mutedText }]}>
                      {STRINGS.RESET_TO_DEFAULT}
                    </CustomText>
                  </Pressable>
                }
              />
            ) : null}

            {/* Browse needs no drag gesture and no measured height, so it is an
                ordinary ScrollView rather than a second draggable list. */}
            {!editing ? (
              <ScrollView contentContainerStyle={styles.listContent}>
                {browsable.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => onSelectSection(key)}
                    style={({ pressed }) => [
                      styles.row,
                      styles.browseRow,
                      { borderBottomColor: palette.listDivider },
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <CustomText style={[styles.rowLabel, { color: primaryText }]} numberOfLines={2}>
                      {sectionLabel(key)}
                    </CustomText>
                    <ChevronRight size={20} color={mutedText} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </GestureHandlerRootView>
    </SheetModal>
  );
};

SectionsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  /** Closes the sheet and takes the reader to that section on the page. */
  onSelectSection: PropTypes.func.isRequired,
};

export default SectionsModal;
