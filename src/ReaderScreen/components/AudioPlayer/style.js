import { Platform } from "react-native";
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
    backgroundColor: theme.colors.transparentOverlay,
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
    position: "relative",
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
  },
  containerIOS: {
    backgroundColor: "transparent",
  },
  containerAndroid: {
    backgroundColor: theme.colors.transparentOverlay,
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
  trackList: {
    maxHeight: 200,
    zIndex: 1,
  },
  trackItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl_20,
    marginBottom: theme.spacing.md,
    // borderWidth: 2,
    borderColor: "transparent",
    minHeight: 36, // Consistent height for Android
  },
  selectedTrackItem: {
    backgroundColor: theme.colors.primary,
    color: theme.staticColors.WHITE_COLOR,
    borderColor: theme.colors.primary,
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
    width: "35%",
    alignSelf: "flex-end",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: 2,
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
  },
});

export const minimizePlayerStyles = (theme) => ({
  container: {
    position: "absolute",
    bottom: 10,
    right: theme.spacing.xl_20,
    maxWidth: "80%",
    borderRadius: theme.borderRadius.xl,
    // Tight padding that hugs the content — the pill sizes to whatever is shown
    // (just the circle when collapsed, circle + text when expanded).
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    ...SHADOW.medium,
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
    paddingLeft: theme.spacing.md_12,
  },
  timestamp: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.audioTitleText,
    opacity: 0.7,
  },
  artistName: {
    fontFamily: theme.typography.fonts.balooPaaji,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.audioTitleText,
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
    minHeight: 44,
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
