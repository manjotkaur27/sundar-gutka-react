/* eslint-disable react/jsx-props-no-spreading */
/* eslint-env jest */
import React from "react";

import { render, waitFor, fireEvent } from "@testing-library/react-native";

import { getSevaConfig, markSevaSeen } from "../services/sevaConfig";

import SevaScreen from ".";

// -------------------- MOCKS --------------------

let mockState;
jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selectorFn) => selectorFn(mockState),
}));

// Captures registered "focus" listeners so a tab re-visit can be simulated —
// SevaScreen stays mounted in the tab navigator, so re-focus (not re-mount) is
// what has to re-acknowledge the version. The navigation object is a STABLE
// singleton, matching real useNavigation(): returning a fresh object per render
// would make any effect keyed on it re-run every render.
const mockFocusListeners = [];
const mockNavigation = {
  navigate: jest.fn(),
  addListener: (event, cb) => {
    if (event === "focus") mockFocusListeners.push(cb);
    return () => {
      const i = mockFocusListeners.indexOf(cb);
      if (i >= 0) mockFocusListeners.splice(i, 1);
    };
  },
};
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock("react-native-linear-gradient", () => {
  const { View } = require("react-native");
  return (props) => <View {...props} />;
});

jest.mock("react-native-svg", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: (props) => <View testID="svg-headline" {...props} />,
    Defs: (props) => <View {...props} />,
    LinearGradient: (props) => <View {...props} />,
    Stop: (props) => <View {...props} />,
    Text: (props) => <Text testID="svg-headline-text" {...props} />,
  };
});

const mockOpenInAppBrowser = jest.fn();
const mockTrackSevaEvent = jest.fn();
const mockLogError = jest.fn();
// Switchable so the headline can be asserted in BOTH themes (see the
// light/dark parity test below). Reset to "light" in beforeEach.
let mockThemeMode = "light";

jest.mock("@common", () => {
  const { View, Text } = require("react-native");
  const buildTheme = () => ({
    mode: mockThemeMode,
    colors: { primary: "#123456", surface: "#FFFFFF", activeView: "#EEE" },
    staticColors: { WHITE_COLOR: "#FFFFFF" },
    typography: {
      fonts: { balooPaaji: "BalooPaaji2-Regular", balooPaajiSemiBold: "BalooPaaji2-SemiBold" },
    },
  });
  return {
    SafeArea: (props) => <View {...props} />,
    StatusBarComponent: () => null,
    CustomText: (props) => <Text {...props} />,
    useTheme: () => ({ theme: buildTheme() }),
    useThemedStyles: (createStyles) => createStyles(buildTheme()),
    STRINGS: {
      SEVA_MONTHLY: "Monthly",
      SEVA_ANNUALLY: "Annually",
      SEVA_ONE_TIME: "One Time",
      SEVA_PER_YEAR: "year",
      SEVA_PER_MONTH: "month",
      SEVA_OTHER: "Other",
      donate: "Donate",
      SEVA_LOAD_ERROR: "Could not load Seva.",
      SEVA_DONATE_DIRECTLY: "Donate directly",
    },
    openInAppBrowser: (...args) => mockOpenInAppBrowser(...args),
    trackSevaEvent: (...args) => mockTrackSevaEvent(...args),
    logError: (...args) => mockLogError(...args),
  };
});

jest.mock("../common/icons", () => {
  const { Text } = require("react-native");
  return { DonateIcon: (props) => <Text testID="donate-icon" {...props} /> };
});

jest.mock("../services/sevaConfig", () => ({
  getSevaConfig: jest.fn(),
  buildQgivUrl: jest.fn(() => "https://secure.qgiv.com/for/khalisfoundation"),
  markSevaSeen: jest.fn(() => Promise.resolve()),
}));

// -------------------- HELPERS --------------------

const CONFIG_BASE = {
  configVersion: "1",
  country: "US",
  amounts: [10, 50, 100],
  selectedAmount: 10,
  payment_mode: "qgiv_prefill_open",
  showSevaDot: false,
  sevaDotCount: 0,
};

const contentBase = {
  headline: "ਸੁੰਦਰ ਗੁਟਕਾ",
  description: "Test description",
  descriptionLinks: [],
  taxMessage: "US tax message",
  nonUsTaxMessage: "Non-US tax message",
  footerText: "Know coding footer",
};

const nativeFallbackConfig = { ...CONFIG_BASE, content: { ...contentBase, segments: [] } };

const serverDrivenConfig = (segments, overrides = {}) => ({
  ...CONFIG_BASE,
  ...overrides,
  content: { ...contentBase, segments },
});

