import { Platform, StyleSheet } from "react-native";
import { constant } from "@common";

const SHADOW = {
  light: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1.5,
    elevation: 1,
  },
  medium: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
};

// Light, "electric" blue glow for the minimized player in light mode (replaces
// the black elevation shadow Android was drawing as a square). It must read as a
// soft halo, not a hard outline: a faint translucent light-blue hairline plus a
// wide, soft blue shadow on iOS. elevation stays 0 so Android draws no rectangle.
const ELECTRIC_BLUE = "#5AC8FA";

const LIGHT_GLOW = (radius) => ({
  // Translucent + hairline so it diffuses into a glow rather than a solid border.
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(90, 200, 250, 0.45)",
  shadowColor: ELECTRIC_BLUE,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: Platform.OS === "ios" ? 0.9 : 0,
  shadowRadius: radius,
  elevation: 0,
});

const createStyles = (theme) => ({
  mainContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: theme.borderRadius.sm,
    margin: theme.spacing.md_12,
    ...SHADOW.light,
  },
});

export const audioControlBarStyles = (theme) => ({
  blurOverlay: {
    position: "relative",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.separator,
    borderWidth: 1,
    overflow: "hidden",
  },
  container: {
    position: "relative",
    bottom: 0,
    left: 0,
    right: 0,
    marginBottom: theme.spacing.md_12,
  },
  mainContainer: {
    width: "95%",
    marginLeft: "auto",
    marginRight: "auto",
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.separator,
    borderWidth: 1,
    ...SHADOW.light,
    // Android draws the elevation shadow as a RECTANGLE (ignoring borderRadius)
    // unless the background is fully opaque — the 0.95-alpha transparentOverlay
    // was leaving a square behind the rounded bar in light mode. Use an opaque
    // surface on Android; iOS keeps the translucent overlay (its BlurView sits on
    // top and its shadow already clips to the rounded shape).
    backgroundColor:
      Platform.OS === "android" ? theme.colors.surface : theme.colors.transparentOverlay,
  },

  minimizePlayerAnimation: {
    opacity: 0,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  minimizePlayerAnimationActive: {
    zIndex: 1,
  },
  modalAnimation: {
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    justifyContent: "center",
    zIndex: 1,
  },
  moreTracksModalContainer: {
    width: "90%",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: theme.spacing.lg,
    zIndex: 20,
  },
  moreTracksHeaderText: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.lg,
    textAlign: "center",
    color: theme.colors.audioTitleText,
    marginBottom: theme.spacing.sm,
  },
  timestampWithColor: {
    color: theme.colors.audioPlayer,
  },
  topControlBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 40,
    padding: 5,
    width: "100%",
    marginLeft: "auto",
    marginRight: "auto",
    zIndex: 1,
  },
  leftControls: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    // Allow the action-button group to shrink so longer localized labels
    // (e.g. "Impostazioni audio") never push the right-hand controls off-screen.
    flexShrink: 1,
    minWidth: 0,
  },
  rightControls: {
    flexDirection: "row",
    gap: theme.spacing.md_12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    borderRadius: theme.borderRadius.xl,
    flexShrink: 1,
    minWidth: 0,
  },
  actionButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontFamily: theme.typography.fonts.balooPaaji,
    // Shrinks within the pill; combined with adjustsFontSizeToFit the label
    // scales down to fit instead of wrapping or clipping.
    flexShrink: 1,
    minWidth: 0,
  },
  actionButtonContent: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    height: "100%",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  actionButtonIconContainer: {
    height: "100%",
    justifyContent: "center",
  },
  separator: {
    height: 2,
    backgroundColor: theme.colors.separator,
    zIndex: 1,
  },
  mainSection: {
    paddingHorizontal: theme.spacing.md_12,
    zIndex: 1,
  },
  trackInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginLeft: "auto",
    marginRight: "auto",
  },
  trackInfoLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.md,
  },
  trackName: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
    color: theme.colors.audioTitleText,
  },
  trackInfoText: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.balooPaaji,
    marginBottom: 2,
  },
  playbackControls: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md_12,
    gap: theme.spacing.md_12,
  },
  playButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonLoadingSpinner: {
    minWidth: 30,
  },
  progressContainer: {
    flex: 1,
    marginTop: 2,
    justifyContent: "center",
  },
  progressBar: {
    position: "relative",
    justifyContent: "center",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  timestamp: {
    fontSize: theme.typography.sizes.md,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontWeight: theme.typography.weights.normal,
  },
  seekLoadingOverlay: {
    position: "absolute",
    right: 0,
    top: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});

