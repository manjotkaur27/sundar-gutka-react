/* eslint-env jest */
import React from "react";
import { AppState } from "react-native";

import { act, fireEvent, render } from "@testing-library/react-native";

import RemindersCard from "./RemindersCard";

// The Dashboard card is the second way to turn reminders on, and it shipped
// without the three fixes Settings had: it flipped the master switch after
// the notification check alone, used the native alert plus the app-info page,
// and wrote four default reminders into the store whenever the list was empty
// — which the account sync then carried to every device as new reminders.

const mockDispatch = jest.fn();
const mockCheckPermissions = jest.fn();
const mockHasNotificationPermission = jest.fn();
const mockCanScheduleExactAlarms = jest.fn();
const mockShowConfirm = jest.fn();
const mockOpenExactAlarmSettings = jest.fn();
const mockOpenNotificationSettings = jest.fn();
const mockScheduleReminders = jest.fn(() => Promise.resolve({ scheduled: 1, blocked: false }));

let mockState;
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (fn) => fn(mockState),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));

jest.mock("react-native-svg", () => {
  const { View } = require("react-native");
  const Stub = () => null;
  return { __esModule: true, default: View, Circle: Stub, Path: Stub, Line: Stub };
});

jest.mock("@common/icons", () => ({ SunriseIcon: () => null, SunsetIcon: () => null }));
jest.mock("@common/hooks/useBaniLookup", () => ({
  __esModule: true,
  default: () => ({ nameOf: () => "" }),
  toTitleCase: (t) => t,
}));
jest.mock("./dashboardTheme", () => () => ({
  accentBlue: "#00f",
  gold: "#fc0",
  mutedText: "#888",
  separator: "#eee",
  palette: {},
}));
jest.mock("./SectionLabel", () => () => null);

jest.mock("@common", () => {
  const ReactModule = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    STRINGS: {
      cancel: "Cancel",
      openSettings: "Open Settings",
      OPEN_SETTINGS: "Open settings",
      permissionTitle: "Notification Permission Required",
      premissionDescription: "Please enable notifications.",
      ALARM_PERM_TITLE: "Allow alarms & reminders",
      ALARM_PERM_BODY: "Android needs exact alarms.",
      time_for: "Time for",
      REMINDERS_TITLE: "Reminders",
      ADD_REMINDER: "Add a reminder",
      AMRIT_VELA: "Amrit Vela",
      MORNING_NITNEM: "Morning",
      AFTERNOON_TIME: "Afternoon",
      EVENING_TIME: "Evening",
      NIGHT_TIME: "Night",
    },
    CustomText: ({ children }) => ReactModule.createElement(Text, null, children),
    ThemedSwitch: ({ value, onValueChange }) =>
      ReactModule.createElement(Pressable, {
        testID: "reminder-switch",
        onPress: () => onValueChange(!value),
      }),
    actions: {
      toggleReminders: (value) => ({ type: "TOGGLE_REMINDERS", value }),
      setReminderBanis: (value) => ({ type: "SET_REMINDER_BANIS", value }),
    },
    canScheduleExactAlarms: (...a) => mockCanScheduleExactAlarms(...a),
    checkPermissions: (...a) => mockCheckPermissions(...a),
    hasNotificationPermission: (...a) => mockHasNotificationPermission(...a),
    openExactAlarmSettings: (...a) => mockOpenExactAlarmSettings(...a),
    openNotificationSettings: (...a) => mockOpenNotificationSettings(...a),
    showConfirm: (...a) => mockShowConfirm(...a),
    scheduleReminders: (...a) => mockScheduleReminders(...a),
    logError: jest.fn(),
  };
});

// Enough banis for the default indexes [0, 1, 19, 21].
const mockBanis = Array.from({ length: 24 }, (_, i) => ({
  id: 100 + i,
  gurmukhi: `ਬਾਣੀ ${i}`,
  translit: `bani ${i}`,
}));
jest.mock("@database", () => ({ getBaniList: jest.fn(() => Promise.resolve(mockBanis)) }));

const flush = () => act(() => Promise.resolve());
const dispatched = (type) => mockDispatch.mock.calls.filter(([a]) => a.type === type);

const open = async () => {
  const utils = render(<RemindersCard />);
  await flush();
  await flush();
  return utils;
};

