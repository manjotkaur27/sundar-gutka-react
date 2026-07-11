import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import Svg, { Circle, Polyline, Path, Line } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, actions, logError } from "@common";
import { getDayDetail } from "../../database/analytics";
import DashboardCard from "./DashboardCard";
import useDashboardTheme from "./dashboardTheme";
import EditBanisModal from "./EditBanisModal";
import SectionLabel from "./SectionLabel";
import useBaniLookup from "./useBaniLookup";

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate(),
  ).padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 18 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  editLink: { fontSize: 13, fontWeight: "600" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerText: { flex: 1 },
  subtitle: { fontSize: 17 },
  ringCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  ringNum: { fontSize: 15 },
  ringLabel: { fontSize: 10 },
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
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, flexShrink: 1 },
});

// Builds a filled "rounded annulus sector" — the progress fill as its own
// shape (outer arc + inner arc + 4 small corner fillets of radius `capR`)
// instead of a stroked circle. Unlike strokeLinecap="round" (always exactly
// stroke/2), this corner radius is independent of the bar's thickness — set
// it below stroke/2 for a flat-topped end with softened corners.
const buildRoundedArcPath = (cx, cy, r, stroke, startDeg, endDeg, capR) => {
  const outerR = r + stroke / 2;
  const innerR = r - stroke / 2;
  const toXY = (deg, radius) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
  };
  const span = endDeg - startDeg;
  // Shrink the corner radius if the arc is too short to fit two fillets.
  const maxCapR = (span * innerR * Math.PI) / 360;
  const safeCapR = Math.max(0, Math.min(capR, maxCapR * 0.85));
  const outerInset = (safeCapR / outerR) * (180 / Math.PI);
  const innerInset = (safeCapR / innerR) * (180 / Math.PI);

  const pOuterStart = toXY(startDeg + outerInset, outerR);
  const pOuterEnd = toXY(endDeg - outerInset, outerR);
  const pOuterFlatStart = toXY(startDeg, outerR - safeCapR);
  const pOuterFlatEnd = toXY(endDeg, outerR - safeCapR);
  const pInnerFlatStart = toXY(startDeg, innerR + safeCapR);
  const pInnerFlatEnd = toXY(endDeg, innerR + safeCapR);
  const pInnerStart = toXY(startDeg + innerInset, innerR);
  const pInnerEnd = toXY(endDeg - innerInset, innerR);
  const largeArc = span > 180 ? 1 : 0;

  return [
    `M ${pOuterStart.x} ${pOuterStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${pOuterEnd.x} ${pOuterEnd.y}`,
    `A ${safeCapR} ${safeCapR} 0 0 1 ${pOuterFlatEnd.x} ${pOuterFlatEnd.y}`,
    `L ${pInnerFlatEnd.x} ${pInnerFlatEnd.y}`,
    `A ${safeCapR} ${safeCapR} 0 0 1 ${pInnerEnd.x} ${pInnerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${pInnerStart.x} ${pInnerStart.y}`,
    `A ${safeCapR} ${safeCapR} 0 0 1 ${pInnerFlatStart.x} ${pInnerFlatStart.y}`,
    `L ${pOuterFlatStart.x} ${pOuterFlatStart.y}`,
    `A ${safeCapR} ${safeCapR} 0 0 1 ${pOuterStart.x} ${pOuterStart.y}`,
    "Z",
  ].join(" ");
};

const ProgressRing = ({ done, total, accent, track, numColor, labelColor, numFont }) => {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const pct = total > 0 ? done / total : 0;
  // Independent of stroke width — smaller than stroke/2 softens the corners
  // without a full round "pill" bulge. Tune this one number to taste.
  const capR = 2.5;
  const progressPath =
    pct > 0 && pct < 1 ? buildRoundedArcPath(cx, cy, r, stroke, 0, pct * 360, capR) : null;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {pct >= 1 ? (
          <Circle cx={cx} cy={cy} r={r} stroke={accent} strokeWidth={stroke} fill="none" />
        ) : null}
        {progressPath ? <Path d={progressPath} fill={accent} /> : null}
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <CustomText style={[styles.ringNum, { color: numColor, fontFamily: numFont }]}>
            {done}/{total}
          </CustomText>
          <CustomText style={[styles.ringLabel, { color: labelColor }]}>banis</CustomText>
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
  numColor: PropTypes.string.isRequired,
  labelColor: PropTypes.string.isRequired,
  numFont: PropTypes.string.isRequired,
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

// Bare checkmark (no ring) for the "Mark done" button — distinct from the
// filled-circle Check used per-bani in the grid above.
const CheckIcon = ({ color }) => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);
CheckIcon.propTypes = { color: PropTypes.string.isRequired };

const PlayIcon = ({ color }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);
PlayIcon.propTypes = { color: PropTypes.string.isRequired };

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

// Small counts only (realistic Nitnem list size); falls back to the numeral past 20.
const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];
const numberToWords = (n) => ONES[n] ?? String(n);

