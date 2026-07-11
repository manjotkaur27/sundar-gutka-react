import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS } from "@common";
import { getDayActivity } from "../../database/analytics";
import useDashboardTheme from "./dashboardTheme";
import SectionError from "./SectionError";
import SectionLabel from "./SectionLabel";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0",
  )}`;

// Last 7 days ending today (oldest first).
const last7 = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
};

const WeekChart = ({ refreshKey }) => {
  const { isDark, mutedText } = useDashboardTheme();
  // Highlighted (today) bar + label color.
  const barColor = isDark ? "#429aff" : "#006bde";
  const [bars, setBars] = useState([]);
  const [avg, setAvg] = useState(0);

  const task = useCallback(async () => {
    const days = last7();
    const rows = await Promise.all(days.map((d) => getDayActivity(ymd(d))));
    const todayKey = ymd(new Date());
    const mins = rows.map((r) =>
      r ? Math.round(((r.reading_seconds ?? 0) + (r.listening_seconds ?? 0)) / 60) : 0,
    );
    const max = Math.max(1, ...mins);
    setBars(
      days.map((d, i) => ({
        letter: DAY_LETTER[d.getDay()],
        mins: mins[i],
        ratio: mins[i] / max,
        isToday: ymd(d) === todayKey,
      })),
    );
    const total = mins.reduce((a, b) => a + b, 0);
    setAvg(Math.round(total / 7));
    // refreshKey isn't read above but forces a refetch on screen focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const { loading, error, retry } = useAsyncSection(task);

  const inactiveBar = isDark ? "rgba(37,129,223,0.25)" : "#dce4f2";

  return (
    <View>
      <SectionLabel
        title={STRINGS.THIS_WEEK}
        color={isDark ? "#FFFFFF" : "#113879"}
        uppercase={false}
        titleStyle={{ fontSize: 20, fontWeight: "600", letterSpacing: 0 }}
        right={
          <CustomText style={[styles.avg, { color: mutedText }]}>
            {STRINGS.formatString(STRINGS.AVG_PER_DAY, { count: avg })}
          </CustomText>
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
