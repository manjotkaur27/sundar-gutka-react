import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText, useTheme, logError } from "@common";
import { getOrCreateSummary, getAllTimeTotals } from "../../database/analytics";

const formatStatTime = (secs) => {
  if (!secs) return { value: "0", unit: "min" };
  const totalMins = Math.floor(secs / 60);
  if (totalMins < 60) return { value: String(totalMins), unit: "min" };
  return { value: String(Math.floor(secs / 3600)), unit: "hrs" };
};

const StatBlock = ({ value, unit, label, theme, accentBlue }) => (
  <View style={styles.statBlock}>
    <View style={styles.valueRow}>
      <CustomText style={[styles.bigNumber, { color: theme.colors.primaryText }]}>
        {value}
      </CustomText>
      <CustomText style={[styles.unit, { color: accentBlue }]}> {unit}</CustomText>
    </View>
    <CustomText style={[styles.statLabel, { color: theme.colors.textDisabled }]}>
      {label}
    </CustomText>
  </View>
);

StatBlock.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired,
  accentBlue: PropTypes.string.isRequired,
};

const LifetimeStats = ({ refreshKey }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const accentBlue = isDark ? theme.colors.enabledText : theme.colors.primary;
  const bg = isDark ? theme.colors.inactiveView : "#ffffff";

  const [summary, setSummary] = useState(null);
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    // Baseline (restored once, survives reinstall) + live (this install only).
    Promise.all([getOrCreateSummary(), getAllTimeTotals()])
      .then(([summaryRow, totalsRow]) => {
        setSummary(summaryRow);
        setTotals(totalsRow);
      })
      .catch(logError);
  }, [refreshKey]);

  const readStat = totals ? formatStatTime(totals.readingSeconds) : { value: "—", unit: "hrs" };
  const listenStat = totals ? formatStatTime(totals.listeningSeconds) : { value: "—", unit: "hrs" };
  const longestStreak = summary ? String(summary.longest_streak ?? 0) : "—";
  const activeDays = summary ? String(summary.total_days_active ?? 0) : "—";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <CustomText style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>
        Lifetime
      </CustomText>

      {/* Row 1: Reading + Listening with vertical divider */}
      <View style={styles.statsRow}>
        <StatBlock
          value={readStat.value}
          unit={readStat.unit}
          label="TOTAL READING"
          theme={theme}
          accentBlue={accentBlue}
        />
        <View style={[styles.vertDivider, { backgroundColor: accentBlue }]} />
        <StatBlock
          value={listenStat.value}
          unit={listenStat.unit}
          label="TOTAL LISTENING"
          theme={theme}
          accentBlue={accentBlue}
        />
      </View>

      {/* Row 2: Streak + Active Days */}
      <View style={[styles.statsRow, styles.row2]}>
        <StatBlock
          value={longestStreak}
          unit="days"
          label="LONGEST STREAK"
          theme={theme}
          accentBlue={accentBlue}
        />
        {/* Invisible divider — same width as the visible one in row 1 to keep columns aligned */}
        <View style={[styles.vertDivider, { opacity: 0 }]} />
        <StatBlock
          value={activeDays}
          unit="total"
          label="ACTIVE DAYS"
          theme={theme}
          accentBlue={accentBlue}
        />
      </View>
    </View>
  );
};

LifetimeStats.propTypes = {
  refreshKey: PropTypes.number,
};

LifetimeStats.defaultProps = {
  refreshKey: 0,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  row2: {
    marginTop: 20,
  },
  statBlock: {
    flex: 1,
  },
  vertDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
    alignSelf: "center",
    opacity: 0.6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  bigNumber: {
    fontSize: 36,
    fontWeight: "600",
  },
  unit: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
});

export default LifetimeStats;
