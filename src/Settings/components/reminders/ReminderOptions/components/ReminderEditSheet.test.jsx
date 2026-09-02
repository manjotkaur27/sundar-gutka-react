/* eslint-env jest */
import React from "react";

import { render, fireEvent, within } from "@testing-library/react-native";

import ReminderEditSheet from "./ReminderEditSheet";

// The iOS freeze this file guards against.
//
// A React Native Modal is a UIViewController on iOS, presented by whichever
// controller React resolves for the view hosting it — see
// RCTModalHostViewManager.m, `presentModalHostView:`. The reminder sheet, the
// time picker and the label prompt are all Modals. While the picker and the
// prompt sat BESIDE the sheet they resolved to the root controller, which was
// already presenting the sheet, and UIKit will not present twice from one
// controller. The tap did nothing, the presentation completion never fired, and
// the screen read as frozen. Android stacks Dialogs and never showed it.
//
// Rendering them as CHILDREN ends the chain at the sheet's own
// RCTModalHostViewController, so the sheet presents them. These tests assert
// the containment, because it is the containment that fixes it — a refactor
// that lifts either one back out to a sibling is the bug returning.

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (fn) =>
    fn({
      reminderBanis: JSON.stringify([{ key: 1, time: "3:30 AM", enabled: true }]),
      isReminders: true,
      reminderSound: "default",
    }),
}));

jest.mock("@rneui/themed", () => {
  const { View } = require("react-native");
  return { Icon: () => <View /> };
});

jest.mock("@common/hooks/useTokens", () => () => ({
  c: { textSecondary: "#888", error: "#c00" },
  layout: { icon: { sm: 20 } },
}));

jest.mock("@common/actions", () => ({ setReminderBanis: jest.fn() }));

jest.mock("@common", () => {
  const { View } = require("react-native");
  return {
    ConfirmDialogHost: () => <View testID="confirm-host" />,
    constant: { UPDATE_REMINDER: "update_reminder" },
    STRINGS: {
      REMINDER_TIME: "Reminder time",
      notification_text: "Notification text",
      delete: "Delete",
      cancel: "Cancel",
      ok: "OK",
      HOUR: "Hour",
      MINUTE: "Minute",
      TIME_EDIT_HINT: "hint",
    },
    showConfirm: jest.fn(),
    scheduleReminders: jest.fn(),
    trackReminderEvent: jest.fn(),
  };
});

// Stand-ins that make containment observable: the sheet renders its children,
// so anything nested shows up INSIDE its testID and anything left as a sibling
// does not.
jest.mock("../../../../../common/components/ui", () => {
  const { View, Pressable, Text } = require("react-native");
  return {
    Sheet: ({ children }) => <View testID="sheet">{children}</View>,
    Row: ({ title, onPress }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
    TimePickerSheet: () => <View testID="time-picker" />,
  };
});

jest.mock("../modals/LabelModal", () => {
  const { View } = require("react-native");
  return () => <View testID="label-modal" />;
});

const section = { key: 1, time: "3:30 AM", title: "Japji Sahib" };

const renderSheet = () =>
  render(<ReminderEditSheet section={section} visible onClose={jest.fn()} />);

describe("the reminder edit sheet's nested overlays", () => {
  it("renders the time picker inside the sheet, not beside it", () => {
    const { getByTestId } = renderSheet();

    expect(within(getByTestId("sheet")).getByTestId("time-picker")).toBeTruthy();
  });

  it("renders the label prompt inside the sheet too", () => {
    const { getByTestId, getByLabelText, queryByTestId } = renderSheet();

    expect(queryByTestId("label-modal")).toBeNull();
    fireEvent.press(getByLabelText("Notification text"));

    expect(within(getByTestId("sheet")).getByTestId("label-modal")).toBeTruthy();
  });

  // Delete raises `showConfirm`, whose host is normally the one at the app root
  // — presented by the root controller, which is already presenting this sheet.
  // A host of its own is what lets the dialog open at all on iOS.
  it("hosts its own confirm dialog inside the sheet", () => {
    const { getByTestId } = renderSheet();

    expect(within(getByTestId("sheet")).getByTestId("confirm-host")).toBeTruthy();
  });

  it("still offers all three actions", () => {
    const { getByLabelText } = renderSheet();

    expect(getByLabelText("Reminder time")).toBeTruthy();
    expect(getByLabelText("Notification text")).toBeTruthy();
    expect(getByLabelText("Delete")).toBeTruthy();
  });
});
