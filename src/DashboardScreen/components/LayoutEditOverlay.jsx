import React, { useState, useEffect, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import DraggableFlatList, {
  ShadowDecorator,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Circle } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, actions, showErrorToast } from "@common";
import useDashboardTheme from "./dashboardTheme";
import { sectionLabel } from "./sectionRegistry";
import SheetModal from "./SheetModal";

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
  headerTitle: { flex: 1, fontSize: 17, textAlign: "center", paddingHorizontal: 8 },
  // 44pt minimum touch targets on both header controls.
  headerBtn: { minHeight: 44, minWidth: 60, justifyContent: "center" },
  action: { fontSize: 15 },
  saveBtn: {
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontSize: 15, color: "#FFFFFF" },
  pressed: { opacity: 0.7 },
  hint: { fontSize: 12, paddingHorizontal: 20, paddingTop: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  resetBtn: { alignItems: "center", paddingVertical: 18 },
  resetText: { fontSize: 14 },
});

// Drag handle (six-dot grip) — long-press anywhere on the row to reorder.
const DragHandle = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Circle cx="9" cy="6" r="1.6" />
    <Circle cx="15" cy="6" r="1.6" />
    <Circle cx="9" cy="12" r="1.6" />
    <Circle cx="15" cy="12" r="1.6" />
    <Circle cx="9" cy="18" r="1.6" />
    <Circle cx="15" cy="18" r="1.6" />
  </Svg>
);
DragHandle.propTypes = { color: PropTypes.string.isRequired };

const ThemedSwitchLite = ({ value, onToggle, accent, muted }) => (
  <Pressable
    onPress={onToggle}
    hitSlop={8}
    style={[styles.switch, { backgroundColor: value ? accent : muted }]}
  >
    <View style={[styles.knob, value && styles.knobOn]} />
  </Pressable>
);
ThemedSwitchLite.propTypes = {
  value: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  accent: PropTypes.string.isRequired,
  muted: PropTypes.string.isRequired,
};

const LayoutEditOverlay = ({ visible, onClose }) => {
  const { cardBg, accentBlue, primaryText, mutedText, separator, theme } = useDashboardTheme();
  // Explicit fontFamily (no fontWeight alongside it) — pairing a numeric
  // fontWeight with a custom TTF makes Android synthesize a fake bold and
  // silently fall back off the real glyph, which was making the title/Save
  // text render in the system font instead of Baloo Paaji.
  const boldFont = theme.typography.fonts.balooPaajiSemiBold;
  const dispatch = useDispatch();
  const layout = useSelector((state) => state.dashboardLayout);

  const [order, setOrder] = useState(layout.order);
  // Measured space left for the list once the header and hint have taken theirs.
  const [listHeight, setListHeight] = useState(0);
  const onListWrapLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    setListHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, []);
  const [hidden, setHidden] = useState(layout.hidden);

  useEffect(() => {
    if (visible) {
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
    onClose();
  }, [order, hidden, dispatch, onClose]);

  const reset = useCallback(() => {
    dispatch(actions.resetDashboardLayout());
    onClose();
  }, [dispatch, onClose]);

  const renderItem = useCallback(
    ({ item: key, drag, isActive }) => {
      const isVisible = !hidden.includes(key);
      return (
        <ShadowDecorator>
          <ScaleDecorator>
            {/* Long-press anywhere on the row to pick it up and drag (same gesture
                as Edit Bani Order). Rows render flat on the screen background with
                a subtle divider — no card rectangle. The visibility switch handles
                its own taps. */}
            <Pressable
              onLongPress={drag}
              disabled={isActive}
              delayLongPress={150}
              style={[
                styles.row,
                { borderBottomColor: separator },
                isActive && { backgroundColor: cardBg, borderBottomColor: "transparent" },
              ]}
            >
              <DragHandle color={mutedText} />
              <CustomText
                style={[styles.rowLabel, { color: isVisible ? primaryText : mutedText }]}
                numberOfLines={1}
              >
                {sectionLabel(key)}
              </CustomText>
              <ThemedSwitchLite
                value={isVisible}
                onToggle={() => toggleHidden(key)}
                accent={accentBlue}
                muted={separator}
              />
            </Pressable>
          </ScaleDecorator>
        </ShadowDecorator>
      );
    },
    [hidden, cardBg, mutedText, primaryText, accentBlue, separator, toggleHidden]
  );

  return (
    <SheetModal visible={visible} onClose={onClose} heightRatio={0.75}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.container}>
          <View style={[styles.header, { borderBottomColor: separator }]}>
            <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
              <CustomText style={[styles.action, { color: mutedText }]}>
                {STRINGS.CANCEL}
              </CustomText>
            </Pressable>
            <CustomText
              style={[styles.headerTitle, { color: primaryText, fontFamily: boldFont }]}
              numberOfLines={1}
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
              <CustomText style={[styles.saveText, { fontFamily: boldFont }]}>
                {STRINGS.SAVE}
              </CustomText>
            </Pressable>
          </View>

          <CustomText style={[styles.hint, { color: mutedText }]}>
            {STRINGS.DRAG_TO_REORDER}
          </CustomText>

          {/* DraggableFlatList needs an EXPLICIT height. Inside a Modal a
              flex:1 chain does not resolve reliably — the list measured zero
              and rendered nothing — so this wrapper is measured and the height
              handed to the list directly. The list is withheld until that
              first layout arrives rather than mounted at zero height. */}
          <View style={styles.listWrap} onLayout={onListWrapLayout}>
            {listHeight > 0 ? (
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
          </View>
        </View>
      </GestureHandlerRootView>
    </SheetModal>
  );
};

LayoutEditOverlay.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LayoutEditOverlay;
