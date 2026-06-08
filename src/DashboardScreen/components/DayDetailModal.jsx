import React, { useEffect, useState } from "react";
import { View, Modal, StyleSheet, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import Svg, { Path } from "react-native-svg";
import { CustomText, useTheme, constant, logError } from "@common";
import { getDayDetail, getDayActivity } from "../../database/analytics";

const BookIcon = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Svg>
);

const HeadphoneIcon = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
    <Path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </Svg>
);

const FlameIcon = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M12 23c-4.4 0-8-3.6-8-8 0-2.1.8-4.1 2.2-5.6C7.4 8 8.5 6.3 9 4.4c.1-.3.4-.5.8-.4.3.1.5.3.5.6.1 1.2.6 2.3 1.4 3.2C12.4 6.4 13 4.6 13 2.8c0-.4.3-.7.7-.7.2 0 .4.1.5.2 2.3 2 3.8 4.9 3.8 8 0 4.4-3.6 8-8 8z" />
  </Svg>
);

const fmtTotal = (secs) => {
  if (!secs) return "0m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric" });
};

const DayDetailModal = ({ visible, date, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const accentBlue = isDark ? theme.colors.enabledText : theme.colors.primary;
  const cardBg = theme.colors.actionButton;
  const bg = isDark ? theme.colors.inactiveView : "#ffffff";

  const [detail, setDetail] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !date) return;
    setLoading(true);
    setDetail(null);
    setActivity(null);
    Promise.all([getDayDetail(date), getDayActivity(date)])
      .then(([d, a]) => { setDetail(d); setActivity(a); })
      .catch(logError)
      .finally(() => setLoading(false));
  }, [visible, date]);

  const totalReadSecs = detail?.reads.reduce((s, r) => s + (r.duration || 0), 0) ?? 0;
  const totalListenSecs = detail?.listens.reduce((s, r) => s + (r.duration || 0), 0) ?? 0;
  const totalSecs = totalReadSecs + totalListenSecs;

  const streakMaintained = activity && (
    (activity.reading_seconds ?? 0) >= constant.MIN_READ_SESSION_SECONDS ||
    (activity.listening_seconds ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS
  );

  const hasRead = totalReadSecs > 0;
  const hasListen = totalListenSecs > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType={isDark ? "dark" : "light"}
          blurAmount={10}
          reducedTransparencyFallbackColor={isDark ? "rgba(0,0,0,0.75)" : "rgba(240,240,240,0.75)"}
        />
        <View style={[StyleSheet.absoluteFillObject, styles.dimOverlay]} />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: bg }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: theme.colors.separator }]} />

          <CustomText style={[styles.connLabel, { color: accentBlue }]}>
            DAILY CONNECTION
          </CustomText>
          <CustomText style={[styles.dateText, { color: theme.colors.primaryText }]}>
            {formatDate(date)}
          </CustomText>

          {loading && (
            <CustomText style={[styles.emptyText, { color: theme.colors.textDisabled }]}>
              Loading...
            </CustomText>
          )}

          {!loading && (
            <>
              {hasRead && (
                <View style={[styles.actCard, { backgroundColor: cardBg }]}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(100,150,255,0.15)" : "#EEF2FF" }]}>
                    <BookIcon color={accentBlue} />
                  </View>
                  <View style={styles.actMid}>
                    <CustomText style={[styles.actTitle, { color: theme.colors.primaryText }]}>
                      Reading Practice
                    </CustomText>
                  </View>
                  <View style={styles.durationBlock}>
                    <CustomText style={[styles.durationNum, { color: theme.colors.primaryText }]}>
                      {Math.floor(totalReadSecs / 60)}
                    </CustomText>
                    <CustomText style={[styles.durationUnit, { color: theme.colors.textDisabled }]}>
                      m
                    </CustomText>
                  </View>
                </View>
              )}

              {hasListen && (
                <View style={[styles.actCard, { backgroundColor: cardBg }]}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(100,220,150,0.15)" : "#EDFFF5" }]}>
                    <HeadphoneIcon color="#4CAF82" />
                  </View>
                  <View style={styles.actMid}>
                    <CustomText style={[styles.actTitle, { color: theme.colors.primaryText }]}>
                      Listening Activity
                    </CustomText>
                  </View>
                  <View style={styles.durationBlock}>
                    <CustomText style={[styles.durationNum, { color: theme.colors.primaryText }]}>
                      {Math.floor(totalListenSecs / 60)}
                    </CustomText>
                    <CustomText style={[styles.durationUnit, { color: theme.colors.textDisabled }]}>
                      m
                    </CustomText>
                  </View>
                </View>
              )}

              {!hasRead && !hasListen && (
                <CustomText style={[styles.emptyText, { color: theme.colors.textDisabled }]}>
                  No activity recorded for this day
                </CustomText>
              )}

              {totalSecs > 0 && (
                <View style={styles.footer}>
                  <View>
                    <CustomText style={[styles.totalLabel, { color: theme.colors.textDisabled }]}>
                      TOTAL TIME
                    </CustomText>
                    <CustomText style={[styles.totalTime, { color: theme.colors.primaryText }]}>
                      {fmtTotal(totalSecs)}
                    </CustomText>
                  </View>
                  {streakMaintained && (
                    <View style={[styles.streakPill, { backgroundColor: isDark ? "rgba(245,166,35,0.15)" : "#FFF3E0" }]}>
                      <FlameIcon size={16} color="#F5A623" />
                      <CustomText style={styles.streakText}>Streak Maintained</CustomText>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dimOverlay: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  connLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 34,
    fontWeight: "600",
    marginBottom: 20,
  },
  actCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actMid: {
    flex: 1,
    gap: 4,
  },
  actTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  durationBlock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  durationNum: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  durationUnit: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 3,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  totalTime: {
    fontSize: 30,
    fontWeight: "600",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F5A623",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 24,
    lineHeight: 22,
  },
});

export default DayDetailModal;
