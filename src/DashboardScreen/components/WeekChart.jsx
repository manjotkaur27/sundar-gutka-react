import React, { useCallback, useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { weekdayNarrow, formatDayMonth } from "@common/dateLocale";
import PropTypes from "prop-types";
import { ChevronLeftIcon, ChevronRight } from "@common/icons";
import { CustomText, STRINGS, constant } from "@common";
import { getDayActivity } from "../../database/analytics";
import useDashboardTheme from "./dashboardTheme";
import SectionError from "./SectionError";
import SectionLabel from "./SectionLabel";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";


const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;

// 7-day window ending `offsetWeeks` weeks before today (0 = last 7 days
// ending today), oldest first. Stepping by whole weeks (not arbitrary days)
// mirrors MonthCalendar's month-at-a-time history browsing.
const daysForOffset = (offsetWeeks) => {
  const anchor = new Date();
  anchor.setDate(anchor.getDate() - offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - (6 - i));
    return d;
  });
};

const WeekChart = ({ refreshKey }) => {
  const { isDark, mutedText } = useDashboardTheme();
  // Highlighted (today) bar + label color.
  const barColor = isDark ? "#429aff" : "#006bde";
  const [weekOffset, setWeekOffset] = useState(0);
  const [bars, setBars] = useState([]);
  const [avg, setAvg] = useState(0);

  const days = useMemo(() => daysForOffset(weekOffset), [weekOffset]);

  const task = useCallback(async () => {
    const rows = await Promise.all(days.map((d) => getDayActivity(ymd(d))));
    const todayKey = ymd(new Date());
    const mins = rows.map((r) =>
      r ? Math.round(((r.reading_seconds ?? 0) + (r.listening_seconds ?? 0)) / 60) : 0
    );
    const max = Math.max(1, ...mins);
    setBars(
      days.map((d, i) => ({
        letter: weekdayNarrow(d.getDay()),
        mins: mins[i],
        ratio: mins[i] / max,
        isToday: ymd(d) === todayKey,
      }))
    );
    const total = mins.reduce((a, b) => a + b, 0);
    setAvg(Math.round(total / 7));
    // refreshKey isn't read above but forces a refetch on screen focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, days]);

  const { loading, error, retry } = useAsyncSection(task);

  const inactiveBar = isDark ? "rgba(37,129,223,0.25)" : "#dce4f2";

  // No activity data exists before DASHBOARD_HISTORY_FLOOR (see MonthCalendar,
  // which enforces the same floor). Block stepping back once the NEXT window
  // back would fall entirely before it — its most recent day (index 6) is the
  // one to check, since a window straddling the floor still has real days to
  // show.
  const { year: floorYear, month: floorMonth } = constant.DASHBOARD_HISTORY_FLOOR;
  const floorDate = useMemo(() => new Date(floorYear, floorMonth - 1, 1), [floorYear, floorMonth]);
  const canGoPrev = daysForOffset(weekOffset + 1)[6] >= floorDate;
  const canGoNext = weekOffset > 0;

  const rangeLabel = useMemo(() => {
    if (weekOffset === 0) return STRINGS.THIS_WEEK;
    const first = days[0];
    const last = days[6];
    const sameMonth = first.getMonth() === last.getMonth();
    const firstLabel = formatDayMonth(first, true);
    // Within one month, the closing label is just the day number ("Jan 5 – 11").
    const lastLabel = sameMonth ? String(last.getDate()) : formatDayMonth(last, true);
    return `${firstLabel} – ${lastLabel}`;
    // STRINGS.getLanguage() in deps so the label (THIS_WEEK / month names)
    // recomputes when the user switches app language, not just on week change.
  }, [weekOffset, days, STRINGS.getLanguage()]);

  return (
    <View>
      <SectionLabel
        title={rangeLabel}
        color={isDark ? "#FFFFFF" : "#113879"}
        uppercase={false}
        titleStyle={{ fontSize: 20, fontWeight: "600", letterSpacing: 0 }}
        right={
          <View style={styles.navRow}>
            <CustomText style={[styles.avg, { color: mutedText }]} numberOfLines={1}>
              {STRINGS.formatString(STRINGS.AVG_PER_DAY, { count: avg })}
            </CustomText>
            <Pressable
              onPress={() => setWeekOffset((o) => o + 1)}
              disabled={!canGoPrev}
              hitSlop={8}
              style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
            >
              <ChevronLeftIcon size={16} color={mutedText} />
            </Pressable>
            <Pressable
              onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
              disabled={!canGoNext}
              hitSlop={8}
              style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
            >
              <ChevronRight size={16} color={mutedText} />
            </Pressable>
          </View>
        }
      />
      <View style={styles.wrap}>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.chart}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={styles.barCol}>
                  <SkeletonBlock style={styles.barSkeleton} />
                </View>
              ))}
            </View>
          ) : null}
          {!loading && error ? <SectionError compact onRetry={retry} /> : null}
          {!loading && !error ? (
            <View style={styles.chart}>
              {bars.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(6, b.ratio * 100)}%`,
                          backgroundColor: b.isToday ? barColor : inactiveBar,
                        },
                      ]}
                    />
                  </View>
                  <CustomText
                    style={[styles.barLabel, { color: b.isToday ? barColor : mutedText }]}
                  >
                    {b.letter}
                  </CustomText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

WeekChart.propTypes = { refreshKey: PropTypes.number };
WeekChart.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { paddingVertical: 8 },
  avg: { fontSize: 12 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  navBtn: { padding: 4 },
  navBtnDisabled: { opacity: 0.3 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 8 },
  barCol: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  barTrack: { flex: 1, width: 18, justifyContent: "flex-end" },
  // bar: { width: 18, borderRadius: 9 },
  bar: {
    width: 18,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  barLabel: { fontSize: 12, marginTop: 8, fontWeight: "500" },
  barSkeleton: { width: 18, height: 60, borderRadius: 8 },
});

export default WeekChart;
