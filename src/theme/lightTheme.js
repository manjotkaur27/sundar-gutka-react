import borderRadius from "./borderRadius";
import components from "./components";
import { light as lightElevation } from "./elevation";
import layout from "./layout";
import palette from "./palette";
import radii from "./radii";
import { light as lightColors } from "./semanticColors";
import space from "./space";
import spacing from "./spacing";
import staticColors from "./staticColors";
import type from "./type";
import typography from "./typography";

const lightTheme = {
  mode: "light",
  // ── The design system ──────────────────────────────────────────────────
  // `c` is the semantic colour layer — the one new code should use. The legacy
  // `colors`/`staticColors` maps below it are deprecated and migrate away
  // screen by screen. See docs/UI_OVERHAUL_PLAN.md.
  c: lightColors,
  palette,
  space,
  radii,
  type,
  layout,
  elevation: lightElevation,

  // ── Deprecated ─────────────────────────────────────────────────────────
  // Everything below predates the token layer and is being migrated out. Do
  // not add new consumers.
  colors: {
    primary: "#113979",
    surface: "rgba(255, 255, 255, 1)",
    // Raised surface for floating elements. Light mode conveys elevation with a
    // real shadow, so this matches the base surface.
    surfaceElevated: "#ffffff",
    primaryText: "#121212",
    primaryVariant: "#DEBB0A",
    surfaceGrey: "#faf9f6",
    textDisabled: "#a3a3a3",
    underlayColor: "#009bff",
    headerVariant: "#003436",
    baniDB: "#eaa040",
    shadow: "#000",
    highlightTuk: "#0066ff",
    activeView: "#C7C7D7",
    inactiveView: "#e9e9ee",
    componentColor: "#232323",
    enabledText: "#0066ff",
    disabledText: "#a3a3a3",
    primaryHeader: "#113979",
    primaryHeaderVariant: "#113979",
    actionButton: "#D3E1F7",
    audioPlayer: "rgba(17, 57, 121, 0.5)",
    overlay: staticColors.SEMI_TRANSPARENT,
    audioTitleText: "#113979",
    trackBorderColor: staticColors.TRACK_COLOR,
    trackBackgroundColor: staticColors.TRACK_COLOR,
    controlBarBackgroundColor: "#ffffff",
    separator: "#eeeeee",
    transparentOverlay: "rgba(255, 255, 255, 0.95)",
    audioSettingsModalText: "#666666",
  },
  staticColors,
  typography,
  spacing,
  components,
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
  },
  images: {
    khalisLogo: require("../../images/khalislogo150.png"),
    baniDBLogo: require("../../images/banidblogo.png"),
  },
  borderRadius,
};

export default lightTheme;
