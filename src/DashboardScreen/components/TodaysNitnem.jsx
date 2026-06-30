import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import Svg, { Circle, Polyline, Path, Line } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, actions, logError } from "@common";
import { getDayDetail } from "../../database/analytics";
import useDashboardTheme from "./dashboardTheme";
import EditBanisModal from "./EditBanisModal";
import SectionLabel from "./SectionLabel";
import useBaniLookup from "./useBaniLookup";

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 18 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  editLink: { fontSize: 13, fontWeight: "600" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerText: { flex: 1 },
  subtitle: { fontSize: 15, fontWeight: "500" },
  ringCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  ringNum: { fontSize: 14, fontWeight: "600" },
  ringLabel: { fontSize: 10, opacity: 0.7 },
  listDivider: { height: 1, marginVertical: 16 },
  // ~8 rows visible (4 per column) then scrolls within the card.
  gridScroll: { maxHeight: 184 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingRight: 8,
  },
  baniNamePress: { flex: 1 },
  baniName: { fontSize: 13, fontWeight: "400", flexShrink: 1 },
  actions: { flexDirection: "row", gap: 12, marginTop: 18 },
  primaryBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
});

const ProgressRing = ({ done, total, accent, track, textColor }) => {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <CustomText style={[styles.ringNum, { color: textColor }]}>
            {done}/{total}
          </CustomText>
          <CustomText style={[styles.ringLabel, { color: textColor }]}>banis</CustomText>
        </View>
      </View>
    </View>
  );
};
ProgressRing.propTypes = {
  done: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  accent: PropTypes.string.isRequired,
  track: PropTypes.string.isRequired,
  textColor: PropTypes.string.isRequired,
};

const Check = ({ filled, accent, muted }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      fill={filled ? accent : "none"}
      stroke={filled ? accent : muted}
      strokeWidth="2"
    />
    {filled ? (
      <Polyline
        points="17 9 10.5 15.5 7 12"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : null}
  </Svg>
);
Check.propTypes = {
  filled: PropTypes.bool.isRequired,
  accent: PropTypes.string.isRequired,
  muted: PropTypes.string.isRequired,
};

const PlayIcon = ({ color }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);
PlayIcon.propTypes = { color: PropTypes.string.isRequired };

const TickIcon = ({ color }) => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);
TickIcon.propTypes = { color: PropTypes.string.isRequired };

const EditIcon = ({ color }) => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <Path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
  </Svg>
);
EditIcon.propTypes = { color: PropTypes.string.isRequired };

const PlusCircle = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
    <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
PlusCircle.propTypes = { color: PropTypes.string.isRequired };