const TodaysNitnem = ({ refreshKey }) => {
  const { isDark, accentBlue: baseAccentBlue, mutedText, separator, theme } = useDashboardTheme();
  // Matches the username/streak accent color (blue in light, off-white in dark).
  const accentTextColor = isDark ? "#E8EEF7" : "#133a78";
  // Client-specified "light blue" accent for this section in dark mode only —
  // scoped locally rather than changing the shared accentBlue theme value,
  // which every other dashboard section also relies on.
  const accentBlue = isDark ? "#5A99FD" : baseAccentBlue;
  const boldFont = theme.typography.fonts.balooPaajiSemiBold;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { selectedBaniIds, completed } = useSelector((state) => state.todaysNitnem);
  const { map: baniMap, nameOf } = useBaniLookup();

  const [editVisible, setEditVisible] = useState(false);

  const today = todayStr();

  // Single source of truth for what's done today: the persisted `completed`
  // list. It holds both manual ticks (TOGGLE_NITNEM_DONE) and auto-detected
  // 95%-scroll reads (folded in by markNitnemAutoDone below), so a manual
  // un-tick actually sticks instead of being re-added from a live DB read.
  const doneSet = useMemo(() => new Set(completed?.[today] ?? []), [completed, today]);

  // Auto-completion is 95%-scroll ONLY. useReadingSession marks a read
  // `completed` once the scroll crosses 95% — and with audio sync-scroll on,
  // the text auto-scrolls as it plays, so listening to the end hits 95% and
  // records a read completion too. There is deliberately no separate
  // listen-duration path. Detected ids are merged into the persisted `completed`
  // list (so they survive reinstall + cloud sync); markNitnemAutoDone never
  // resurrects an id the user has since manually un-ticked (see autoSeeded).
  useEffect(() => {
    let active = true;
    getDayDetail(today)
      .then(({ reads }) => {
        if (!active) return;
        const ids = reads.filter((r) => r.completed).map((r) => r.bani_id);
        if (ids.length > 0) dispatch(actions.markNitnemAutoDone(today, ids));
      })
      .catch(logError);
    return () => {
      active = false;
    };
  }, [today, refreshKey, dispatch]);
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
    [baniMap, dispatch, navigation],
  );

  // English spells the count out ("two banis left"); other languages keep the
  // numeral since spelled-out numbers need per-language translation we don't have.
  const isEnglish = STRINGS.getLanguage() === "en-US";
  const rawSubtitle =
    remaining > 0
      ? STRINGS.formatString(STRINGS.NITNEM_LEFT, {
          count: isEnglish ? numberToWords(remaining) : remaining,
        })
      : STRINGS.ALL_DONE_TODAY;
  // numberToWords lowercases the spelled-out count ("five"), which sits first
  // in the sentence — capitalize it (no-op for a leading digit in other langs).
  const subtitle = rawSubtitle ? rawSubtitle[0].toUpperCase() + rawSubtitle.slice(1) : rawSubtitle;

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
        <DashboardCard style={styles.card}>
          <View style={styles.headerRow}>
            <ProgressRing
              done={doneCount}
              total={selectedBaniIds.length}
              accent={accentBlue}
              track={isDark ? "rgba(255,255,255,0.12)" : "#e6ebf5"}
              numColor={accentTextColor}
              labelColor={mutedText}
              numFont={boldFont}
            />
            <View style={styles.headerText}>
              <CustomText
                style={[styles.subtitle, { color: accentTextColor, fontFamily: boldFont }]}
              >
                {subtitle}
              </CustomText>
            </View>
          </View>

          <View style={[styles.listDivider, { backgroundColor: separator }]} />

          {/* Two-column grid; shows ~8 then scrolls within the card */}
          <ScrollView
            style={styles.gridScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            indicatorStyle={isDark ? "white" : "black"}
            persistentScrollbar
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
                  {/* Manual tick — toggles the bani in the same persisted
                      `completed` list the 95%-scroll auto-detection writes to,
                      so it both marks AND un-marks (incl. auto-completed banis). */}
                  <Pressable
                    hitSlop={8}
                    onPress={() => dispatch(actions.toggleNitnemDone(today, cell.id))}
                  >
                    <Check filled={isDone} accent={accentBlue} muted={mutedText} />
                  </Pressable>
                  <Pressable style={styles.baniNamePress} onPress={() => openBani(cell.id)}>
                    <CustomText
                      style={[
                        styles.baniName,
                        { color: mutedText },
                        isDone && { color: accentTextColor, fontFamily: boldFont },
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
            {/* Bulk mark-done for Nitnem completed outside the app — reuses the
                same bulk merge the 95%-scroll auto-detection writes through. */}
            <Pressable
              style={[styles.secondaryBtn, { borderColor: separator }]}
              onPress={() => dispatch(actions.markNitnemAutoDone(today, selectedBaniIds))}
            >
              <CheckIcon color={accentBlue} />
              <CustomText
                style={[styles.secondaryBtnText, { color: accentTextColor, fontFamily: boldFont }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {STRINGS.MARK_DONE}
              </CustomText>
            </Pressable>
          </View>
        </DashboardCard>
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
