import React, { useEffect, useCallback } from "react";
import { View, Alert, Linking, StyleSheet } from "react-native";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import PropTypes from "prop-types";
import {
  CustomText,
  STRINGS,
  actions,
  ThemedSwitch,
  updateReminders,
  checkPermissions,
  logError,
} from "@common";
import { getBaniList } from "@database";
import useDashboardTheme, { GOLD } from "./dashboardTheme";
import SectionLabel from "./SectionLabel";
import useBaniLookup from "./useBaniLookup";

// Same default reminder set as Settings (setDefaultReminders): Gur Mantar, Japji,
// Rehras, Sohila. Seeded disabled so the rows always show in the dashboard.
const DEFAULT_INDEXES = [0, 1, 19, 21];
const DEFAULT_TIMINGS = ["3:00 AM", "3:30 AM", "6:00 PM", "10:00 PM"];

const SunIcon = ({ color }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="12" cy="12" r="4" />
    <Line x1="12" y1="2" x2="12" y2="4" />
    <Line x1="12" y1="20" x2="12" y2="22" />
    <Line x1="2" y1="12" x2="4" y2="12" />
    <Line x1="20" y1="12" x2="22" y2="12" />
    <Line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
    <Line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
    <Line x1="4.9" y1="19.1" x2="6.3" y2="17.7" />
    <Line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
  </Svg>
);
SunIcon.propTypes = { color: PropTypes.string.isRequired };

const SunsetIcon = ({ color }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M17 18a5 5 0 0 0-10 0" />
    <Line x1="12" y1="2" x2="12" y2="9" />
    <Line x1="4.2" y1="10.2" x2="5.6" y2="11.6" />
    <Line x1="1" y1="18" x2="3" y2="18" />
    <Line x1="21" y1="18" x2="23" y2="18" />
    <Line x1="18.4" y1="11.6" x2="19.8" y2="10.2" />
    <Path d="M9 9l3-3 3 3" />
  </Svg>
);
SunsetIcon.propTypes = { color: PropTypes.string.isRequired };

const MoonIcon = ({ color }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);
MoonIcon.propTypes = { color: PropTypes.string.isRequired };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { paddingVertical: 8, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600" },
  time: { fontSize: 12, marginTop: 2 },
  divider: { height: 1 },
});

const hourOf = (time) => moment(time, ["h:mm A", "H:mm"]).hour();

// Friendly label from the reminder time (e.g. 3–6 → Amrit Vela, 6–12 → Morning Nitnem).
const labelForTime = (time) => {
  const h = hourOf(time);
  if (Number.isNaN(h)) return STRINGS.MORNING_NITNEM;
  if (h >= 3 && h < 6) return STRINGS.AMRIT_VELA;
  if (h >= 6 && h < 12) return STRINGS.MORNING_NITNEM;
  if (h >= 12 && h < 16) return STRINGS.AFTERNOON_TIME;
  if (h >= 16 && h < 20) return STRINGS.EVENING_TIME;
  return STRINGS.NIGHT_TIME;
};

// Pick an icon from the reminder time (morning / evening / night).
const IconForTime = ({ time, color }) => {
  const hour = hourOf(time);
  if (Number.isNaN(hour) || (hour >= 6 && hour < 16)) return <SunIcon color={color} />;
  if (hour >= 16 && hour < 20) return <SunsetIcon color={color} />;
  return <MoonIcon color={color} />;
};
IconForTime.propTypes = { time: PropTypes.string.isRequired, color: PropTypes.string.isRequired };

const RemindersCard = () => {
  const { card, isDark, primaryText, mutedText, separator } = useDashboardTheme();
  const dispatch = useDispatch();
  const { nameOf } = useBaniLookup();

  const isReminders = useSelector((state) => state.isReminders);
  const reminderBanis = useSelector((state) => state.reminderBanis);
  const reminderSound = useSelector((state) => state.reminderSound);
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);

  let reminders = [];
  try {
    reminders = reminderBanis ? JSON.parse(reminderBanis) : [];
  } catch (_) {
    reminders = [];
  }

  // Seed the default reminder rows (disabled) if none exist yet, so the section
  // always shows the list. Nothing is scheduled until a row is toggled on.
  useEffect(() => {
    if (reminders.length) return undefined;
    let active = true;
    getBaniList(transliterationLanguage)
      .then((list) => {
        if (!active) return;
        const data = DEFAULT_INDEXES.map((idx, i) => {
          const b = list[idx];
          return {
            key: b.id,
            id: b.id,
            gurmukhi: b.gurmukhi,
            translit: b.translit,
            enabled: false,
            title: `${STRINGS.time_for} ${b.translit}`,
            time: DEFAULT_TIMINGS[i],
          };
        });
        dispatch(actions.setReminderBanis(JSON.stringify(data)));
      })
      .catch(logError);
    return () => {
      active = false;
    };
  }, [reminders.length, transliterationLanguage, dispatch]);

  const redirectToSettings = () => {
    Alert.alert(STRINGS.permissionTitle, STRINGS.premissionDescription, [
      { text: STRINGS.cancel, style: "cancel" },
      { text: STRINGS.openSettings, onPress: () => Linking.openSettings() },
    ]);
  };

  // Per-reminder toggle. Self-enables the reminders system on first turn-on so the
  // dashboard works without a master switch (mirrors Settings scheduling).
  const toggleItem = useCallback(
    async (key, value) => {
      try {
        let remindersOn = isReminders;
        if (value && !isReminders) {
          const allowed = await checkPermissions();
          if (!allowed) {
            redirectToSettings();
            return;
          }
          dispatch(actions.toggleReminders(true));
          remindersOn = true;
        }
        const array = JSON.parse(reminderBanis);
        const idx = array.findIndex((item) => item.key === Number(key));
        if (idx === -1) return;
        array[idx] = { ...array[idx], enabled: value };
        const json = JSON.stringify(array);
        dispatch(actions.setReminderBanis(json));
        await updateReminders(remindersOn, reminderSound, json);
      } catch (err) {
        logError(err);
      }
    },
    [reminderBanis, isReminders, reminderSound, dispatch]
  );

  const iconBg = isDark ? "rgba(210,144,48,0.14)" : "#FBF1E2";

  return (
    <View>
      <SectionLabel title={STRINGS.REMINDERS_TITLE} />
      <View style={styles.wrap}>
        <View style={[card, styles.card]}>
          {reminders.map((r, i) => (
            <View key={r.key}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  <IconForTime time={r.time} color={GOLD} />
                </View>
                <View style={styles.textBlock}>
                  <CustomText style={[styles.title, { color: primaryText }]} numberOfLines={1}>
                    {labelForTime(r.time)}
                  </CustomText>
                  <CustomText style={[styles.time, { color: mutedText }]} numberOfLines={1}>
                    {nameOf(r.id) || r.translit} · {r.time}
                  </CustomText>
                </View>
                <ThemedSwitch
                  value={isReminders && !!r.enabled}
                  onValueChange={(v) => toggleItem(r.key, v)}
                />
              </View>
              {i < reminders.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: separator }]} />
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default RemindersCard;
