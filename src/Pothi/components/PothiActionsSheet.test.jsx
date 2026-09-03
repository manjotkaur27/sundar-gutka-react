/* eslint-env jest */
import React from "react";

import { render, fireEvent, within } from "@testing-library/react-native";

import PothiActionsSheet from "./PothiActionsSheet";

// Deleting a pothi asks first, and the ASK has to survive the tap.
//
// showConfirm delivers to the innermost mounted ConfirmDialogHost — the one
// this sheet renders, so that on iOS the dialog is presented by the sheet
// rather than by the root controller that is already presenting the sheet.
// That makes the ORDER load-bearing: close the sheet before raising the
// confirm and React unmounts that host in the same commit, taking the pending
// dialog with it. No dialog, no delete, on either platform. These pin the
// order rather than the wording.

const mockConfirmDelete = jest.fn();

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (fn) => fn({ pothis: [] }),
}));


jest.mock("@common/hooks/useTokens", () => () => ({
  space: { sm: 8, md: 12, lg: 16 },
}));

jest.mock("@common/pothi/model", () => ({
  isDefaultPothi: () => false,
  isValidName: () => true,
  MAX_NAME_LENGTH: 40,
}));

jest.mock("@common", () => {
  const { View, Text } = require("react-native");
  const { useScreenRolesScope } = require("@theme/ScreenRolesProvider");
  return {
    ConfirmDialogHost: () => (
      <View testID="confirm-host">
        <Text testID="confirm-scope">{String(useScreenRolesScope())}</Text>
      </View>
    ),
    actions: { renamePothi: jest.fn() },
    STRINGS: {
      POTHI_DELETE: "Delete",
      POTHI_RENAME: "Rename",
      POTHI_KEYBOARD_TOGGLE: "Gurmukhi keyboard",
      CANCEL: "Cancel",
      SAVE: "Save",
    },
    trackPothiEvent: jest.fn(),
  };
});

// Stand-ins that make containment observable: anything nested renders INSIDE
// the sheet testID, anything left as a sibling does not.
jest.mock("../../common/components/ui", () => {
  const { View, Pressable, Text } = require("react-native");
  const { useScreenRolesScope } = require("@theme/ScreenRolesProvider");
  return {
    Sheet: ({ children }) => (
      <View testID="sheet">
        <Text testID="sheet-scope">{String(useScreenRolesScope())}</Text>
        {children}
      </View>
    ),
    Button: ({ title, onPress }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
    GurmukhiKeyboard: () => null,
    GurmukhiKeyboardToggle: () => null,
  };
});

jest.mock("./PothiNameField", () => () => null);

jest.mock("../hooks/useDeletePothi", () => () => mockConfirmDelete);

jest.mock("../hooks/useRequireOnline", () => () => () => true);

const pothi = { id: "p1", name: "Nitnem", count: 3 };

const renderSheet = (onClose = jest.fn()) => ({
  onClose,
  ...render(<PothiActionsSheet pothi={pothi} visible onClose={onClose} />),
});

beforeEach(() => {
  mockConfirmDelete.mockClear();
});

describe("the pothi actions sheet", () => {
  it("hosts its own confirm dialog inside the sheet", () => {
    const { getByTestId } = renderSheet();

    expect(within(getByTestId("sheet")).getByTestId("confirm-host")).toBeTruthy();
  });

  // The sheet borrows the Settings palette, which is dark-mode only. A dialog
  // that inherited it came up navy on the Folders tab while every other confirm
  // in the app stayed on the default elevated surface.
  it("raises the confirm on the app palette, not the sheet's own", () => {
    const { getByTestId } = renderSheet();

    expect(getByTestId("sheet-scope")).toHaveTextContent("settings");
    expect(getByTestId("confirm-scope")).toHaveTextContent("null");
  });

  it("raises the confirm without closing the sheet first", () => {
    const { getByLabelText, onClose } = renderSheet();

    fireEvent.press(getByLabelText("Delete"));

    expect(mockConfirmDelete).toHaveBeenCalledTimes(1);
    // The host that answers belongs to this sheet. Closing here would unmount
    // it in the same commit and the dialog would never render.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("passes the targeted pothi, and closes only once the delete is through", () => {
    const { getByLabelText, onClose } = renderSheet();

    fireEvent.press(getByLabelText("Delete"));
    const [target, onDeleted] = mockConfirmDelete.mock.calls[0];

    expect(target).toEqual(pothi);
    expect(onClose).not.toHaveBeenCalled();

    onDeleted();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
