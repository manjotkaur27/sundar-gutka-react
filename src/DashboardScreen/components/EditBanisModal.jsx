import React, { useEffect, useState, useCallback } from "react";
import { View, Modal, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { CustomText, STRINGS, actions, logError } from "@common";
import { getBaniList } from "@database";
import useDashboardTheme, { GOLD } from "./dashboardTheme";

const Check = ({ filled, muted }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill={filled ? GOLD : "none"} stroke={filled ? GOLD : muted} strokeWidth="2" />
    {filled ? (
      <Polyline points="17 9 10.5 15.5 7 12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    ) : null}
  </Svg>
);
Check.propTypes = { filled: PropTypes.bool.isRequired, muted: PropTypes.string.isRequired };

const EditBanisModal = ({ visible, onClose, selectedIds }) => {
  const { screenBg, primaryText, mutedText, accentBlue, separator, isDark } = useDashboardTheme();
  const { top, bottom } = useSafeAreaInsets();
  const dispatch = useDispatch();
  const language = useSelector((state) => state.language);
  const baniListRedux = useSelector((state) => state.baniList);

  const [allBanis, setAllBanis] = useState([]);
  const [picked, setPicked] = useState(selectedIds);

  useEffect(() => {
    if (visible) setPicked(selectedIds);
  }, [visible, selectedIds]);

  useEffect(() => {
    if (baniListRedux?.length) {
      setAllBanis(baniListRedux);
    } else {
      getBaniList(language).then(setAllBanis).catch(logError);
    }
  }, [baniListRedux, language]);

  const toggle = useCallback((id) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const save = useCallback(() => {
    // Preserve a stable order: keep the order they appear in the bani list.
    const ordered = allBanis.filter((b) => picked.includes(b.id)).map((b) => b.id);
    dispatch(actions.setNitnemBanis(ordered.length ? ordered : picked));
    onClose();
  }, [allBanis, picked, dispatch, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={[styles.container, { backgroundColor: screenBg, paddingTop: top + 8 }]}>
        <View style={[styles.header, { borderBottomColor: separator }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <CustomText style={[styles.headerAction, { color: mutedText }]}>{STRINGS.CANCEL}</CustomText>
          </Pressable>
          <CustomText style={[styles.headerTitle, { color: primaryText }]}>{STRINGS.EDIT_BANIS}</CustomText>
          <Pressable onPress={save} hitSlop={8}>
            <CustomText style={[styles.headerAction, { color: accentBlue, fontWeight: "700" }]}>{STRINGS.SAVE}</CustomText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }}>
          {allBanis.map((b) => {
            const isPicked = picked.includes(b.id);
            return (
              <Pressable
                key={b.id}
                style={[styles.row, { borderBottomColor: separator }]}
                onPress={() => toggle(b.id)}
              >
                <Check filled={isPicked} muted={mutedText} />
                <View style={styles.rowText}>
                  <CustomText style={[styles.gurmukhi, { color: primaryText }]} numberOfLines={1}>
                    {b.gurmukhiUni}
                  </CustomText>
                  {b.translit ? (
                    <CustomText style={[styles.translit, { color: mutedText }]} numberOfLines={1}>
                      {b.translit}
                    </CustomText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

EditBanisModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  // baniMap kept for API symmetry with the caller; list is sourced independently.
  baniMap: PropTypes.object,
};

EditBanisModal.defaultProps = { baniMap: {} };

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
  headerAction: { fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  gurmukhi: { fontSize: 16, fontWeight: "500" },
  translit: { fontSize: 12, marginTop: 2 },
});

export default EditBanisModal;
