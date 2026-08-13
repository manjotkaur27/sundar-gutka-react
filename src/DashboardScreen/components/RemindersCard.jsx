import React, { useEffect, useCallback } from "react";
import { View, Pressable, Alert, Linking, StyleSheet } from "react-native";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import PropTypes from "prop-types";
import { SunriseIcon, SunsetIcon } from "@common/icons";
import {
  CustomText,
  STRINGS,
  actions,
  ThemedSwitch,
  scheduleReminders,
  checkPermissions,
  logError,
} from "@common";
import { getBaniList } from "@database";
import useDashboardTheme from "./dashboardTheme";
import SectionLabel from "./SectionLabel";
import useBaniLookup, { toTitleCase } from "@common/hooks/useBaniLookup";

// Same default reminder set as Settings (setDefaultReminders): Gur Mantar, Japji,
// Rehras, Sohila. Seeded disabled so the rows always show in the dashboard.
const DEFAULT_INDEXES = [0, 1, 19, 21];
const DEFAULT_TIMINGS = ["3:00 AM", "3:30 AM", "6:00 PM", "10:00 PM"];

// Classic sun: center disc + 8 short rays (morning / Amrit Vela).
const SunIcon = ({ color }) => (
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


const MoonIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color} stroke="none">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);
MoonIcon.propTypes = { color: PropTypes.string.isRequired };

// No outer ring — just the plus glyph (client asked for the circle removed).
const PlusCircle = ({ color }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
PlusCircle.propTypes = { color: PropTypes.string.isRequired };

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
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  addText: { fontSize: 13, fontWeight: "600" },
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

// Icon + tint per time-of-day kind (morning / evening / night), each with its
// own icon color and chip background so the three rows read distinctly.
const kindForTime = (time) => {
  const hour = hourOf(time);
  if (Number.isNaN(hour)) return "sun";
  if (hour >= 3 && hour < 6) return "sunrise"; // Amrit Vela
  if (hour >= 6 && hour < 16) return "sun"; // Morning / afternoon
  if (hour >= 16 && hour < 20) return "sunset"; // Evening
  return "night"; // Night (20:00–03:00)
};

// Sunrise/sunset are shared icons from common/icons; sun and moon are still
// local. All four are rendered at 20 to fit the tinted circle.
const ICON_FOR_KIND = { sunrise: SunriseIcon, sun: SunIcon, sunset: SunsetIcon, night: MoonIcon };

// `c` is the semantic role map, passed in because this is module scope.
const buildIconStyles = (p, accentBlue, mutedText, gold) => ({
  // Amrit Vela (dawn) shares the warm gold tint with the daytime sun.
  sunrise: { color: gold, bg: p.goldSurface },
  sun: { color: gold, bg: p.goldSurface },
  sunset: { color: accentBlue, bg: p.accentSurface },
  night: { color: mutedText, bg: p.neutralSurface },
});

const RemindersCard = () => {
  const { accentBlue, gold, mutedText, separator, palette } = useDashboardTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { nameOf } = useBaniLookup();
  const iconStyles = buildIconStyles(palette, accentBlue, mutedText, gold);
  const titleColor = palette.cardTitle;
  const timeColor = palette.cardMeta;
  // Dark-mode reminder toggle: bright-blue ON track, navy OFF track + navy thumb.
  const offThumbColor = palette.switchOffThumb;
  // The ON thumb is white with a hairline. Without this it falls back to the
  // surface role, which on this navy card IS the card — a thumb you cannot see.
  const onThumbColor = palette.switchOnThumb;
  const thumbBorderColor = palette.switchThumbBorder;
  const onTrackColor = palette.switchOnTrack;
  const offTrackColor = palette.switchOffTrack;
  // "Add a reminder" matches the "Edit banis" link (light blue in dark, accent in light).
  const addColor = accentBlue;

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
            translit: toTitleCase(b.translit),
            enabled: false,
            title: `${STRINGS.time_for} ${toTitleCase(b.translit)}`,
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
        await scheduleReminders(remindersOn, reminderSound, json);
      } catch (err) {
        logError(err);
      }
    },
    [reminderBanis, isReminders, reminderSound, dispatch]
  );

  return (
    <View>
      {/* No colour override: Reminders is a section heading like Explore,
          Discover and Insights, and reads in the same colour as all of them.
          It used to take a quieter accent of its own, which made one heading in
          the stack look faded rather than deliberate. */}
      <SectionLabel title={STRINGS.REMINDERS_TITLE} />
      <View style={styles.wrap}>
        <View style={styles.card}>
          {reminders.map((r, i) => {
            const kind = kindForTime(r.time);
            const Icon = ICON_FOR_KIND[kind];
            const { color: iconColor, bg: iconBg } = iconStyles[kind];
            return (
              <View key={r.key}>
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <Icon color={iconColor} size={20} />
                  </View>
                  <View style={styles.textBlock}>
                    {/* Two lines. A bani name is the row's subject — clipping it
                        to "ਰਹਰਾਸਿ ਸਾ…" loses which reminder this is. The row has
                        no fixed height, so it grows instead. */}
                    <CustomText style={[styles.title, { color: titleColor }]} numberOfLines={2}>
                      {nameOf(r.id) || r.translit}
                    </CustomText>
                    <CustomText style={[styles.time, { color: timeColor }]} numberOfLines={2}>
                      {labelForTime(r.time)} · {r.time}
                    </CustomText>
                  </View>
                  <ThemedSwitch
                    value={isReminders && !!r.enabled}
                    onValueChange={(v) => toggleItem(r.key, v)}
                    offThumbColor={offThumbColor}
                    onThumbColor={onThumbColor}
                    thumbBorderColor={thumbBorderColor}
                    onTrackColor={onTrackColor}
                    offTrackColor={offTrackColor}
                  />
                </View>
                {i < reminders.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: separator }]} />
                ) : null}
              </View>
            );
          })}

          {reminders.length ? (
            <View style={[styles.divider, { backgroundColor: separator }]} />
          ) : null}
          <Pressable
            style={styles.addRow}
            onPress={() => navigation.navigate("ReminderOptions")}
            hitSlop={6}
          >
            <PlusCircle color={addColor} />
            <CustomText style={[styles.addText, { color: addColor }]}>
              {STRINGS.ADD_REMINDER}
            </CustomText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default RemindersCard;
