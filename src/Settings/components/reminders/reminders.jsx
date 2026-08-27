import React, { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import {
  STRINGS,
  cancelAllReminders,
  canScheduleExactAlarms,
  checkPermissions,
  openExactAlarmSettings,
  openNotificationSettings,
  hasNotificationPermission,
  showConfirm,
  actions,
  logError,
  logMessage,
  FallBack,
  scheduleReminders,
} from "@common";
import { getBaniList } from "@database";
import { ListItemComponent, BottomSheetComponent } from "../comon";
import SettingsRow, { SettingsToggleRow } from "../comon/SettingsRow";
import { getReminderSound } from "../comon/strings";
import setDefaultReminders from "./ReminderOptions/utils";

const RemindersComponent = ({ navigation }) => {
  const REMINDER_SOUNDS = getReminderSound(STRINGS);
  const isReminders = useSelector((state) => state.isReminders);
  const reminderSound = useSelector((state) => state.reminderSound);
  const reminderBanis = useSelector((state) => state.reminderBanis);
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);
  const [isReminderSound, toggleReminderSound] = useState(false);

  const dispatch = useDispatch();
  const { navigate } = navigation;

  // The chosen sound is baked into every notification AT SCHEDULE TIME: on
  // Android it selects the channel, on iOS it names the sound file. Changing the
  // setting therefore does nothing to the reminders already sitting in the OS
  // queue — they keep firing with the old sound until the schedule is rewritten.
  //
  // That is why editing a reminder TIME appeared to fix the sound: it happened
  // to reschedule as a side effect. This does it for the sound change itself.
  const handleSoundChange = async (sound) => {
    if (!isReminders) return;
    try {
      await scheduleReminders(true, sound, reminderBanis);
    } catch (error) {
      logError(error);
      logMessage("handleSoundChange: failed to reschedule reminders");
    }
  };

  const fetchBanis = async (value) => {
    const data = await getBaniList(transliterationLanguage);
    setDefaultReminders(data, dispatch, value, reminderSound);
  };

  // Which permission the user was sent to system settings for, or null. Read
  // when the app comes back, so the return can pick up where the tap left off.
  // The switch is NOT turned on until every permission is actually there — a
  // reminder switch that reads ON while nothing can fire is the feature
  // silently not working.
  const awaitingRef = useRef(null);

  const enableReminders = async () => {
    dispatch(actions.toggleReminders(true));
    await fetchBanis(true);
  };

  // One dialog for either permission — the app's own, so it follows the theme
  // on both platforms instead of the native alert that used to render light
  // in a dark app. Opening settings records which permission the trip is for.
  const explain = (permission) => {
    const forNotifications = permission === "notifications";
    showConfirm({
      title: forNotifications ? STRINGS.permissionTitle : STRINGS.ALARM_PERM_TITLE,
      message: forNotifications ? STRINGS.premissionDescription : STRINGS.ALARM_PERM_BODY,
      cancelText: STRINGS.cancel,
      confirmText: forNotifications ? STRINGS.openSettings : STRINGS.OPEN_SETTINGS,
      onConfirm: () => {
        awaitingRef.current = permission;
        if (forNotifications) openNotificationSettings();
        else openExactAlarmSettings();
      },
    });
  };

  // Whether a reminder can go off: the notification permission on both
  // platforms, and on Android the exact-alarm permission as well. Checked in
  // that order, and the FIRST missing one is explained — except the one the
  // user has just come back from settings for without granting, which they
  // have already seen and said no to. So: both missing, they grant
  // notifications and return → the alarm dialog follows straight away, since
  // that is the next thing standing between them and a working reminder; they
  // return from the alarm page without granting → nothing, no nagging.
  //
  // Only the user's own tap may PROMPT for the notification permission; every
  // other caller reads the state as it is.
  const resolvePermissions = async (returningFrom = null, { prompt = false } = {}) => {
    const notifications = prompt ? await checkPermissions() : await hasNotificationPermission();
    if (!notifications) {
      if (returningFrom !== "notifications") explain("notifications");
      return false;
    }
    if (!(await canScheduleExactAlarms())) {
      if (returningFrom !== "alarms") explain("alarms");
      return false;
    }
    return true;
  };

  // The listener is registered once, so it reaches the CURRENT closures and
  // state through a ref — the language and sound the reminders are built with
  // may have changed while the user was away in settings.
  const latestRef = useRef({ resolvePermissions, enableReminders, isReminders });
  latestRef.current = { resolvePermissions, enableReminders, isReminders };

  // A permission taken away in system settings while the switch read ON would
  // leave it on with nothing able to fire. Turn it off and say why — once,
  // since the switch is off from here. Read-only: this runs without the user
  // having asked for anything, so it must never raise a system prompt.
  const verifyStillAllowed = async () => {
    const latest = latestRef.current;
    if (!latest.isReminders) return;
    if (await latest.resolvePermissions()) return;
    await cancelAllReminders();
    dispatch(actions.toggleReminders(false));
  };

  useEffect(() => {
    // On opening Settings as well as on foreground. Revoking "Alarms &
    // reminders" KILLS the app, so there is no foreground event to catch that
    // one — the next thing that happens is a cold start, and this mount.
    verifyStillAllowed().catch(logError);

    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      const latest = latestRef.current;
      try {
        const returningFrom = awaitingRef.current;
        if (returningFrom) {
          // Back from a trip we sent them on. Granted → on now, without a
          // second tap; still missing → off, and no repeat of the dialog.
          awaitingRef.current = null;
          if (await latest.resolvePermissions(returningFrom)) await latest.enableReminders();
          return;
        }
        await verifyStillAllowed();
      } catch (error) {
        logError(error);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReminders = async (value) => {
    try {
      if (!value) {
        await cancelAllReminders();
        dispatch(actions.toggleReminders(false));
        return;
      }
      // The switch stays off until BOTH checks pass; nothing flips it on
      // early. It used to switch on after the notification check alone, so a
      // missing exact-alarm permission left it ON with nothing scheduled.
      if (!(await resolvePermissions(null, { prompt: true }))) {
        await cancelAllReminders();
        return;
      }
      await enableReminders();
    } catch (error) {
      logError(error);
      logMessage("handleReminders: Failed to fetch banis");
      FallBack();
    }
  };

  return (
    <>
      <SettingsToggleRow
        title={STRINGS.reminders}
        icon="timer"
        value={isReminders}
        onValueChange={(value) => handleReminders(value)}
      />

      {isReminders && (
        <SettingsRow
          title={STRINGS.set_reminder_options}
          icon="event"
          onPress={() => navigate("ReminderOptions")}
        />
      )}
      {isReminders && (
        <ListItemComponent
          icon="speaker-phone"
          isAvatar={false}
          title={STRINGS.reminder_sound}
          value={reminderSound}
          actionConstant={REMINDER_SOUNDS}
          onPressAction={() => toggleReminderSound(true)}
        />
      )}
      {isReminderSound && (
        <BottomSheetComponent
          isVisible={isReminderSound}
          actionConstant={REMINDER_SOUNDS}
          value={reminderSound}
          toggleVisible={toggleReminderSound}
          title={STRINGS.reminder_sound}
          action={actions.setReminderSound}
          onChange={handleSoundChange}
        />
      )}
    </>
  );
};

RemindersComponent.propTypes = {
  navigation: PropTypes.shape({ navigate: PropTypes.func.isRequired }).isRequired,
};

export default RemindersComponent;