export const audioTrackDialogStyles = (theme) => ({
  modalWrapper: {
    position: "relative",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  blurOverlay: {
    // Absolutely fill the card so the frosted blur sits BEHIND the modal
    // content. With position:"relative" it collapsed to a zero-height sibling
    // and never covered anything, leaving the iOS card transparent so the bani
    // text bled through and collided with the modal text.
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    borderRadius: theme.borderRadius.md,
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.staticColors.TRACK_COLOR,
    width: "95%",
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: theme.spacing.md_12,
    // Clip the absolutely-filled BlurView to the card's rounded corners.
    overflow: "hidden",
  },
  containerIOS: {
    // Fallback tint under the BlurView so the card is never fully see-through
    // (e.g. when reduce-transparency is enabled and the blur renders solid).
    backgroundColor: theme.colors.transparentOverlay,
  },
  containerAndroid: {
    // Android has no BlurView compositing over this card (that's iOS-only, see
    // above), so the 0.95-alpha transparentOverlay left the card genuinely
    // see-through — invisible over normal content but visible as a translucent
    // strip wherever it overlapped the system nav bar when not hidden. Use a
    // fully opaque surface on Android, matching the same fix already applied to
    // AudioControlBar's mainContainer for the identical reason.
    backgroundColor: theme.colors.surface,
  },
  header: {
    alignItems: "center",
    zIndex: 1,
  },
  closeButton: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
  },

  welcomeText: {
    fontFamily: constant.BALOO_PAAJI_SEMI_BOLD,
    fontSize: theme.typography.sizes.xxl,
    textAlign: "center",
    color: theme.colors.audioTitleText,
    // Reserve room on BOTH sides for the absolutely-positioned close (X) button
    // (icon 30 + right inset) so the centered title never slides under it in
    // longer translations (e.g. Italian/German) — symmetric so it stays centred
    // and works whichever side is trailing in RTL (Shahmukhi). Title wraps if a
    // translation is very long, which is preferable to overlapping the X.
    paddingHorizontal: theme.spacing.xxl,
  },
  subtitleText: {
    fontFamily: constant.BALOO_PAAJI,
    fontSize: theme.typography.sizes.lg,
    textAlign: "center",
    color: theme.colors.audioTitleText,
  },
  previewHintText: {
    marginTop: theme.spacing.xs,
    fontFamily: constant.BALOO_PAAJI,
    fontSize: theme.typography.sizes.md,
    textAlign: "center",
    color: theme.colors.audioTitleText,
    opacity: 0.85,
  },
  offlineBanner: {
    alignSelf: "stretch",
    backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    zIndex: 1,
  },
  offlineBannerText: {
    fontFamily: constant.BALOO_PAAJI,
    fontSize: theme.typography.sizes.md,
    textAlign: "center",
    color: theme.colors.audioTitleText,
    opacity: 0.9,
  },
  trackList: {
    maxHeight: 200,
    zIndex: 1,
  },
  trackSectionHeader: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.audioTitleText,
    opacity: 0.6,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  // Reserves a thin lane on the right so the native scroll indicator floats
  // in the gap next to each pill instead of drawing on top of it.
  trackListContent: {
    paddingRight: 6,
  },
  trackItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl_20,
    marginBottom: theme.spacing.md,
    marginRight: 2,
    // borderWidth: 2,
    borderColor: "transparent",
    minHeight: 36, // Consistent height for Android
  },
  selectedTrackItem: {
    backgroundColor: theme.colors.primary,
    color: theme.staticColors.WHITE_COLOR,
    borderColor: theme.colors.primary,
  },
  // Right-hand group of each artist row: optional offline tick + play/stop icon.
  trackItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexShrink: 0,
  },
  trackName: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.normal,
    flex: 1,
  },
  selectedTrackName: {
    color: theme.staticColors.WHITE_COLOR,
  },
  // Offline + not downloaded: greyed and non-interactive.
  trackItemDisabled: {
    opacity: 0.4,
  },
  // Footer row holds the Next/Play button, pinned to the bottom-right corner.
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  playButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md_12,
    paddingHorizontal: theme.spacing.xl,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    // Fixed width so the button does not resize when the countdown text
    // changes (e.g. "Next (30s)" → "Next (9s)" drops a character).
    minWidth: 150,
    zIndex: 1,
    overflow: "hidden",
  },
  playButtonText: {
    color: theme.staticColors.WHITE_COLOR,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    marginRight: theme.spacing.md,
    fontFamily: theme.typography.fonts.balooPaaji,
    fontVariant: ["tabular-nums"],
  },
  nextLoadingSpinner: {
    marginRight: theme.spacing.sm,
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  previewProgressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  previewProgressFill: {
    height: "100%",
    backgroundColor: theme.staticColors.WHITE_COLOR,
  },
});

export const downloadBadgeStyles = (theme) => ({
  container: {
    position: "relative",
    zIndex: 10,
    bottom: 0,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    marginRight: theme.spacing.xl_20,
    backgroundColor: theme.colors.separator,
    // Size to the content (icon + label) instead of a fixed 35%, so longer
    // localized strings ("Téléchargement en cours", etc.) don't overflow.
    // maxWidth keeps it from spanning the whole player on small screens.
    maxWidth: "90%",
    alignSelf: "flex-end",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.md_12,
  },
  downloadedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  downloadButtonText: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.light,
    color: theme.colors.primaryHeaderVariant,
    flexShrink: 1,
    minWidth: 0,
  },
});

