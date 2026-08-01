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
jest.mock("@react-navigation/native", () => {
  const ReactModule = require("react");
  return {
    useNavigation: () => mockNavigation,
    // Runs the focus callback on mount (initial focus) and registers it so a
    // tab re-visit can be simulated by invoking the captured mockFocusListeners.
    useFocusEffect: (cb) => {
      ReactModule.useEffect(() => {
        const cleanup = cb();
        mockFocusListeners.push(cb);
        return () => {
          const i = mockFocusListeners.indexOf(cb);
          if (i >= 0) mockFocusListeners.splice(i, 1);
          if (typeof cleanup === "function") cleanup();
        };
      }, [cb]);
    },
  };
});

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
    staticColors: { WHITE_COLOR: "#FFFFFF", NIGHT_BLACK: "#041126" },
    typography: {
      fonts: { balooPaaji: "BalooPaaji2-Regular", balooPaajiSemiBold: "BalooPaaji2-SemiBold" },
      sizes: { xxl: 22 },
      weights: { normal: "400" },
    },
  });
  return {
    SafeArea: (props) => <View {...props} />,
    StatusBarComponent: () => null,
    GradientDivider: () => null,
    CustomText: (props) => <Text {...props} />,
    useTheme: () => ({ theme: buildTheme() }),
    useThemedStyles: (createStyles) => createStyles(buildTheme()),
    STRINGS: {
      SEVA: "Seva",
      SEVA_MONTHLY: "Monthly",
      SEVA_ANNUALLY: "Annually",
      SEVA_ONE_TIME: "One Time",
      SEVA_PER_YEAR: "year",
      SEVA_PER_MONTH: "month",
      SEVA_OTHER: "Other",
      donate: "Donate",
      SEVA_LOAD_ERROR: "Could not load Seva.",
      SEVA_DONATE_DIRECTLY: "Donate directly",
      SEVA_SUPPORT_HEADER: "Support Sundar Gutka",
      SEVA_OTHER_MEANS: "Seva by other means",
      SEVA_SPREAD_WORD: "Seva by spreading the word",
      SEVA_FOR_CODERS: "Seva for coders",
      SEVA_BY_TESTING: "Seva by testing our work",
      SEVA_OTHER_OPPORTUNITIES: "Seva by other opportunities",
    },
    openInAppBrowser: (...args) => mockOpenInAppBrowser(...args),
    trackSevaEvent: (...args) => mockTrackSevaEvent(...args),
    logError: (...args) => mockLogError(...args),
  };
});

// Mock the components barrel directly so the real one (which pulls in
// BaniLengthSelector → firebase ESM) is never loaded in the test.
jest.mock("@common/components", () => {
  const { View, Text } = require("react-native");
  return {
    AppBar: ({ title, rightComponent }) => (
      <View>
        <Text>{title}</Text>
        {rightComponent}
      </View>
    ),
    BackIconComponent: (props) => <View {...props} />,
  };
});

jest.mock("../common/icons", () => {
  const { Text } = require("react-native");
  const Stub = (props) => <Text {...props} />;
  return {
    DonateIcon: (props) => <Text testID="donate-icon" {...props} />,
    CloseIcon: (props) => <Text testID="close-icon" {...props} />,
    ChevronRight: Stub,
    SevaIcon: Stub,
    HandHeartIcon: Stub,
    MegaphoneIcon: Stub,
    CodeIcon: Stub,
    ClipboardCheckIcon: Stub,
    ExternalLinkIcon: (props) => <Text testID="external-link-icon" {...props} />,
    StarIcon: Stub,
  };
});

