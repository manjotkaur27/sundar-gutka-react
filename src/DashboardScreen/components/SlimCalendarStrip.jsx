import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import PropTypes from "prop-types";
import { CustomText, useTheme, constant, logError } from "@common";
import { getDailyActivity } from "../../database/analytics";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getCurrentWeek = () => {
  const today = new Date();
  const dow = today.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { dateStr: `${y}-${m}-${day}`, dayNum: d.getDate(), dow: i };
  });
};

const SlimCalendarStrip = ({ refreshKey }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const accentBlue = isDark ? theme.colors.enabledText : theme.colors.primary;
  const todayStr = getTodayStr();
  const weekDays = getCurrentWeek();
  const [activityMap, setActivityMap] = useState({});

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 130,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const now = new Date();
    getDailyActivity(now.getFullYear(), now.getMonth() + 1)
      .then((rows) => {
        const map = {};
        rows.forEach((r) => { map[r.date] = r; });
        setActivityMap(map);
      })
      .catch(logError);
  }, [refreshKey]);

  const bg = isDark ? theme.colors.inactiveView : "#ffffff";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: slideAnim,
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0],
            }),
          }],
        },
      ]}
    >
      <View style={[styles.container, {
        backgroundColor: bg,
        borderBottomColor: theme.colors.separator,
      }]}>
        {weekDays.map(({ dateStr, dayNum, dow }) => {
          const row = activityMap[dateStr];
          const isToday = dateStr === todayStr;
          const qualifies = row && (
            (row.reading_seconds ?? 0) >= constant.MIN_READ_SESSION_SECONDS ||
            (row.listening_seconds ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS
          );
          const hasAny = row && (row.reading_seconds + row.listening_seconds) > 0;
          return (
            <View key={dow} style={styles.cell}>
              <CustomText style={[styles.dayLetter, { color: theme.colors.textDisabled }]}>
                {DAY_LETTERS[dow]}
              </CustomText>
              <View style={[
                styles.circle,
                qualifies && { backgroundColor: accentBlue },
                !qualifies && hasAny && { borderWidth: 1.5, borderColor: accentBlue },
                isToday && !qualifies && !hasAny && { borderWidth: 2, borderColor: theme.colors.textDisabled },
              ]}>
                <CustomText style={[
                  styles.dayNum,
                  { color: qualifies ? "#ffffff" : theme.colors.primaryText },
                  isToday && !qualifies && { fontWeight: "700" },
                ]}>
                  {dayNum}
                </CustomText>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};

SlimCalendarStrip.propTypes = {
  refreshKey: PropTypes.number,
};

SlimCalendarStrip.defaultProps = {
  refreshKey: 0,
};

const CIRCLE = 30;

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 10,
  },
  container: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  dayLetter: {
    fontSize: 11,
    fontWeight: "500",
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dayNum: {
    fontSize: 12,
  },
});

export default SlimCalendarStrip;
