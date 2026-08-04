import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { convertToUnicode, CustomText, STRINGS, actions, logError } from "@common";
import { getBaniList } from "@database";
import useDashboardTheme from "./dashboardTheme";
import SheetModal from "./SheetModal";
import { toTitleCase } from "./useBaniLookup";

const styles = StyleSheet.create({
  // The sheet supplies a fixed, bounded height. Transfer it through this
  // wrapper so the long list consumes the remaining space and scrolls.
  container: { flex: 1 },
  listPad: { paddingBottom: 24 },
  list: { flex: 1 },
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
  headerAction: { fontSize: 15 },
  saveBtn: {
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // Colour is set at render from c.onAccent: the Save pill is filled with the
  // Dashboard blue, which is a LIGHT blue in dark mode — a hardcoded white
  // vanished on it.
  saveText: { fontSize: 15 },
  pressed: { opacity: 0.7 },
  listContent: { padding: 16 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // The card already draws the outer edge; a divider under the last row would
  // double it.
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1 },
  // No fontWeight: Baloo is a named TTF, so a weight here loses the real glyph.
  gurmukhi: { fontSize: 16 },
  translit: { fontSize: 12, marginTop: 2 },
});

const Check = ({ filled, muted, gold, tick }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      fill={filled ? gold : "none"}
      stroke={filled ? gold : muted}
      strokeWidth="2"
    />
    {filled ? (
      <Polyline
        points="17 9 10.5 15.5 7 12"
        fill="none"
        stroke={tick}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : null}
  </Svg>
);
Check.propTypes = {
  filled: PropTypes.bool.isRequired,
  muted: PropTypes.string.isRequired,
  gold: PropTypes.string.isRequired,
  /** The tick, drawn ON the filled circle — must be its contrast partner. */
  tick: PropTypes.string.isRequired,
};

const EditBanisModal = ({ visible, onClose, selectedIds }) => {
  const { cardBg, primaryText, mutedText, accentBlue, separator, gold, theme, c } =
    useDashboardTheme();
  // Explicit fontFamily and NO fontWeight beside it. Baloo ships as separate
  // named TTFs, so a numeric weight makes Android try to synthesize bold and
  // silently drop back to the system font — which is why the title and Save
  // were not rendering in Baloo Paaji.
  const boldFont = theme.typography.fonts.balooPaajiSemiBold;
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
      // Banis only. `EditBaniOrder` writes the user's FOLDERS into this same
      // redux list (`[...baniListData, ...folders]`), and a folder carries no
      // `id` — it is literally defined there as the entries whose `id` is
      // undefined. Rendering them here gave every folder row `key={undefined}`,
      // which is the "unique key prop" warning this screen was throwing, and
      // put rows in a bani picker that are not banis.
      setAllBanis(baniListRedux.filter((b) => b.id !== undefined));
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
    <SheetModal visible={visible} onClose={onClose} heightRatio={0.75}>
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: separator }]}>
          <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
            <CustomText style={[styles.headerAction, { color: mutedText }]}>
              {STRINGS.CANCEL}
            </CustomText>
          </Pressable>
          <CustomText
            style={[styles.headerTitle, { color: primaryText, fontFamily: boldFont }]}
            numberOfLines={1}
          >
            {STRINGS.EDIT_BANIS}
          </CustomText>
          {/* Save is the primary action, so it reads as a button rather than as
              a second piece of plain text weighing the same as Cancel. */}
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

        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, styles.listPad]}
        >
          {/* Rows sit on a card, as every other dashboard list does, instead of
              floating flat on the screen background. */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: separator }]}>
            {allBanis.map((b, i) => {
              const isPicked = picked.includes(b.id);
              return (
                <Pressable
                  key={b.id}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: separator },
                    i === allBanis.length - 1 && styles.rowLast,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggle(b.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isPicked }}
                >
                  <Check filled={isPicked} muted={mutedText} gold={gold} tick={c.onGold} />
                  <View style={styles.rowText}>
                    {/* Some banis (Amrit Bani, Bhagat Bani, 22 Vaaran,
                        Savaiye) carry no GurmukhiUni in the database, which
                        rendered their Gurmukhi line blank. Fall back to
                        converting the ASCII Gurmukhi, the same way the home
                        bani list does. */}
                    <CustomText style={[styles.gurmukhi, { color: primaryText }]} numberOfLines={1}>
                      {b.gurmukhiUni || convertToUnicode(b.gurmukhi)}
                    </CustomText>
                    {b.translit ? (
                      <CustomText style={[styles.translit, { color: mutedText }]} numberOfLines={1}>
                        {toTitleCase(b.translit)}
                      </CustomText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SheetModal>
  );
};

EditBanisModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default EditBanisModal;
