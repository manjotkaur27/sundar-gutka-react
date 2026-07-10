import React, { useState, useCallback } from "react";
import { View, ScrollView, Image, Pressable, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS, constant, showInfoToast } from "@common";
import { getOrCreateSummary, getDailyActivity } from "../../database/analytics";
import useDashboardTheme from "./dashboardTheme";
import DayDetailModal from "./DayDetailModal";
import SectionError from "./SectionError";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";

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

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  hero: { width: 88, height: 88 },
  streakText: { flex: 1 },
  streakLine: {},
  bigNum: { fontSize: 30 },
  dayStreak: { fontSize: 16 },
  sub: { fontSize: 12, marginTop: 2 },
  flowerStripWrap: { position: "relative" },
  flowerStrip: { gap: 14, paddingTop: 16, paddingRight: 22, alignItems: "flex-end" },
  flowerCol: { alignItems: "center", gap: 4 },
  flowerImg: { width: 44, height: 44 },
  flowerImgFuture: { opacity: 0.28 },
  flowerLabel: { fontSize: 11, fontWeight: "600" },
  flowerScrollHint: {
    position: "absolute",
    right: 0,
    top: 16,
    bottom: 0,
    justifyContent: "center",
    opacity: 0.6,
  },
  weekRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 18 },
  dayCol: { flex: 1, alignItems: "center", gap: 6 },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: { fontSize: 12, fontWeight: "500" },
  heroSkeleton: { width: 88, height: 88, borderRadius: 44 },
  lineSkeletonBig: { width: 150, height: 26, marginBottom: 8 },
  lineSkeletonSmall: { width: 190, height: 14 },
  dotSkeleton: { width: 34, height: 34, borderRadius: 17 },
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

const ChevronRight = ({ color }) => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);
ChevronRight.propTypes = { color: PropTypes.string.isRequired };

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;

