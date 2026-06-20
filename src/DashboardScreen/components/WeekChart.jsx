import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS, logError } from "@common";
import { getDayActivity } from "../../database/analytics";
import SectionLabel from "./SectionLabel";
import useDashboardTheme from "./dashboardTheme";

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
  const { isDark, accentBlue, mutedText } = useDashboardTheme();
  const [bars, setBars] = useState([]);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const days = last7();
        const rows = await Promise.all(days.map((d) => getDayActivity(ymd(d))));
        if (!active) return;
        const todayKey = ymd(new Date());
        const mins = rows.map((r) =>
          r ? Math.round(((r.reading_seconds ?? 0) + (r.listening_seconds ?? 0)) / 60) : 0,
        );
        const max = Math.max(1, ...mins);
        setBars(days.map((d, i) => ({
          letter: DAY_LETTER[d.getDay()],
          mins: mins[i],
          ratio: mins[i] / max,
          isToday: ymd(d) === todayKey,
        })));
        const total = mins.reduce((a, b) => a + b, 0);
        setAvg(Math.round(total / 7));
      } catch (err) {
        logError(err);
      }
    })();
    return () => { active = false; };
  }, [refreshKey]);

  const inactiveBar = isDark ? "rgba(37,129,223,0.25)" : "#dce4f2";

  return (
    <View>
      <SectionLabel
        title={STRINGS.THIS_WEEK}
        right={
          <CustomText style={[styles.avg, { color: mutedText }]}>
            {STRINGS.formatString(STRINGS.AVG_PER_DAY, { count: avg })}
          </CustomText>
        }
      />
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.chart}>
            {bars.map((b, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(6, b.ratio * 100)}%`,
                        backgroundColor: b.isToday ? accentBlue : inactiveBar,
                      },
                    ]}
                  />
                </View>
                <CustomText style={[styles.barLabel, { color: b.isToday ? accentBlue : mutedText }]}>
                  {b.letter}
                </CustomText>
              </View>
            ))}
          </View>
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
  bar: { width: 18, borderRadius: 9 },
  barLabel: { fontSize: 12, marginTop: 8, fontWeight: "500" },
});

export default WeekChart;
