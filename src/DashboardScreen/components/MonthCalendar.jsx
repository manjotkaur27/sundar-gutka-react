import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Pressable, StyleSheet, PanResponder } from "react-native";
import Svg, { Circle } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, logError, showInfoToast } from "@common";
import { getDailyActivity, getOrCreateSummary } from "../../database/analytics";
import useDashboardTheme from "./dashboardTheme";
import DayDetailModal from "./DayDetailModal";
import SectionError from "./SectionError";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
// Fallback only — the real circle size is derived from the measured grid width
// (see `circle` below) so 7 columns always fit, on a small phone or a tablet.
const CIRCLE_FALLBACK = 36;
const CIRCLE_MIN = 26;
const CIRCLE_MAX = 40;
// Breathing room between the drawn shape and the SVG's own boundary. Without it
// a stroke/fill whose edge lands exactly on the viewport edge gets clipped by
// subpixel rounding — that was the "notched"/half-drawn circles.
const EDGE_PAD = 1.5;

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

// A dashed circle drawn as SVG, not a bordered View — RN's `borderStyle:
// "dashed"` + `borderRadius` combo doesn't render rounded corners reliably
// (Android in particular falls back to a square outline), so the "missed
// day" marker has to be an actual stroked circle instead. Used standalone
// only for the small legend swatch below.
const DashedCircle = ({ size, color, strokeWidth, dash }) => (
  <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <Circle
      cx={size / 2}
      cy={size / 2}
      r={size / 2 - strokeWidth / 2 - 0.5}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      fill="none"
    />
  </Svg>
);
DashedCircle.propTypes = {
  size: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  strokeWidth: PropTypes.number,
  dash: PropTypes.string,
};
DashedCircle.defaultProps = { strokeWidth: 1.5, dash: "4 3" };

// Every ring/fill state for a day cell (heat fill, today's accent ring, missed
// dashed ring) drawn in one SVG sharing a single cx/cy — so the fill and the
// rings are always concentric.
//
// Two things here are load-bearing and easy to regress:
//  1. NO StyleSheet.absoluteFill. absoluteFill sets top/left/right/bottom:0,
//     which stretches the SVG's LAYOUT box to the parent while the width/height
//     props define its internal viewport. When those two disagree the shapes get
//     clipped/offset — that produced the notched, half-drawn circles. The SVG is
//     positioned at top/left 0 at exactly its own size instead, and a viewBox
//     pins the coordinate space so it renders identically at any pixel density.
//  2. Everything is inset by EDGE_PAD (and rings by half their stroke on top of
//     that), so no shape's edge ever lands exactly on the viewport boundary,
//     where subpixel rounding would shave it off.
const DayMarker = ({ size, fillColor, todayColor, missedColor }) => {
  const c = size / 2;
  const fillR = c - EDGE_PAD;
  const missedR = c - EDGE_PAD - 1.5 / 2;
  const todayR = c - EDGE_PAD - 2 / 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={styles.dayMarkerSvg}
      pointerEvents="none"
    >
      {fillColor ? <Circle cx={c} cy={c} r={fillR} fill={fillColor} /> : null}
      {missedColor ? (
        <Circle
          cx={c}
          cy={c}
          r={missedR}
          stroke={missedColor}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
        />
      ) : null}
      {todayColor ? (
        <Circle cx={c} cy={c} r={todayR} stroke={todayColor} strokeWidth={2} fill="none" />
      ) : null}
    </Svg>
  );
};
DayMarker.propTypes = {
  size: PropTypes.number.isRequired,
  fillColor: PropTypes.string,
  todayColor: PropTypes.string,
  missedColor: PropTypes.string,
};
DayMarker.defaultProps = { fillColor: null, todayColor: null, missedColor: null };