const TodaysNitnem = ({ refreshKey }) => {
  const { card, isDark, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { selectedBaniIds, completed } = useSelector((state) => state.todaysNitnem);
  const { map: baniMap, nameOf } = useBaniLookup();

  const [autoDone, setAutoDone] = useState([]);
  const [editVisible, setEditVisible] = useState(false);

  const today = todayStr();
  const manualDone = useMemo(() => completed?.[today] ?? [], [completed, today]);

  // Auto-completion: banis read/listened past threshold today (Task B/C tracking).
  useEffect(() => {
    let active = true;
    getDayDetail(today)
      .then(({ reads, listens }) => {
        if (!active) return;
        const ids = new Set();
        reads.forEach((r) => {
          if ((r.duration ?? 0) >= constant.MIN_READ_SESSION_SECONDS) ids.add(r.bani_id);
        });
        listens.forEach((l) => {
          if ((l.duration ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS) ids.add(l.bani_id);
        });
        setAutoDone([...ids]);
      })
      .catch(logError);
    return () => {
      active = false;
    };
  }, [today, refreshKey]);

  const doneSet = useMemo(() => new Set([...manualDone, ...autoDone]), [manualDone, autoDone]);
  const doneCount = selectedBaniIds.filter((id) => doneSet.has(id)).length;
  const remaining = selectedBaniIds.length - doneCount;
  const firstIncomplete = selectedBaniIds.find((id) => !doneSet.has(id));

  const openBani = useCallback(
    (id) => {
      const b = baniMap[id];
      if (!b) return;
      dispatch(actions.toggleAudio(false));
      navigation.navigate(constant.READER, {
        key: `Reader-${b.id}`,
        params: { id: b.id, title: b.gurmukhi, titleUni: b.gurmukhiUni },
      });
    },
    [baniMap, dispatch, navigation]
  );

  const toggleDone = useCallback(
    (id) => {
      dispatch(actions.toggleNitnemDone(today, id));
    },
    [dispatch, today]
  );

  const markAllDone = useCallback(() => {
    selectedBaniIds.forEach((id) => {
      if (!doneSet.has(id)) dispatch(actions.toggleNitnemDone(today, id));
    });
  }, [selectedBaniIds, doneSet, dispatch, today]);

  const subtitle =
    remaining > 0
      ? STRINGS.formatString(STRINGS.NITNEM_LEFT, { count: remaining })
      : STRINGS.ALL_DONE_TODAY;

  // Two-column grid cells: all selected banis + a trailing "Add a bani" cell.
  const cells = [...selectedBaniIds.map((id) => ({ type: "bani", id })), { type: "add" }];

  return (
    <View>
      <SectionLabel
        title={STRINGS.TODAYS_NITNEM}
        right={
          <Pressable onPress={() => setEditVisible(true)} hitSlop={8} style={styles.editRow}>
            <EditIcon color={accentBlue} />
            <CustomText style={[styles.editLink, { color: accentBlue }]}>
              {STRINGS.EDIT_BANIS}
            </CustomText>
          </Pressable>
        }
      />

      <View style={styles.wrap}>
        <View style={[card, styles.card]}>
          <View style={styles.headerRow}>
            <ProgressRing
              done={doneCount}
              total={selectedBaniIds.length}
              accent={accentBlue}
              track={isDark ? "rgba(255,255,255,0.12)" : "#e6ebf5"}
              textColor={primaryText}
            />
            <View style={styles.headerText}>
              <CustomText style={[styles.subtitle, { color: primaryText }]}>{subtitle}</CustomText>
            </View>
          </View>

          <View style={[styles.listDivider, { backgroundColor: separator }]} />

          {/* Two-column grid; shows ~8 then scrolls within the card */}
          <ScrollView
            style={styles.gridScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.grid}
          >
            {cells.map((cell) => {
              if (cell.type === "add") {
                return (
                  <Pressable key="add" style={styles.gridItem} onPress={() => setEditVisible(true)}>
                    <PlusCircle color={accentBlue} />
                    <CustomText style={[styles.baniName, { color: accentBlue }]} numberOfLines={1}>
                      {STRINGS.ADD_BANI}
                    </CustomText>
                  </Pressable>
                );
              }
              const isDone = doneSet.has(cell.id);
              return (
                <View key={cell.id} style={styles.gridItem}>
                  <Pressable onPress={() => toggleDone(cell.id)} hitSlop={6}>
                    <Check filled={isDone} accent={accentBlue} muted={mutedText} />
                  </Pressable>
                  <Pressable style={styles.baniNamePress} onPress={() => openBani(cell.id)}>
                    <CustomText
                      style={[
                        styles.baniName,
                        { color: primaryText },
                        isDone && { color: mutedText },
                      ]}
                      numberOfLines={1}
                    >
                      {nameOf(cell.id) || `Bani ${cell.id}`}
                    </CustomText>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: accentBlue }]}
              onPress={() => firstIncomplete && openBani(firstIncomplete)}
              disabled={!firstIncomplete}
            >
              <PlayIcon color="#fff" />
              <CustomText
                style={styles.primaryBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {firstIncomplete
                  ? `${STRINGS.CONTINUE} · ${nameOf(firstIncomplete) || ""}`
                      .trim()
                      .replace(/·\s*$/, "")
                  : STRINGS.CONTINUE}
              </CustomText>
            </Pressable>
            <Pressable
              style={[
                styles.secondaryBtn,
                { borderColor: isDark ? "rgba(255,255,255,0.18)" : "#d7deea" },
              ]}
              onPress={markAllDone}
            >
              <TickIcon color={accentBlue} />
              <CustomText
                style={[styles.secondaryBtnText, { color: accentBlue }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {STRINGS.MARK_DONE}
              </CustomText>
            </Pressable>
          </View>
        </View>
      </View>

      <EditBanisModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        baniMap={baniMap}
        selectedIds={selectedBaniIds}
      />
    </View>
  );
};

TodaysNitnem.propTypes = { refreshKey: PropTypes.number };
TodaysNitnem.defaultProps = { refreshKey: 0 };

export default TodaysNitnem;
