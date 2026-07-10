import React, { useEffect, useRef, useState } from "react";
import { View, Modal, StyleSheet, Pressable, Animated, Easing, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, useTheme, logError } from "@common";
import { getDayDetail, getDayActivity } from "../../database/analytics";

// Fully off-screen regardless of the sheet's actual (content-dependent) height.
const OFFSCREEN_Y = Dimensions.get("window").height;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 24,
    fontWeight: "500",
    marginBottom: 16,
  },
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  actMid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  actTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  actDuration: {
    fontSize: 14,
    fontWeight: "400",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginVertical: 20,
    lineHeight: 22,
  },
});

const BookIcon = ({ color }) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </Svg>
);
BookIcon.propTypes = {
  color: PropTypes.string.isRequired,
};

const HeadphoneIcon = ({ color }) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
    <Path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </Svg>
);
HeadphoneIcon.propTypes = {
  color: PropTypes.string.isRequired,
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
  const bg = isDark ? theme.colors.inactiveView : "#ffffff";
  const iconBg = isDark ? "rgba(100,150,255,0.15)" : "#EEF2FF";

  const [detail, setDetail] = useState(null);
  const [dayActivity, setDayActivity] = useState(null);
  const [loading, setLoading] = useState(false);

  // Custom slide (no dim overlay, no built-in Modal transition — that snapped
  // in/out abruptly). `mounted` keeps the native Modal alive during the exit
  // animation; the Modal itself unmounts only once the slide-down finishes.
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(visible ? 0 : OFFSCREEN_Y)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: OFFSCREEN_Y,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || !date) return;
    setLoading(true);
    setDetail(null);
    setDayActivity(null);
    Promise.all([getDayDetail(date), getDayActivity(date)])
      .then(([d, activity]) => {
        setDetail(d);
        setDayActivity(activity);
      })
      .catch(logError)
      .finally(() => setLoading(false));
  }, [visible, date]);

  const totalReadSecs = detail?.reads.reduce((s, r) => s + (r.duration || 0), 0) ?? 0;
  const totalListenSecs = detail?.listens.reduce((s, r) => s + (r.duration || 0), 0) ?? 0;

  const hasRead = totalReadSecs > 0;
  const hasListen = totalListenSecs > 0;

  // Per-session detail (bani_read_history/audio_history) is device-local and
  // never restored from a cloud snapshot — only the daily aggregate is. So a
  // day restored on a fresh install has real activity but no per-bani rows.
  // Fall back to the aggregate rather than falsely showing "no activity".
  const aggregateReadSecs = dayActivity?.reading_seconds ?? 0;
  const aggregateListenSecs = dayActivity?.listening_seconds ?? 0;
  const showAggregateRead = !hasRead && aggregateReadSecs > 0;
  const showAggregateListen = !hasListen && aggregateListenSecs > 0;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* No dim overlay per design — just an invisible tap-catcher to dismiss. */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.separator }]} />

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
              {(hasRead || showAggregateRead) && (
                <View style={styles.actRow}>
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <BookIcon color={accentBlue} />
                  </View>
                  <View style={styles.actMid}>
                    <CustomText style={[styles.actTitle, { color: theme.colors.primaryText }]}>
                      Reading
                    </CustomText>
                    <CustomText style={[styles.actDuration, { color: theme.colors.textDisabled }]}>
                      {Math.floor((hasRead ? totalReadSecs : aggregateReadSecs) / 60)}m
                    </CustomText>
                  </View>
                </View>
              )}

              {(hasListen || showAggregateListen) && (
                <View style={styles.actRow}>
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <HeadphoneIcon color={accentBlue} />
                  </View>
                  <View style={styles.actMid}>
                    <CustomText style={[styles.actTitle, { color: theme.colors.primaryText }]}>
                      Listening
                    </CustomText>
                    <CustomText style={[styles.actDuration, { color: theme.colors.textDisabled }]}>
                      {Math.floor((hasListen ? totalListenSecs : aggregateListenSecs) / 60)}m
                    </CustomText>
                  </View>
                </View>
              )}

              {!hasRead && !hasListen && !showAggregateRead && !showAggregateListen && (
                <CustomText style={[styles.emptyText, { color: theme.colors.textDisabled }]}>
                  No activity recorded for this day
                </CustomText>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

DayDetailModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  date: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

DayDetailModal.defaultProps = {
  date: null,
};

export default DayDetailModal;
