import React, { useEffect, useState } from "react";
import { View, Modal, StyleSheet, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { BlurView } from "@react-native-community/blur";
import PropTypes from "prop-types";
import { CustomText, useTheme, logError } from "@common";
import { getDayDetail } from "../../database/analytics";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dimOverlay: {
    backgroundColor: "rgba(0,0,0,0.2)",
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !date) return;
    setLoading(true);
    setDetail(null);
    getDayDetail(date)
      .then(setDetail)
      .catch(logError)
      .finally(() => setLoading(false));
  }, [visible, date]);

  const totalReadSecs = detail?.reads.reduce((s, r) => s + (r.duration || 0), 0) ?? 0;
  const totalListenSecs = detail?.listens.reduce((s, r) => s + (r.duration || 0), 0) ?? 0;

  const hasRead = totalReadSecs > 0;
  const hasListen = totalListenSecs > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurType={isDark ? "dark" : "light"}
          blurAmount={10}
          reducedTransparencyFallbackColor={isDark ? "rgba(0,0,0,0.75)" : "rgba(240,240,240,0.75)"}
        />
        <View style={[StyleSheet.absoluteFillObject, styles.dimOverlay]} />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[styles.sheet, { backgroundColor: bg }]}
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
              {hasRead && (
                <View style={styles.actRow}>
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <BookIcon color={accentBlue} />
                  </View>
                  <View style={styles.actMid}>
                    <CustomText style={[styles.actTitle, { color: theme.colors.primaryText }]}>
                      Reading
                    </CustomText>
                    <CustomText style={[styles.actDuration, { color: theme.colors.textDisabled }]}>
                      {Math.floor(totalReadSecs / 60)}m
                    </CustomText>
                  </View>
                </View>
              )}

              {hasListen && (
                <View style={styles.actRow}>
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <HeadphoneIcon color={accentBlue} />
                  </View>
                  <View style={styles.actMid}>
                    <CustomText style={[styles.actTitle, { color: theme.colors.primaryText }]}>
                      Listening
                    </CustomText>
                    <CustomText style={[styles.actDuration, { color: theme.colors.textDisabled }]}>
                      {Math.floor(totalListenSecs / 60)}m
                    </CustomText>
                  </View>
                </View>
              )}

              {!hasRead && !hasListen && (
                <CustomText style={[styles.emptyText, { color: theme.colors.textDisabled }]}>
                  No activity recorded for this day
                </CustomText>
              )}
            </>
          )}
        </View>
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
