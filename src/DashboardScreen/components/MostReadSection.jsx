import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, useTheme, STRINGS, logError } from "@common";
import { getTopReadBanis } from "../../database/analytics";

const formatDuration = (secs) => {
  if (!secs) return "0m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const SparkleIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </Svg>
);
SparkleIcon.propTypes = { size: PropTypes.number, color: PropTypes.string };

const MostReadSection = ({ refreshKey }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const accentBlue = isDark ? theme.colors.enabledText : theme.colors.primary;
  const bg = isDark ? theme.colors.inactiveView : "#ffffff";
  const [banis, setBanis] = useState([]);

  useEffect(() => {
    getTopReadBanis(5).then(setBanis).catch(logError);
  }, [refreshKey]);

  if (!banis.length) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.titleRow}>
          <CustomText style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>
            {STRINGS.MOST_READ}
          </CustomText>
          <SparkleIcon size={22} color={accentBlue} />
        </View>
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.actionButton }]}>
          <CustomText style={[styles.emptyText, { color: theme.colors.textDisabled }]}>
            Read a Bani to see your top reads here
          </CustomText>
        </View>
      </View>
    );
  }

  const maxSeconds = banis[0]?.total_seconds ?? 1;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.titleRow}>
        <CustomText style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>
          {STRINGS.MOST_READ}
        </CustomText>
        <SparkleIcon size={22} color={accentBlue} />
      </View>
      {banis.map((b, i) => {
        const pct = maxSeconds > 0 ? ((b.total_seconds ?? 0) / maxSeconds) * 100 : 0;
        return (
          <View key={b.bani_id ?? i} style={styles.row}>
            <CustomText style={[styles.rank, { color: theme.colors.textDisabled }]}>
              {i + 1}
            </CustomText>
            <View style={styles.middle}>
              <CustomText
                style={[styles.baniTitle, { color: theme.colors.primaryText }]}
                numberOfLines={1}
              >
                {b.bani_title ?? `Bani ${b.bani_id}`}
              </CustomText>
              <View style={[styles.barBg, { backgroundColor: theme.colors.activeView }]}>
                <View style={[styles.bar, { width: `${pct}%`, backgroundColor: accentBlue }]} />
              </View>
            </View>
            <CustomText style={[styles.count, { color: accentBlue }]}>
              {formatDuration(b.total_seconds)}
            </CustomText>
          </View>
        );
      })}
    </View>
  );
};

MostReadSection.propTypes = {
  refreshKey: PropTypes.number,
};

MostReadSection.defaultProps = {
  refreshKey: 0,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 12,
  },
  rank: {
    width: 20,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  middle: {
    flex: 1,
  },
  baniTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  barBg: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  bar: {
    height: 3,
    borderRadius: 2,
  },
  count: {
    fontSize: 20,
    fontWeight: "600",
    minWidth: 36,
    textAlign: "right",
  },
  emptyCard: {
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default MostReadSection;