const qualifies = (row) =>
  row &&
  ((row.reading_seconds ?? 0) >= constant.MIN_READ_SESSION_SECONDS ||
    (row.listening_seconds ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS);

const hasAnyActivity = (row) =>
  !!row && ((row.reading_seconds ?? 0) > 0 || (row.listening_seconds ?? 0) > 0);

const StreakCard = ({ refreshKey }) => {
  const { mutedText, accentBlue, gold, separator, isDark, theme } = useDashboardTheme();
  // Streak number matches the username: brand blue (light) / off-white (dark).
  const numColor = isDark ? "#E8EEF7" : "#133a78";
  const dayStreakColor = isDark ? "#6D83A9" : "#5E7090";
  // Text below the streak count — same client-specified accent as the date
  // line under the username in DashboardHeader.
  const belowStreakColor = isDark ? "#6E84A9" : "#9AA8C4";
  // Explicit fontFamily (no fontWeight alongside it) — these are custom TTFs, not
  // system fonts, so pairing them with a numeric fontWeight makes Android
  // synthesize a fake bold/medium and silently fall back off the real glyph.
  const numFont = theme.typography.fonts.balooPaajiSemiBold;
  const [current, setCurrent] = useState(0);
  const [longest, setLongest] = useState(0);
  const [days, setDays] = useState([]);
  const [modalDate, setModalDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const task = useCallback(async () => {
    const summary = await getOrCreateSummary();
    if (summary) {
      setCurrent(summary.current_streak ?? 0);
      setLongest(summary.longest_streak ?? 0);
    }

    // Current week, Monday-first (M T W T F S S).
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7; // days since Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    // Activity for the month(s) this week touches.
    const months = new Set(weekDates.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`));
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
    const list = weekDates.map((d) => {
      const key = ymd(d);
      return {
        date: key,
        letter: DAY_LETTERS[d.getDay()],
        done: qualifies(map[key]),
        hasActivity: hasAnyActivity(map[key]),
        isToday: key === todayStr,
        isFuture: key > todayStr,
      };
    });
    setDays(list);
    // refreshKey isn't read above but forces a refetch on screen focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const { loading, error, retry } = useAsyncSection(task);

  const openDay = useCallback((day) => {
    // Future day → nothing to show yet, and nothing to say either.
    if (day.isFuture) return;
    // No activity on this (past/today) day → quick toast instead of an empty detail sheet.
    if (!day.hasActivity) {
      showInfoToast(STRINGS.NO_ACTIVITY);
      return;
    }
    setModalDate(day.date);
    setModalVisible(true);
  }, []);

  // stage = number of thresholds reached (1..14).
  const stage = Math.min(THRESHOLDS.filter((t) => current >= t).length || 1, 14);
  const hero = FLOWERS[stage - 1];

  if (loading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.topRow}>
          <SkeletonBlock style={styles.heroSkeleton} />
          <View style={styles.streakText}>
            <SkeletonBlock style={styles.lineSkeletonBig} />
            <SkeletonBlock style={styles.lineSkeletonSmall} />
          </View>
        </View>
        <View style={[styles.weekRow, { marginTop: 24 }]}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBlock key={i} style={styles.dotSkeleton} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <SectionError onRetry={retry} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Image source={hero} style={styles.hero} resizeMode="contain" fadeDuration={0} />
        <View style={styles.streakText}>
          {/* Nested inline Text keeps the number + label on one shared baseline. */}
          <CustomText style={styles.streakLine}>
            <CustomText style={[styles.bigNum, { color: numColor, fontFamily: numFont }]}>
              {current}
            </CustomText>
            <CustomText style={[styles.dayStreak, { color: dayStreakColor, fontFamily: numFont }]}>
              {` ${STRINGS.DAY_STREAK}`}
            </CustomText>
          </CustomText>
          <CustomText style={[styles.sub, { color: belowStreakColor }]} numberOfLines={1}>
            {STRINGS.BEST_STREAK_LABEL} · {longest}
            {longest === 1 ? " day" : " days"}
            {/* A brand-new user hasn't started a streak yet — "keep it going" reads
                oddly at zero, so it only shows once there's something to keep going. */}
            {current > 0 ? ` · ${STRINGS.KEEP_IT_GOING}` : ""}
          </CustomText>
        </View>
      </View>

      {/* 14-stage lotus growth row */}
      <View style={styles.flowerStripWrap}>
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
                <CustomText
                  style={[styles.flowerLabel, { color: reached ? accentBlue : mutedText }]}
                >
                  {THRESHOLDS[i]}
                </CustomText>
              </View>
            );
          })}
        </ScrollView>
        {/* Hints the row scrolls horizontally — non-interactive, sits above the fade. */}
        <View style={styles.flowerScrollHint} pointerEvents="none">
          <ChevronRight color={mutedText} />
        </View>
      </View>

      {/* Current-week activity strip — minimal: weekday letters only, no dates.
          done = filled gold + check, today = gold ring, past-missed = dashed,
          future = faint ring. Tap a day for its detail / no-activity toast. */}
      <View style={styles.weekRow}>
        {days.map((s) => (
          <Pressable key={s.date} style={styles.dayCol} onPress={() => openDay(s)}>
            <View
              style={[
                styles.dayDot,
                s.done && { backgroundColor: gold, borderColor: gold },
                !s.done &&
                  !s.isToday &&
                  !s.isFuture && {
                    borderColor: mutedText,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                  },
                !s.done && s.isFuture && { borderColor: separator, borderWidth: 1.5 },
                !s.done && s.isToday && { borderColor: gold, borderWidth: 2 },
              ]}
            >
              {s.done ? <CheckIcon color="#fff" /> : null}
            </View>
            <CustomText style={[styles.dayLabel, { color: s.isToday ? gold : mutedText }]}>
              {s.letter}
            </CustomText>
          </Pressable>
        ))}
      </View>

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