const MISSED_COLOR = "rgba(150, 150, 150, 0.12)";

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
  const { accentBlue, mutedText, isDark, theme } = useDashboardTheme();
  // Real SemiBold glyph for today's number (heavier than the Regular the other
  // days use). fontWeight alone does nothing on these custom TTFs.
  const numFont = theme.typography.fonts.balooPaajiSemiBold;
  const todayStr = getTodayStr();
  const curYM = getLocalYM();

  const [year, setYear] = useState(curYM.year);
  const [month, setMonth] = useState(curYM.month);
  const [activityMap, setActivityMap] = useState({});
  const [modalDate, setModalDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Measured width of the grid, so the day circle can be sized to the column it
  // actually has to fit in. A hard-coded 36 overflowed its cell on narrow phones
  // (7 columns share the card width) and looked lost on wide ones.
  const [gridWidth, setGridWidth] = useState(0);
  // Defaults to false (suppressed) until the summary resolves — a brand-new
  // user must never see "missed" marks for days before they installed the
  // app, even briefly. An existing user just sees them pop in a beat later.
  const [hasEverBeenActive, setHasEverBeenActive] = useState(false);

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
    const rows = await getDailyActivity(y, m);
    const map = {};
    rows.forEach((r) => {
      map[r.date] = r;
    });
    setActivityMap(map);
  }, []);

  const task = useCallback(
    () => loadActivity(year, month),
    // refreshKey isn't read above but forces a refetch on screen focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadActivity, year, month, refreshKey]
  );
  const { loading, error, retry } = useAsyncSection(task);

  // Lifetime activity check (independent of the month being viewed) — used to
  // suppress "missed" marks for a user who never had any activity at all. Not
  // gated by the grid's own loading/error state: the calendar should still
  // work even if this secondary check fails. Re-checks on refreshKey (screen
  // focus) rather than once-only — the Dashboard tab stays frozen (not
  // unmounted) when you navigate away, so a one-time check taken before any
  // real activity existed would otherwise latch "false" for the rest of the
  // session even after the user has since built up history.
  useEffect(() => {
    let active = true;
    getOrCreateSummary()
      .then((s) => {
        if (active) setHasEverBeenActive((s?.total_days_active ?? 0) > 0);
      })
      .catch(logError);
    return () => {
      active = false;
    };
  }, [refreshKey]);

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
      // Future day → nothing to show yet, and nothing to say either.
      if (dateStr > todayStr) return;
      // No activity on this (past/today) day → quick toast instead of an empty detail sheet.
      if (!hasAnyActivity(activityMap[dateStr])) {
        showInfoToast(STRINGS.NO_ACTIVITY);
        return;
      }
      setModalDate(dateStr);
      setModalVisible(true);
    },
    [year, month, activityMap, todayStr]
  );

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  const monthYearLabel = `${monthName} ${year}`;
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

  // Circle sized to the column it must fit inside (7 across), clamped so it
  // stays tappable on a small phone and doesn't balloon on a tablet. Falls back
  // to the old fixed size for the very first frame, before onLayout reports.
  const circle = useMemo(() => {
    if (!gridWidth) return CIRCLE_FALLBACK;
    const column = gridWidth / 7;
    return Math.round(Math.max(CIRCLE_MIN, Math.min(CIRCLE_MAX, column - 6)));
  }, [gridWidth]);

  // #2669d6 = rgb(38,105,214) — the brand blue, ramped by activity level.
  const heatColor = (level) => {
    if (level === 0) return "transparent";
    const opacity = [0, 0.28, 0.5, 0.74, 1][level];
    return `rgba(38,105,214,${opacity})`;
  };

  // Today is always a light-blue fill + accent ring (not the activity heat fill),
  // so it reads as a distinct "today" marker regardless of how active the day is.
  const todayFill = isDark ? "rgba(90,153,253,0.22)" : "rgba(38,105,214,0.15)";

  return (
    <View style={styles.wrap}>
      <View
        style={styles.card}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.header}>
          <CustomText style={[styles.monthText, { color: isDark ? "#FFFFFF" : "#113879" }]}>
            {monthYearLabel}
          </CustomText>
          <CustomText style={[styles.daysCount, { color: mutedText }]}>
            {STRINGS.formatString(
              activeDaysCount === 1 ? STRINGS.DAY_THIS_MONTH : STRINGS.DAYS_THIS_MONTH,
              { count: activeDaysCount }
            )}
          </CustomText>
        </View>

        <View style={styles.weekRow}>
          {DAY_LABELS.map((l, i) => (
            <View key={i} style={styles.cell}>
              <CustomText style={[styles.dayLabel, { color: mutedText }]}>{l}</CustomText>
            </View>
          ))}
        </View>

        {loading
          ? Array.from({ length: 5 }).map((_, ri) => (
              <View key={ri} style={styles.weekRow}>
                {Array.from({ length: 7 }).map((_c, ci) => (
                  <View key={ci} style={styles.cell}>
                    <SkeletonBlock
                      style={{ width: circle, height: circle, borderRadius: circle / 2 }}
                    />
                  </View>
                ))}
              </View>
            ))
          : null}

        {!loading && error ? <SectionError onRetry={retry} /> : null}

        {!loading && !error
          ? rows.map((row, ri) => (
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
                  // A brand-new user never "missed" days before they installed the app.
                  const missed = isPast && level === 0 && hasEverBeenActive;
                  return (
                    <Pressable key={d} style={styles.cell} onPress={() => handleDayPress(d)}>
                      <View style={[styles.dayCircle, { width: circle, height: circle }]}>
                        <DayMarker
                          size={circle}
                          fillColor={isToday ? todayFill : level > 0 ? heatColor(level) : null}
                          todayColor={isToday ? accentBlue : null}
                          missedColor={missed ? MISSED_COLOR : null}
                        />
                        <CustomText
                          style={[
                            styles.dayNum,
                            // Today always uses the accent (matches its ring/border colour);
                            // otherwise white on a filled heat cell, accent on a light one, muted else.
                            {
                              color: isToday
                                ? accentBlue
                                : level >= 2
                                ? "#fff"
                                : level > 0
                                ? accentBlue
                                : mutedText,
                            },
                            // Today reads bolder via the real SemiBold face.
                            isToday && { fontFamily: numFont },
                          ]}
                        >
                          {d}
                        </CustomText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))
          : null}

        {/* Legend: Less ▢▢▢▢ More · Missed (missed marker hidden for a user
            who has never had any activity — it would never appear anyway) */}
        {!loading && !error ? (
          <View style={styles.legend}>
            <CustomText style={[styles.legendText, { color: mutedText }]}>
              {STRINGS.LESS}
            </CustomText>
            {[1, 2, 3, 4].map((l) => (
              <View key={l} style={[styles.legendBox, { backgroundColor: heatColor(l) }]} />
            ))}
            <CustomText style={[styles.legendText, { color: mutedText }]}>
              {STRINGS.MORE}
            </CustomText>
            {hasEverBeenActive ? (
              <>
                <View style={styles.legendDot}>
                  <DashedCircle size={14} strokeWidth={1.3} dash="2.5 2" color={MISSED_COLOR} />
                </View>
                <CustomText style={[styles.legendText, { color: mutedText }]}>
                  {STRINGS.MISSED}
                </CustomText>
              </>
            ) : null}
          </View>
        ) : null}
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
  // Deliberately NO borderRadius: this View is only a centering box — the circle
  // itself is drawn by DayMarker's SVG. A borderRadius here makes Android mask
  // the SVG child to the rounded shape and shave its edges. Width/height are
  // applied inline from the responsive `circle` size.
  dayCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Matches DayMarker's own width/height exactly (NOT absoluteFill — see the
  // comment on DayMarker for why that clipped the circles).
  dayMarkerSvg: { position: "absolute", top: 0, left: 0 },
  dayNum: { fontSize: 13 },
  legend: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14 },
  legendText: { fontSize: 11 },
  legendBox: { width: 14, height: 14, borderRadius: 4 },
  legendDot: { width: 14, height: 14, marginLeft: 8 },
});

export default MonthCalendar;
