import React from "react";
import { RefreshControl } from "react-native-gesture-handler";

import { act, render } from "@testing-library/react-native";

import PothiList from "./PothiList";

// Pulling down on the Pothis tab must run the same account sync as pulling
// down on the Dashboard — one request, one spinner that ends when it ends.

const mockRequestPull = jest.fn(() => Promise.resolve());
jest.mock("@service/dashboard/syncSignal", () => ({
  requestPull: (...a) => mockRequestPull(...a),
}));

let mockState;
jest.mock("react-redux", () => ({
  useSelector: (fn) => fn(mockState),
  useDispatch: () => jest.fn(),
}));

// The draggable list is a native-gesture component; here it only has to hand
// the refresh control through, the way the FlatList it wraps does.
jest.mock("react-native-draggable-flatlist", () => {
  const ReactModule = require("react");
  const { View } = require("react-native");
  const DraggableFlatList = ({
    refreshControl,
    ListHeaderComponent,
    simultaneousHandlers,
    onDragBegin,
    onDragEnd,
  }) =>
    ReactModule.createElement(
      View,
      { testID: simultaneousHandlers ? "scrolls-with-refresh" : "scrolls-alone" },
      refreshControl,
      ListHeaderComponent,
      // Stand-ins for the list's own drag lifecycle, so a test can reorder.
      ReactModule.createElement(View, { testID: "drag-begin", onPress: () => onDragBegin(0) }),
      ReactModule.createElement(View, {
        testID: "drag-end",
        onPress: () => onDragEnd({ data: [] }),
      })
    );
  return { __esModule: true, default: DraggableFlatList, ScaleDecorator: View };
});
// The gesture-handler RefreshControl is a native wrapper around React
// Native's; under jest it stands in for itself and only has to be findable.
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: require("react-native").View,
  RefreshControl: require("react-native").RefreshControl,
}));

jest.mock("@common/hooks/useScreenPalette", () => () => ({ surface: "#fff" }));
jest.mock("@common/hooks/useTokens", () => () => ({
  c: { textPrimary: "#000", textSecondary: "#333" },
  space: { xs: 4, sm: 8, md: 12 },
  layout: { screenGutter: 16, screenPaddingBottom: 24 },
}));
jest.mock("@common/icons", () => ({ DragHandleIcon: () => null }));
jest.mock("@common", () => ({
  actions: { setPothiOrder: (ids) => ({ type: "SET_POTHI_ORDER", ids }) },
  STRINGS: { POTHI_EMPTY_BODY: "", POTHI_DEFAULT_FOLDERS: "Default Folders" },
  trackPothiEvent: jest.fn(),
  useCustomScrollbar: () => ({ ownedScrollProps: {}, Indicator: null }),
}));
jest.mock("./hooks/usePothiTitle", () => () => ({
  titleFor: (row) => row.name,
  variantFor: () => "body",
}));
jest.mock("./hooks/useRequireOnline", () => () => () => true);
jest.mock("./hooks/useSignedOutPothiHint", () => () => {});
jest.mock("./components/NewPothiRow", () => () => null);
jest.mock("./components/PothiActionsSheet", () => () => null);
jest.mock("./components/PothiRow", () => () => null);
jest.mock("../common/components/ui", () => ({
  ListSeparator: () => null,
  Text: require("react-native").Text,
}));

const pothis = { folders: [], deletedIds: [], seededDefaults: true };
const open = () =>
  render(
    <PothiList
      baniListData={[]}
      onOpenPothi={jest.fn()}
      onCreatePress={jest.fn()}
      onPinLimit={jest.fn()}
    />
  );

beforeEach(() => {
  mockRequestPull.mockClear();
});

it("pulling down runs the account sync and spins until it has finished", async () => {
  mockState = { auth: { status: "signedIn" }, pothis };
  let settle;
  mockRequestPull.mockReturnValue(
    new Promise((resolve) => {
      settle = resolve;
    })
  );
  const rendered = open();
  const control = rendered.UNSAFE_getByType(RefreshControl);
  expect(control.props.refreshing).toBe(false);
  // The list must scroll simultaneously with the refresh gesture, or the
  // drag gesture swallows the pull on Android.
  expect(rendered.getByTestId("scrolls-with-refresh")).toBeTruthy();

  await act(async () => {
    control.props.onRefresh();
  });
  expect(mockRequestPull).toHaveBeenCalledWith("pull-to-refresh");
  expect(rendered.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);

  await act(async () => {
    settle();
  });
  expect(rendered.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
});

it("switches the pull-down off for the whole of a reorder", () => {
  mockState = { auth: { status: "signedIn" }, pothis };
  const rendered = open();
  expect(rendered.UNSAFE_getByType(RefreshControl).props.enabled).toBe(true);
  act(() => rendered.getByTestId("drag-begin").props.onPress());
  expect(rendered.UNSAFE_getByType(RefreshControl).props.enabled).toBe(false);
  act(() => rendered.getByTestId("drag-end").props.onPress());
  expect(rendered.UNSAFE_getByType(RefreshControl).props.enabled).toBe(true);
});

it("offers no pull-down while signed out — there is no account to pull", () => {
  mockState = { auth: { status: "signedOut" }, pothis };
  expect(open().UNSAFE_queryByType(RefreshControl)).toBeNull();
});
