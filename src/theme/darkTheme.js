import borderRadius from "./borderRadius";
import components from "./components";
import { dark as darkElevation } from "./elevation";
import layout from "./layout";
import palette from "./palette";
import radii from "./radii";
import { dark as darkColors } from "./semanticColors";
import space from "./space";
import spacing from "./spacing";
import staticColors from "./staticColors";
import type from "./type";
import typography from "./typography";

const darkTheme = {
  mode: "dark",
  // ── The design system ──────────────────────────────────────────────────
  // `c` is the semantic colour layer — the one new code should use. The legacy
  // `colors`/`staticColors` maps below it are deprecated and migrate away
  // screen by screen. See docs/UI_OVERHAUL_PLAN.md.
  c: darkColors,
  palette,
  space,
  radii,
  type,
  layout,
  elevation: darkElevation,

  // ── Deprecated ─────────────────────────────────────────────────────────
  // Everything below predates the token layer and is being migrated out. Do
  // not add new consumers.
  colors: {
    primary: "#113979",
    surface: "rgba(18, 18, 18, 1)",
    // Raised surface for floating elements. On a dark ground a shadow has too
    // little contrast to read as depth, so elevation is expressed by lightening
    // the surface instead: Material's 4dp overlay is 9% white, which over
    // #121212 gives #272727.
    surfaceElevated: "#272727",
    primaryText: "#faf9f6",
    primaryVariant: "#99852c",
    surfaceGrey: "#464646",
    textDisabled: "#A0AEC0",
    underlayColor: "#009bff",
    headerVariant: "#003436",
    baniDB: "#eaa040",
    shadow: "#fff",
    highlightTuk: "#77baff",
    activeView: "#062346",
    inactiveView: "#041126",
    componentColor: "#fefefe",
    enabledText: "#2581df",
    disabledText: "#a3a3a3",
    primaryHeader: "#121212",
    primaryHeaderVariant: "#faf9f6",
    actionButton: "#121F35",
    audioPlayer: "#BED2F2",
    overlay: staticColors.NIGHT_BLACK,
    audioTitleText: "#BED2F2",
    trackBorderColor: "#464646",
    trackBackgroundColor: "rgba(37, 105, 214, 0.2)",
    controlBarBackgroundColor: "#000000",
    separator: "rgba(190, 210, 242, 0.23)",
    transparentOverlay: "rgba(18, 18, 18, 0.95)",
    audioSettingsModalText: "#faf9f6",
  },
  typography,
  spacing,
  components,
  staticColors,
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
  },
  images: {
    khalisLogo: require("../../images/khalislogo150white.png"),
    baniDBLogo: require("../../images/banidblogo.png"),
  },
  borderRadius,
};

export default darkTheme;
