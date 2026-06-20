import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, logError } from "@common";
import {
  getCompletedBanisCount,
  getReadingListeningTotals,
  getOrCreateSummary,
} from "../../database/analytics";
import SectionLabel from "./SectionLabel";
import useDashboardTheme from "./dashboardTheme";

const BookIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Svg>
);
BookIcon.propTypes = { color: PropTypes.string.isRequired };

const ClockIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);
ClockIcon.propTypes = { color: PropTypes.string.isRequired };

const fmtHrs = (secs) => {
  if (!secs) return { value: "0", unit: "min" };
  const mins = Math.floor(secs / 60);
  if (mins < 60) return { value: String(mins), unit: "min" };
  return { value: String(Math.floor(secs / 3600)), unit: "hrs" };
};

const HeroStat = ({ icon, value, label, sub, accent, primaryText, mutedText }) => (
  <View style={styles.hero}>
    {icon === "book" ? <BookIcon color={accent} /> : <ClockIcon color={accent} />}
    <CustomText style={[styles.heroValue, { color: primaryText }]}>{value}</CustomText>
    <CustomText style={[styles.heroLabel, { color: primaryText }]}>{label}</CustomText>
    <CustomText style={[styles.heroSub, { color: mutedText }]}>{sub}</CustomText>
  </View>
);
HeroStat.propTypes = {
  icon: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  sub: PropTypes.string.isRequired,
  accent: PropTypes.string.isRequired,
  primaryText: PropTypes.string.isRequired,
  mutedText: PropTypes.string.isRequired,
};

const MiniStat = ({ value, unit, label, accent, primaryText, mutedText }) => (
  <View style={styles.miniStat}>
    <View style={styles.miniRow}>
      <CustomText style={[styles.miniValue, { color: primaryText }]}>{value}</CustomText>
      <CustomText style={[styles.miniUnit, { color: accent }]}> {unit}</CustomText>
    </View>
    <CustomText style={[styles.miniLabel, { color: mutedText }]}>{label}</CustomText>
  </View>
);
MiniStat.propTypes = {
  value: PropTypes.string.isRequired,
  unit: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  accent: PropTypes.string.isRequired,
  primaryText: PropTypes.string.isRequired,
  mutedText: PropTypes.string.isRequired,
};

const YourPractice = ({ refreshKey }) => {
  const { card, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      getCompletedBanisCount(constant.MIN_READ_SESSION_SECONDS),
      getReadingListeningTotals(),
      getOrCreateSummary(),
    ])
      .then(([completed, totals, summary]) => setData({ completed, totals, summary }))
      .catch(logError);
  }, [refreshKey]);

  const completed = data ? data.completed : 0;
  const readSecs = data?.totals?.total_reading_seconds ?? 0;
  const listenSecs = data?.totals?.total_listening_seconds ?? 0;
  const nitnemHrs = Math.floor((readSecs + listenSecs) / 3600);
  const readStat = fmtHrs(readSecs);
  const listenStat = fmtHrs(listenSecs);
  const longest = data?.summary?.longest_streak ?? 0;
  const activeDays = data?.summary?.total_days_active ?? 0;

  return (
    <View>
      <SectionLabel title={STRINGS.YOUR_PRACTICE} />
      <View style={styles.wrap}>
        <View style={[card, styles.card]}>
          {/* Two hero stats */}
          <View style={styles.heroRow}>
            <HeroStat
              icon="book"
              value={completed.toLocaleString()}
              label={STRINGS.BANIS_COMPLETED}
              sub={STRINGS.ALL_TIME}
              accent={accentBlue}
              primaryText={primaryText}
              mutedText={mutedText}
            />
            <View style={[styles.vDivider, { backgroundColor: separator }]} />
            <HeroStat
              icon="clock"
              value={`${nitnemHrs}h`}
              label={STRINGS.IN_NITNEM}
              sub={STRINGS.THIS_YEAR}
              accent={accentBlue}
              primaryText={primaryText}
              mutedText={mutedText}
            />
          </View>

          <View style={[styles.hDivider, { backgroundColor: separator }]} />

          {/* Lifetime stats (2×2) */}
          <View style={styles.miniRowWrap}>
            <MiniStat value={readStat.value} unit={readStat.unit} label={STRINGS.TOTAL_READING_HRS} accent={accentBlue} primaryText={primaryText} mutedText={mutedText} />
            <MiniStat value={listenStat.value} unit={listenStat.unit} label={STRINGS.TOTAL_LISTENING_HRS} accent={accentBlue} primaryText={primaryText} mutedText={mutedText} />
          </View>
          <View style={[styles.miniRowWrap, styles.miniRow2]}>
            <MiniStat value={String(longest)} unit="days" label={STRINGS.LONGEST_STREAK} accent={accentBlue} primaryText={primaryText} mutedText={mutedText} />
            <MiniStat value={String(activeDays)} unit="total" label={STRINGS.TOTAL_ACTIVE_DAYS} accent={accentBlue} primaryText={primaryText} mutedText={mutedText} />
          </View>
        </View>
      </View>
    </View>
  );
};

YourPractice.propTypes = { refreshKey: PropTypes.number };
YourPractice.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 20 },
  heroRow: { flexDirection: "row", alignItems: "flex-start" },
  hero: { flex: 1, gap: 5 },
  heroValue: { fontSize: 26, fontWeight: "700", marginTop: 6 },
  heroLabel: { fontSize: 13, fontWeight: "500" },
  heroSub: { fontSize: 11 },
  vDivider: { width: 1, alignSelf: "stretch", marginHorizontal: 16, opacity: 0.6 },
  hDivider: { height: 1, marginVertical: 18 },
  miniRowWrap: { flexDirection: "row" },
  miniRow2: { marginTop: 16 },
  miniStat: { flex: 1 },
  miniRow: { flexDirection: "row", alignItems: "baseline" },
  miniValue: { fontSize: 22, fontWeight: "600" },
  miniUnit: { fontSize: 12, fontWeight: "500" },
  miniLabel: { fontSize: 11, fontWeight: "500", letterSpacing: 0.6, marginTop: 2 },
});

export default YourPractice;
