import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Pressable, StyleSheet, PanResponder } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, logError, showInfoToast } from "@common";
import { getDailyActivity } from "../../database/analytics";
import useDashboardTheme from "./dashboardTheme";
import DayDetailModal from "./DayDetailModal";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const hasAnyActivity = (row) =>
  !!row && ((row.reading_seconds ?? 0) > 0 || (row.listening_seconds ?? 0) > 0);

const getLocalYM = () => {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() + 1 };
};
const getTodayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`;
};

// Sunday-first grid (matches the new design's S M T W T F S header).
const buildWeekRows = (year, month) => {
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};

// Heatmap bucket 0..4 from total activity seconds.
const intensity = (row) => {
  if (!row) return 0;
  const total = (row.reading_seconds ?? 0) + (row.listening_seconds ?? 0);
  if (total <= 0) return 0;
  const mins = total / 60;
  if (mins < 5) return 1;
  if (mins < 15) return 2;
  if (mins < 30) return 3;
  return 4;
};

const MonthCalendar = ({ refreshKey }) => {
  const { accentBlue, primaryText, mutedText } = useDashboardTheme();
  const todayStr = getTodayStr();
  const curYM = getLocalYM();

  const [year, setYear] = useState(curYM.year);
  const [month, setMonth] = useState(curYM.month);
  const [activityMap, setActivityMap] = useState({});
  const [modalDate, setModalDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // The PanResponder below is created once, so its handlers must read the latest
  // year/month from a ref (not a stale closure). Without this, the captured
  // forward-guard stayed false from first render and forward swipes never worked.
  const ymRef = useRef({ year, month });
  ymRef.current = { year, month };

  const prevMonth = useCallback(() => {
    const m = ymRef.current.month;
    setYear((y) => (m === 1 ? y - 1 : y));
    setMonth((mm) => (mm === 1 ? 12 : mm - 1));
  }, []);

  const nextMonth = useCallback(() => {
    const { year: y, month: m } = ymRef.current;
    const forward = y < curYM.year || (y === curYM.year && m < curYM.month);
    if (!forward) return;
    setYear((yy) => (m === 12 ? yy + 1 : yy));
    setMonth((mm) => (mm === 12 ? 1 : mm + 1));
  }, [curYM.year, curYM.month]);

  const loadActivity = useCallback(async (y, m) => {
    try {
      const rows = await getDailyActivity(y, m);
      const map = {};
      rows.forEach((r) => {
        map[r.date] = r;
      });
      setActivityMap(map);
    } catch (err) {
      logError(err);
    }
  }, []);

  useEffect(() => {
    loadActivity(year, month);
  }, [year, month, loadActivity, refreshKey]);

  // Swipe left/right to change month (design: monthly calendar swipable).
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx > 40) prevMonth();
        else if (g.dx < -40) nextMonth();
      },
    })
  ).current;

  const handleDayPress = useCallback(
    (d) => {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      // No activity on this day → quick toast instead of an empty detail sheet.
      if (!hasAnyActivity(activityMap[dateStr])) {
        showInfoToast(STRINGS.NO_ACTIVITY);
        return;
      }
      setModalDate(dateStr);
      setModalVisible(true);
    },
    [year, month, activityMap]
  );

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  const rows = buildWeekRows(year, month);

  const activeDaysCount = useMemo(
    () =>
      Object.values(activityMap).filter(
        (r) =>
          (r.reading_seconds ?? 0) >= constant.MIN_READ_SESSION_SECONDS ||
          (r.listening_seconds ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS
      ).length,
    [activityMap]
  );

  // #2669d6 = rgb(38,105,214) — the brand blue, ramped by activity level.
  const heatColor = (level) => {
    if (level === 0) return "transparent";
    const opacity = [0, 0.28, 0.5, 0.74, 1][level];
    return `rgba(38,105,214,${opacity})`;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card} {...panResponder.panHandlers}>
        <View style={styles.header}>
          <CustomText style={[styles.monthText, { color: primaryText }]}>{monthName}</CustomText>
          <CustomText style={[styles.daysCount, { color: mutedText }]}>
            {STRINGS.formatString(STRINGS.DAYS_THIS_MONTH, { count: activeDaysCount })}
          </CustomText>
        </View>

        <View style={styles.weekRow}>
          {DAY_LABELS.map((l, i) => (
            <View key={i} style={styles.cell}>
              <CustomText style={[styles.dayLabel, { color: mutedText }]}>{l}</CustomText>
            </View>
          ))}
        </View>

        {rows.map((row, ri) => (
          <View key={ri} style={styles.weekRow}>
            {row.map((d, ci) => {
              if (!d) return <View key={`e-${ci}`} style={styles.cell} />;
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(
                2,
                "0"
              )}`;
              const row2 = activityMap[dateStr];
              const level = intensity(row2);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const missed = isPast && level === 0;
              return (
                <Pressable key={d} style={styles.cell} onPress={() => handleDayPress(d)}>
                  <View
                    style={[
                      styles.dayCircle,
                      level > 0 && { backgroundColor: heatColor(level) },
                      missed && styles.missed,
                      isToday && { borderWidth: 2, borderColor: accentBlue },
                    ]}
                  >
                    <CustomText
                      style={[
                        styles.dayNum,
                        // White on a filled heat cell (incl. today); otherwise accent/muted.
                        // Same font weight as every other day so today doesn't stand out oddly.
                        {
                          color:
                            level >= 2 ? "#fff" : isToday || level > 0 ? accentBlue : mutedText,
                        },
                      ]}
                    >
                      {d}
                    </CustomText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Legend: Less ▢▢▢▢ More · Missed */}
        <View style={styles.legend}>
          <CustomText style={[styles.legendText, { color: mutedText }]}>{STRINGS.LESS}</CustomText>
          {[1, 2, 3, 4].map((l) => (
            <View key={l} style={[styles.legendBox, { backgroundColor: heatColor(l) }]} />
          ))}
          <CustomText style={[styles.legendText, { color: mutedText }]}>{STRINGS.MORE}</CustomText>
          <View style={[styles.legendDot, styles.missed]} />
          <CustomText style={[styles.legendText, { color: mutedText }]}>
            {STRINGS.MISSED}
          </CustomText>
        </View>
      </View>

      <DayDetailModal
        visible={modalVisible}
        date={modalDate}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

MonthCalendar.propTypes = { refreshKey: PropTypes.number };
MonthCalendar.defaultProps = { refreshKey: 0 };

const CIRCLE = 36;
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { paddingVertical: 4 },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  monthText: { fontSize: 20, fontWeight: "600" },
  daysCount: { fontSize: 13 },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  cell: { flex: 1, alignItems: "center", paddingVertical: 2 },
  dayLabel: { fontSize: 12, fontWeight: "500", paddingVertical: 4 },
  dayCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { fontSize: 13 },
  missed: { borderWidth: 1.5, borderColor: "rgba(150,150,150,0.45)", borderStyle: "dashed" },
  legend: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14 },
  legendText: { fontSize: 11 },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginLeft: 8 },
});

export default MonthCalendar;
