import React, { useState, useEffect, useCallback } from "react";
import { View, Modal, Pressable, StyleSheet } from "react-native";
import DraggableFlatList, {
  ShadowDecorator,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Circle } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, actions, showErrorToast } from "@common";
import useDashboardTheme from "./dashboardTheme";
import { sectionLabel } from "./sectionRegistry";

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

const EyeOff = ({ color }) => (
  <Svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Line x1="2" y1="2" x2="22" y2="22" />
    <Line x1="6.7" y1="6.7" x2="17.9" y2="17.9" />
  </Svg>
);
EyeOff.propTypes = { color: PropTypes.string.isRequired };

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
  const { screenBg, cardBg, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
  const { top, bottom } = useSafeAreaInsets();
  const dispatch = useDispatch();
  const layout = useSelector((state) => state.dashboardLayout);

  const [order, setOrder] = useState(layout.order);
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
              {!isVisible && <EyeOff color={mutedText} />}
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: screenBg, paddingTop: top + 8 }]}>
          <View style={[styles.header, { borderBottomColor: separator }]}>
            <Pressable onPress={onClose} hitSlop={8}>
              <CustomText style={[styles.action, { color: mutedText }]}>
                {STRINGS.CANCEL}
              </CustomText>
            </Pressable>
            <CustomText style={[styles.headerTitle, { color: primaryText }]}>
              {STRINGS.CUSTOMIZE_LAYOUT}
            </CustomText>
            <Pressable onPress={save} hitSlop={8}>
              <CustomText style={[styles.action, { color: accentBlue, fontWeight: "700" }]}>
                {STRINGS.SAVE}
              </CustomText>
            </Pressable>
          </View>

          <CustomText style={[styles.hint, { color: mutedText }]}>
            {STRINGS.DRAG_TO_REORDER}
          </CustomText>

          <DraggableFlatList
            data={order}
            keyExtractor={(key) => key}
            renderItem={renderItem}
            onDragEnd={({ data }) => setOrder(data)}
            contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: bottom + 40 }}
            ListFooterComponent={
              <Pressable onPress={reset} style={styles.resetBtn} hitSlop={6}>
                <CustomText style={[styles.resetText, { color: mutedText }]}>
                  {STRINGS.RESET_TO_DEFAULT}
                </CustomText>
              </Pressable>
            }
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

LayoutEditOverlay.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  action: { fontSize: 15 },
  hint: { fontSize: 12, paddingHorizontal: 20, paddingTop: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  resetBtn: { alignItems: "center", paddingVertical: 18 },
  resetText: { fontSize: 14, fontWeight: "600" },
});

export default LayoutEditOverlay;