export const minimizePlayerStyles = (theme) => ({
  container: {
    position: "absolute",
    bottom: 10,
    right: theme.spacing.xl_20,
    // Fixed height prevents the pill from elongating if text wraps or font
    // metrics vary across devices/locales. Circle (28px) + paddingVertical*2 (8px) = 36px;
    // 44px gives a comfortable touch target with a small visual top/bottom margin.
    height: 44,
    // The pill sizes to its content, so a short artist name never leaves a gap
    // and a normal-length one ("Bibi Indermohan Kaur") still shows in FULL — no
    // truncation. It is not unbounded, though: MinimizePlayer caps the text panel
    // to the viewport (maxTextWidth), so a long name on a narrow device can no
    // longer push the pill off-screen. The drag-release clamp handles position.
    borderRadius: theme.borderRadius.xl,
    // Symmetric horizontal padding only — this keeps the COLLAPSED pill a perfect
    // 44x44 circle (28 icon + 8+8). The right breathing room after the artist name
    // lives on textContainer so it doesn't deform the collapsed circle.
    paddingHorizontal: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    ...SHADOW.medium,
    // Dark mode: no shadow at all. A shadow has too little contrast against the
    // dark bani to read as depth, and colouring it light turns it into a halo
    // rather than a lift. Elevation is expressed the way Material does on dark
    // surfaces instead — a lighter surface plus a hairline edge.
    // The cast shadow also rendered inconsistently across the supported range:
    // shadowColor only tints Android's elevation shadow from API 28, so the
    // same pill glowed white on Android 9+ and drew a plain (invisible) black
    // shadow on API 24-27. shadowOpacity/Radius are iOS-only throughout.
    // Light mode: the black elevation shadow rendered as a square — replace it
    // with a soft, light electric-blue glow halo.
    ...(theme.mode === "dark"
      ? {
          backgroundColor: theme.colors.surfaceElevated,
          // Explicit zeroes: SHADOW.medium above sets elevation 4 and an
          // offset, which would otherwise still cast on both platforms.
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255, 255, 255, 0.16)",
        }
      : LIGHT_GLOW(12)),
  },
  progressContainer: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    position: "absolute",
    zIndex: 1,
  },
  svgContainer: {
    position: "absolute",
  },
  textWrap: {
    overflow: "hidden",
    flexShrink: 1,
  },
  textContainer: {
    justifyContent: "center",
    // Gap between the play/pause circle and the artist/duration text. Reduced
    // ~40% from md_12 (12) to tighten the pill without changing its size.
    paddingLeft: 7,
    // Right breathing room after the artist name (only present when expanded, so
    // the collapsed circle stays a circle). With the container's md right pad this
    // gives the same ~12px gap, just without widening the collapsed pill.
    paddingRight: theme.spacing.sm,
  },
  // includeFontPadding:false on BOTH lines is load-bearing, not cosmetic. Android
  // otherwise reserves extra ascent/descent padding inside each Text; with the
  // tight lineHeights below that padding is proportionally large and asymmetric,
  // so the glyphs sit off-centre inside their own line box. The pill's
  // alignItems:"center" then centres the BOX correctly while the visible text
  // still looks pushed up/down — which is exactly the "not vertically centred"
  // bug. Stripping the font padding makes the line box hug the glyphs, so
  // centring the box centres what you actually see. (Same fix as the Seva
  // amount's currency/amountDisplay.)
  timestamp: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.sm,
    // Tight line box (≈ font size) strips the font's bottom leading, which is the
    // main source of the gap down to the artist name below.
    lineHeight: theme.typography.sizes.sm + 2,
    color: theme.colors.audioTitleText,
    opacity: 0.7,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  artistName: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
    // Tight line box, pulled up so the two lines read as one block. The negative
    // margin was -3.5, which closed the gap entirely and made the timestamp and
    // the name look stuck together; -1.5 gives back ~2px of breathing room
    // without letting the pair drift apart. Do not push this below ~-2 again.
    lineHeight: theme.typography.sizes.md + 2,
    color: theme.colors.audioTitleText,
    marginTop: -1.5,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

export const audioSettingModalStyles = (theme) => ({
  settingsModalContainer: {
    width: "95%",
    marginLeft: "auto",
    marginRight: "auto",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  settingItemTitle: {
    flex: 1,
    marginRight: theme.spacing.md,
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
    color: theme.colors.audioSettingsModalText,
  },
  settingValueText: {
    fontSize: theme.typography.sizes.xl,
    fontFamily: theme.typography.fonts.balooPaaji,
    color: theme.colors.audioSettingsModalText,
  },
  switchStyle: Platform.select({
    android: { transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] },
    ios: { transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }] },
  }),
  speedControlContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  speedControlButton: {
    minWidth: 44,
    // 30 matches ThemedSwitch's track height so the playback-speed row is the
    // same height as the Auto Play / Sync Scroll rows. The 24px +/- icons fit,
    // and the Pressable's hitSlop keeps the tap target comfortable.
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  modalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // Vertical-only spacing — the container already pads the horizontal edges,
    // so the previous all-sides margin was doubling the side padding.
    marginVertical: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.separator,
  },
  settingHelperText: {
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fonts.balooPaaji,
    color: theme.colors.textDisabled,
  },
  settingHelperTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
});

export default createStyles;
