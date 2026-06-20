import React, { useState, useEffect, useCallback } from "react";
import { View, Modal, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { CustomText, STRINGS, constant, actions, showErrorToast } from "@common";
import { sectionLabel } from "./sectionRegistry";
import useDashboardTheme from "./dashboardTheme";

const ChevUp = ({ color }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="18 15 12 9 6 15" />
  </Svg>
);
ChevUp.propTypes = { color: PropTypes.string.isRequired };
const ChevDown = ({ color }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="6 9 12 15 18 9" />
  </Svg>
);
ChevDown.propTypes = { color: PropTypes.string.isRequired };

const ThemedSwitchLite = ({ value, onToggle, accent, muted }) => (
  <Pressable onPress={onToggle} hitSlop={8} style={[styles.switch, { backgroundColor: value ? accent : muted }]}>
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
  const { screenBg, card, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
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

  const move = useCallback((index, dir) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const toggleHidden = useCallback((key) => {
    setHidden((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // Enforce minimum visible sections.
      if (visibleCount <= constant.DASHBOARD_MIN_VISIBLE) {
        showErrorToast(`Keep at least ${constant.DASHBOARD_MIN_VISIBLE} sections visible`);
        return prev;
      }
      return [...prev, key];
    });
  }, [visibleCount]);

  const save = useCallback(() => {
    dispatch(actions.setDashboardLayout({ order, hidden }));
    onClose();
  }, [order, hidden, dispatch, onClose]);

  const reset = useCallback(() => {
    dispatch(actions.resetDashboardLayout());
    onClose();
  }, [dispatch, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: screenBg, paddingTop: top + 8 }]}>
        <View style={[styles.header, { borderBottomColor: separator }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <CustomText style={[styles.action, { color: mutedText }]}>{STRINGS.CANCEL}</CustomText>
          </Pressable>
          <CustomText style={[styles.headerTitle, { color: primaryText }]}>{STRINGS.CUSTOMIZE_LAYOUT}</CustomText>
          <Pressable onPress={save} hitSlop={8}>
            <CustomText style={[styles.action, { color: accentBlue, fontWeight: "700" }]}>{STRINGS.SAVE}</CustomText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom + 40, gap: 10 }}>
          {order.map((key, index) => {
            const isVisible = !hidden.includes(key);
            return (
              <View key={key} style={[card, styles.row]}>
                <View style={styles.reorder}>
                  <Pressable onPress={() => move(index, -1)} disabled={index === 0} hitSlop={6} style={index === 0 && styles.disabled}>
                    <ChevUp color={primaryText} />
                  </Pressable>
                  <Pressable onPress={() => move(index, 1)} disabled={index === order.length - 1} hitSlop={6} style={index === order.length - 1 && styles.disabled}>
                    <ChevDown color={primaryText} />
                  </Pressable>
                </View>
                <CustomText style={[styles.rowLabel, { color: primaryText }, !isVisible && { color: mutedText }]} numberOfLines={1}>
                  {sectionLabel(key)}
                </CustomText>
                <ThemedSwitchLite
                  value={isVisible}
                  onToggle={() => toggleHidden(key)}
                  accent={accentBlue}
                  muted={separator}
                />
              </View>
            );
          })}

          <Pressable onPress={reset} style={styles.resetBtn} hitSlop={6}>
            <CustomText style={[styles.resetText, { color: mutedText }]}>Reset to default</CustomText>
          </Pressable>
        </ScrollView>
      </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  reorder: { gap: 2 },
  disabled: { opacity: 0.25 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  resetBtn: { alignItems: "center", paddingVertical: 18 },
  resetText: { fontSize: 14, fontWeight: "600" },
});

export default LayoutEditOverlay;
