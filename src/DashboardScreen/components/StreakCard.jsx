import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, ScrollView, Image, Pressable, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, logError } from "@common";
import { getOrCreateSummary, getDailyActivity } from "../../database/analytics";
import useDashboardTheme, { GOLD } from "./dashboardTheme";
import DayDetailModal from "./DayDetailModal";

// 13 lotus growth stages: flower_1 (base) → flower_14 (max bloom).
// flower_6 (the old "21" stage) is intentionally dropped per design.
const FLOWERS = [
  require("../../assets/images/lotus/flower_1.png"),
  require("../../assets/images/lotus/flower_2.png"),
  require("../../assets/images/lotus/flower_3.png"),
  require("../../assets/images/lotus/flower_4.png"),
  require("../../assets/images/lotus/flower_5.png"),
  require("../../assets/images/lotus/flower_7.png"),
  require("../../assets/images/lotus/flower_8.png"),
  require("../../assets/images/lotus/flower_9.png"),
  require("../../assets/images/lotus/flower_10.png"),
  require("../../assets/images/lotus/flower_11.png"),
  require("../../assets/images/lotus/flower_12.png"),
  require("../../assets/images/lotus/flower_13.png"),
  require("../../assets/images/lotus/flower_14.png"),
];

// Streak (days) required to reach each of the 13 stages. Stage 1 starts at day 1.
const THRESHOLDS = [1, 2, 5, 10, 15, 30, 45, 60, 90, 120, 180, 270, 365];

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_TO_SHOW = 35;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  hero: { width: 88, height: 88 },
  streakText: { flex: 1 },
  streakNumRow: { flexDirection: "row", alignItems: "baseline" },
  bigNum: { fontSize: 30, fontWeight: "800" },
  dayStreak: { fontSize: 16, fontWeight: "500" },
  sub: { fontSize: 12, marginTop: 2 },
  flowerStrip: { gap: 14, paddingTop: 16, paddingRight: 4, alignItems: "flex-end" },
  flowerCol: { alignItems: "center", gap: 4 },
  flowerImg: { width: 44, height: 44 },
  flowerImgFuture: { opacity: 0.28 },
  flowerLabel: { fontSize: 11, fontWeight: "600" },
  dayStrip: { gap: 10, paddingTop: 16, paddingRight: 4 },
  dayCol: { alignItems: "center", gap: 6 },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dotNum: { fontSize: 12, fontWeight: "500" },
  dayLabel: { fontSize: 12, fontWeight: "500" },
});

const CheckIcon = ({ color }) => (
  <Svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);
CheckIcon.propTypes = { color: PropTypes.string.isRequired };

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;

const qualifies = (row) =>
  row &&
  ((row.reading_seconds ?? 0) >= constant.MIN_READ_SESSION_SECONDS ||
    (row.listening_seconds ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS);

const StreakCard = ({ refreshKey }) => {
  const { primaryText, mutedText, accentBlue } = useDashboardTheme();
  const dayScrollRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);
  const [days, setDays] = useState([]);
  const [modalDate, setModalDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const summary = await getOrCreateSummary();
        if (active && summary) {
          setCurrent(summary.current_streak ?? 0);
          setLongest(summary.longest_streak ?? 0);
        }

        // Activity for every month the last DAYS_TO_SHOW days touch.
        const today = new Date();
        const months = new Set();
        Array.from({ length: DAYS_TO_SHOW }).forEach((_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
        });
        const monthRows = await Promise.all(
          [...months].map((mk) => {
            const [y, m] = mk.split("-");
            return getDailyActivity(Number(y), Number(m));
          })
        );
        const map = {};
        monthRows.flat().forEach((r) => {
          map[r.date] = r;
        });

        const todayStr = ymd(today);
        const list = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (DAYS_TO_SHOW - 1 - i));
          const key = ymd(d);
          return {
            date: key,
            dayNum: d.getDate(),
            letter: DAY_LETTERS[d.getDay()],
            done: qualifies(map[key]),
            isToday: key === todayStr,
          };
        });
        if (active) setDays(list);
      } catch (err) {
        logError(err);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const openDay = useCallback((date) => {
    setModalDate(date);
    setModalVisible(true);
  }, []);

  // stage = number of thresholds reached (1..14).
  const stage = Math.min(THRESHOLDS.filter((t) => current >= t).length || 1, 14);
  const hero = FLOWERS[stage - 1];

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Image source={hero} style={styles.hero} resizeMode="contain" fadeDuration={0} />
        <View style={styles.streakText}>
          <View style={styles.streakNumRow}>
            <CustomText style={[styles.bigNum, { color: accentBlue }]}>{current}</CustomText>
            <CustomText style={[styles.dayStreak, { color: primaryText }]}>
              {" "}
              {STRINGS.DAY_STREAK}
            </CustomText>
          </View>
          <CustomText style={[styles.sub, { color: mutedText }]} numberOfLines={1}>
            {STRINGS.BEST_STREAK_LABEL} · {longest}
            {longest === 1 ? " day" : " days"} · {STRINGS.KEEP_IT_GOING}
          </CustomText>
        </View>
      </View>

      {/* 14-stage lotus growth row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flowerStrip}
      >
        {FLOWERS.map((src, i) => {
          const reached = stage >= i + 1;
          return (
            <View key={THRESHOLDS[i]} style={styles.flowerCol}>
              <Image
                source={src}
                style={[styles.flowerImg, !reached && styles.flowerImgFuture]}
                resizeMode="contain"
                fadeDuration={0}
              />
              <CustomText style={[styles.flowerLabel, { color: reached ? accentBlue : mutedText }]}>
                {THRESHOLDS[i]}
              </CustomText>
            </View>
          );
        })}
      </ScrollView>

      {/* Calendar day strip — tap a day to see its detail */}
      <ScrollView
        ref={dayScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
        onContentSizeChange={() => dayScrollRef.current?.scrollToEnd({ animated: false })}
      >
        {days.map((s) => (
          <Pressable key={s.date} style={styles.dayCol} onPress={() => openDay(s.date)}>
            <View
              style={[
                styles.dayDot,
                s.done && { backgroundColor: GOLD, borderColor: GOLD },
                !s.done &&
                  !s.isToday && { borderColor: mutedText, borderWidth: 1.5, borderStyle: "dashed" },
                s.isToday && { borderColor: GOLD, borderWidth: 2 },
              ]}
            >
              {s.done ? (
                <CheckIcon color="#fff" />
              ) : (
                <CustomText style={[styles.dotNum, { color: s.isToday ? GOLD : mutedText }]}>
                  {s.dayNum}
                </CustomText>
              )}
            </View>
            <CustomText style={[styles.dayLabel, { color: mutedText }]}>{s.letter}</CustomText>
          </Pressable>
        ))}
      </ScrollView>

      <DayDetailModal
        visible={modalVisible}
        date={modalDate}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

StreakCard.propTypes = { refreshKey: PropTypes.number };
StreakCard.defaultProps = { refreshKey: 0 };

export default StreakCard;