describe("SevaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { language: "en" };
    mockThemeMode = "light";
    mockFocusListeners.length = 0;
  });

  it("renders the native fallback markup when content.segments is empty", async () => {
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);

    const { getByText } = render(<SevaScreen />);

    await waitFor(() => {
      expect(getByText("Test description")).toBeTruthy();
    });
    expect(getByText("US tax message")).toBeTruthy();
    expect(getByText("Know coding footer")).toBeTruthy();
  });

  it("renders server-driven html segments as real native text, with the donate widget and tax note at their slot positions", async () => {
    getSevaConfig.mockResolvedValue(
      serverDrivenConfig([
        { type: "html", value: "<h1>ਸੁੰਦਰ ਗੁਟਕਾ</h1><p>Built by volunteers.</p>" },
        { type: "slot", name: "donate_widget" },
        { type: "slot", name: "tax_note" },
        { type: "html", value: '<p class="seva-footer">Know coding?</p>' },
      ])
    );

    const { getByTestId, getByText } = render(<SevaScreen />);

    await waitFor(() => {
      expect(getByText("Built by volunteers.")).toBeTruthy();
    });

    // Headline keeps its SVG gradient rendering in light mode.
    expect(getByTestId("svg-headline")).toBeTruthy();
    expect(getByText("ਸੁੰਦਰ ਗੁਟਕਾ")).toBeTruthy();
    // Native donate widget (real, interactive component) still renders.
    expect(getByTestId("donate-icon")).toBeTruthy();
    // Native, country-conditional tax note — real text, not backend HTML.
    expect(getByText("US tax message")).toBeTruthy();
    // Footer html segment renders too, and isn't clipped away.
    expect(getByText("Know coding?")).toBeTruthy();
  });

  it("renders an inline link from server-driven content and opens it in the in-app browser", async () => {
    getSevaConfig.mockResolvedValue(
      serverDrivenConfig([
        {
          type: "html",
          value: '<p>Built by <a href="https://khalisfoundation.org/">Khalis Foundation</a>.</p>',
        },
      ])
    );

    const { getByText } = render(<SevaScreen />);

    await waitFor(() => {
      expect(getByText("Khalis Foundation")).toBeTruthy();
    });

    fireEvent.press(getByText("Khalis Foundation"));

    expect(mockOpenInAppBrowser).toHaveBeenCalledWith(
      "https://khalisfoundation.org/",
      expect.any(Object)
    );
  });

  it("shows the non-US tax message at the tax_note slot when the donor is outside the US", async () => {
    getSevaConfig.mockResolvedValue(
      serverDrivenConfig([{ type: "slot", name: "tax_note" }], { country: "CA" })
    );

    const { getByText } = render(<SevaScreen />);

    await waitFor(() => {
      expect(getByText("Non-US tax message")).toBeTruthy();
    });
  });

  it("acknowledges the current version on open (markSevaSeen) regardless of segments", async () => {
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);
    render(<SevaScreen />);
    await waitFor(() => {
      expect(markSevaSeen).toHaveBeenCalledTimes(1);
    });
  });

  it("re-acknowledges the version when the tab is re-focused, not just on mount", async () => {
    // The screen stays mounted in the tab navigator, so its mount effect never
    // re-runs on a second visit. Without a focus listener, a dot that appeared
    // mid-session would stay stuck on the tab even while the user is viewing
    // this page.
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);
    render(<SevaScreen />);

    await waitFor(() => expect(markSevaSeen).toHaveBeenCalledTimes(1));
    expect(mockFocusListeners.length).toBeGreaterThan(0);

    // Simulate leaving and re-tapping the Seva tab (no re-mount).
    mockFocusListeners.forEach((cb) => cb());

    expect(markSevaSeen).toHaveBeenCalledTimes(2);
  });

  describe("headline light/dark parity", () => {
    const renderHeadlineIn = async (mode) => {
      mockThemeMode = mode;
      getSevaConfig.mockResolvedValue(
        serverDrivenConfig([{ type: "html", value: "<h1>ਸੁੰਦਰ ਗੁਟਕਾ</h1>" }])
      );
      const { getByTestId } = render(<SevaScreen />);
      await waitFor(() => expect(getByTestId("svg-headline-text")).toBeTruthy());
      return getByTestId("svg-headline-text").props;
    };

    it("uses the blue gradient fill in light mode and flat white in dark mode", async () => {
      const light = await renderHeadlineIn("light");
      expect(light.fill).toBe("url(#headlineGrad)");

      const dark = await renderHeadlineIn("dark");
      expect(dark.fill).toBe("#FFFFFF");
    });

    it("renders at the SAME font size and weight in both modes — only the colour differs", async () => {
      const light = await renderHeadlineIn("light");
      const dark = await renderHeadlineIn("dark");

      expect(dark.fontSize).toBe(light.fontSize);
      expect(dark.fontWeight).toBe(light.fontWeight);
      expect(dark.fontFamily).toBe(light.fontFamily);
    });
  });
});