let appStateHandler;
beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    isReminders: false,
    reminderBanis: "[]",
    reminderSound: "default",
    transliterationLanguage: "ENGLISH",
  };
  mockHasNotificationPermission.mockImplementation(() => mockCheckPermissions());
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, cb) => {
    appStateHandler = cb;
    return { remove: jest.fn() };
  });
});

describe("an empty list", () => {
  it("shows the four suggested rows without writing anything to the store", async () => {
    const { getAllByTestId } = await open();

    expect(getAllByTestId("reminder-switch")).toHaveLength(4);
    // The old card dispatched setReminderBanis here — the write the account
    // sync carried to every device as four new reminders.
    expect(dispatched("SET_REMINDER_BANIS")).toHaveLength(0);
  });
});

describe("turning the first reminder on", () => {
  it("stays off and explains, in the app's own dialog, when notifications are refused", async () => {
    mockCheckPermissions.mockResolvedValue(false);
    const { getAllByTestId } = await open();

    fireEvent.press(getAllByTestId("reminder-switch")[0]);
    await flush();
    await flush();

    expect(dispatched("TOGGLE_REMINDERS")).toHaveLength(0);
    expect(dispatched("SET_REMINDER_BANIS")).toHaveLength(0);
    expect(mockShowConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Notification Permission Required" })
    );
    mockShowConfirm.mock.calls[0][0].onConfirm();
    expect(mockOpenNotificationSettings).toHaveBeenCalled();
  });

  it("stays off when notifications are allowed but exact alarms are not", async () => {
    mockCheckPermissions.mockResolvedValue(true);
    mockCanScheduleExactAlarms.mockResolvedValue(false);
    const { getAllByTestId } = await open();

    fireEvent.press(getAllByTestId("reminder-switch")[0]);
    await flush();
    await flush();

    // This is the exact fault: the switch used to flip on here.
    expect(dispatched("TOGGLE_REMINDERS")).toHaveLength(0);
    expect(mockShowConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Allow alarms & reminders" })
    );
    mockShowConfirm.mock.calls[0][0].onConfirm();
    expect(mockOpenExactAlarmSettings).toHaveBeenCalled();
  });

  it("turns the system on, stores the list with that row enabled, and schedules", async () => {
    mockCheckPermissions.mockResolvedValue(true);
    mockCanScheduleExactAlarms.mockResolvedValue(true);
    const { getAllByTestId } = await open();

    fireEvent.press(getAllByTestId("reminder-switch")[1]);
    await flush();
    await flush();

    expect(dispatched("TOGGLE_REMINDERS")).toEqual([[{ type: "TOGGLE_REMINDERS", value: true }]]);
    const [write] = dispatched("SET_REMINDER_BANIS");
    const list = JSON.parse(write[0].value);
    expect(list.map((r) => r.enabled)).toEqual([false, true, false, false]);
    expect(mockScheduleReminders).toHaveBeenCalledWith(true, "default", write[0].value);
  });

  it("finishes the tap when the user comes back from settings with the permission", async () => {
    mockCheckPermissions.mockResolvedValueOnce(false).mockResolvedValue(true);
    mockCanScheduleExactAlarms.mockResolvedValue(true);
    const { getAllByTestId } = await open();

    fireEvent.press(getAllByTestId("reminder-switch")[0]);
    await flush();
    mockShowConfirm.mock.calls[0][0].onConfirm();
    await act(async () => {
      await appStateHandler("active");
    });
    await flush();

    expect(dispatched("TOGGLE_REMINDERS")).toEqual([[{ type: "TOGGLE_REMINDERS", value: true }]]);
    expect(dispatched("SET_REMINDER_BANIS")).toHaveLength(1);
  });
});

describe("with reminders already on", () => {
  it("writes a toggle through and reschedules without re-checking permissions", async () => {
    const list = [
      { key: 4, id: 4, time: "5:45 AM", enabled: true, translit: "japji" },
      { key: 6, id: 6, time: "6:00 PM", enabled: false, translit: "rehras" },
    ];
    mockState = { ...mockState, isReminders: true, reminderBanis: JSON.stringify(list) };
    const { getAllByTestId } = await open();

    fireEvent.press(getAllByTestId("reminder-switch")[1]);
    await flush();

    expect(mockCheckPermissions).not.toHaveBeenCalled();
    const [write] = dispatched("SET_REMINDER_BANIS");
    expect(JSON.parse(write[0].value)[1].enabled).toBe(true);
    expect(mockScheduleReminders).toHaveBeenCalledWith(true, "default", write[0].value);
  });
});