jest.mock("../services/sevaMeans", () => ({
  prewarmSevaMeans: jest.fn(() => Promise.resolve()),
  SEVA_MEANS_PAGE_KEYS: ["social", "coding", "qa", "other"],
}));

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

  it("renders the donate widget + tax note as a safety net when segments are empty", async () => {
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);

    const { getByTestId, getByText } = render(<SevaScreen />);

    await waitFor(() => expect(getByTestId("donate-icon")).toBeTruthy());
    expect(getByText("US tax message")).toBeTruthy();
  });

  it("renders the server-driven layout: hero, donate card, tax note, section header and means item", async () => {
    getSevaConfig.mockResolvedValue(
      serverDrivenConfig([
        {
          type: "html",
          value:
            '<h1 class="seva-hero-title">Support our mission.</h1>' +
            '<p class="seva-hero-desc">Built by volunteers.</p>',
        },
        { type: "card_open", name: "donate" },
        {
          type: "html",
          value:
            '<h2 class="seva-card-title">Seva with your support</h2>' +
            '<p class="seva-card-sub">Your support keeps this mission alive.</p>',
        },
        { type: "slot", name: "donate_widget" },
        { type: "slot", name: "tax_note" },
        { type: "card_close" },
        { type: "html", value: '<h2 class="seva-section">Other ways to do Seva</h2>' },
        {
          type: "html",
          value:
            '<p class="seva-means"><a href="seva-means:coding">Seva for coders</a>' +
            "Contribute to our open source projects</p>",
        },
      ])
    );

    const { getByTestId, getByText } = render(<SevaScreen />);

    await waitFor(() => expect(getByText("Support our mission.")).toBeTruthy());
    expect(getByText("Built by volunteers.")).toBeTruthy();
    // Donate card header (server-driven title + subtitle).
    expect(getByText("Seva with your support")).toBeTruthy();
    expect(getByText("Your support keeps this mission alive.")).toBeTruthy();
    // Native donate widget + country-conditional tax note.
    expect(getByTestId("donate-icon")).toBeTruthy();
    expect(getByText("US tax message")).toBeTruthy();
    // Section header + a means item (title + subtitle) from the server.
    expect(getByText("Other ways to do Seva")).toBeTruthy();
    expect(getByText("Seva for coders")).toBeTruthy();
    expect(getByText("Contribute to our open source projects")).toBeTruthy();
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

  it("re-syncs the config and re-acknowledges the version when the tab is re-focused", async () => {
    // The screen stays mounted in the tab navigator, so its mount effect never
    // re-runs on a second visit. On every open it must re-sync the Seva config
    // from the server (network → cache → bundled) AND re-acknowledge the version
    // so a dot that appeared mid-session clears while the user views this page.
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);
    render(<SevaScreen />);

    await waitFor(() => expect(markSevaSeen).toHaveBeenCalledTimes(1));
    expect(getSevaConfig).toHaveBeenCalledTimes(1);
    expect(mockFocusListeners.length).toBeGreaterThan(0);

    // Simulate leaving and re-tapping the Seva tab (no re-mount): it re-syncs.
    getSevaConfig.mockClear();
    markSevaSeen.mockClear();
    mockFocusListeners.forEach((cb) => cb());

    await waitFor(() => {
      expect(getSevaConfig).toHaveBeenCalledTimes(1);
      expect(markSevaSeen).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the regular AppBar with a 'Seva' title (no in-page SG heading)", async () => {
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);
    const { getAllByText } = render(<SevaScreen />);
    await waitFor(() => expect(getAllByText("Seva").length).toBeGreaterThan(0));
  });

  it("has a cross button that navigates to Home / All Banis", async () => {
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);
    const { getByLabelText } = render(<SevaScreen />);
    await waitFor(() => expect(getByLabelText("close-seva")).toBeTruthy());

    fireEvent.press(getByLabelText("close-seva"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Home");
  });

  it("navigates to the SDUI page when a server-driven means item is tapped", async () => {
    getSevaConfig.mockResolvedValue(
      serverDrivenConfig([
        {
          type: "html",
          value:
            '<p class="seva-means"><a href="seva-means:coding">Seva for coders</a>' +
            "Contribute to our open source projects</p>",
        },
      ])
    );
    const { getByText, getByLabelText } = render(<SevaScreen />);

    await waitFor(() => expect(getByText("Seva for coders")).toBeTruthy());
    fireEvent.press(getByLabelText("seva-means-coding"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("SevaMeans", { page: "coding" });
  });

  it("opens the browser instead of navigating when a means item carries ?open=", async () => {
    // The QA row links straight to the bug-report form rather than to a
    // sub-page holding a single link. The page key before the `?` must still
    // resolve (it drives the icon), but the tap must not navigate.
    const form = "https://docs.google.com/forms/d/e/ABC/viewform?usp=sharing&ouid=123";
    getSevaConfig.mockResolvedValue(
      serverDrivenConfig([
        {
          type: "html",
          value:
            `<p class="seva-means"><a href="seva-means:qa?open=${encodeURIComponent(form)}">` +
            "Seva by testing our work</a>Help us find bugs</p>",
        },
      ])
    );
    const { getByText, getByLabelText, queryByTestId } = render(<SevaScreen />);

    await waitFor(() => expect(getByText("Seva by testing our work")).toBeTruthy());

    // The row must LOOK like it leaves the app, not like it pushes a screen.
    expect(queryByTestId("external-link-icon")).toBeTruthy();

    fireEvent.press(getByLabelText("seva-means-qa"));

    // The `&` in the form URL must survive the round trip intact.
    expect(mockOpenInAppBrowser).toHaveBeenCalledWith(form, expect.any(Object));
    expect(mockNavigation.navigate).not.toHaveBeenCalledWith("SevaMeans", { page: "qa" });
  });

  it("shows the localised currency figure on the amount presets", async () => {
    // Device locale is unresolved in the jest environment → defaults to USD, so
    // presets read "$10 / $50 / $100" (symbol + figure), proving the currency
    // formatting path is wired without depending on a specific device region.
    getSevaConfig.mockResolvedValue(nativeFallbackConfig);
    const { getByText } = render(<SevaScreen />);
    await waitFor(() => expect(getByText("$10")).toBeTruthy());
    expect(getByText("$50")).toBeTruthy();
    expect(getByText("$100")).toBeTruthy();
  });

  it("prefers the backend's countryCode over the (unresolved) device locale for currency", async () => {
    // Device locale is unresolved in this jest environment, so absent an
    // override it would default to USD (see the test above). Once the
    // backend supplies a countryCode ("IN"), that must win instead — proving
    // resolveCurrency(config?.countryCode) is actually wired through, not
    // just resolveCurrency() with the device falling back to USD by luck.
    getSevaConfig.mockResolvedValue({ ...nativeFallbackConfig, countryCode: "IN" });
    const { getByText } = render(<SevaScreen />);
    await waitFor(() => expect(getByText("₹1,000")).toBeTruthy());
    expect(getByText("₹5,000")).toBeTruthy();
  });
});
