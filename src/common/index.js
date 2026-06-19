import * as actions from "./actions";
import colors from "./colors";
import {
  FallBack,
  BaniLengthSelector,
  BaniList,
  CustomText,
  ListItemTitle,
  BottomNavigation,
  SafeArea,
  StatusBarComponent,
  ThemedSwitch,
} from "./components";
import orderedBani from "./components/BaniList/baniOrderHelper";
import constant from "./constant";
import useTheme from "./context";
import defaultBaniOrder from "./defaultBaniOrder";
import {
  allowTracking,
  trackReaderEvent,
  trackSettingEvent,
  trackReminderEvent,
  trackAudioEvent,
  trackBaniOpen,
  trackBaniListen,
  trackBaniListenCompletion,
  trackBaniArtistDefault,
  trackTrackDownload,
  trackAudioLinkRequest,
  trackScrollProgress,
} from "./firebase/analytics";
import { logError, initializeCrashlytics, setCustomKey, logMessage } from "./firebase/crashlytics";
import baseFontSize, { validateBaniOrder } from "./helpers";
import useKeepAwake from "./hooks/keepAwake";
import useBackHandler from "./hooks/useBackHandler";
import useThemedStyles from "./hooks/useThemedStyles";
import STRINGS from "./localization";
import {
  updateReminders,
  cancelAllReminders,
  checkPermissions,
  resetBadgeCount,
} from "./notifications";
import {
  ensureDbExists,
  checkForBaniDBUpdate,
  REMOTE_DB_URL,
  writeRemoteMD5Hash,
  LOCAL_DB_PATH,
  listDocumentDirectory,
  revertMD5Hash,
  getCurrentDBMD5Hash,
} from "./rnfs";
import { navigate, navigateTo, navigationRef } from "./rootNavigation";
import createStore from "./store";
import { showToast, showErrorToast, showSuccessToast, showInfoToast } from "./toast";
import convertToUnicode from "./utils";

export {
  colors,
  constant,
  actions,
  STRINGS,
  logError,
  logMessage,
  initializeCrashlytics,
  allowTracking,
  trackReaderEvent,
  trackAudioEvent,
  trackReminderEvent,
  trackSettingEvent,
  updateReminders,
  checkPermissions,
  cancelAllReminders,
  FallBack,
  BaniLengthSelector,
  useKeepAwake,
  BaniList,
  CustomText,
  baseFontSize,
  resetBadgeCount,
  createStore,
  orderedBani,
  setCustomKey,
  navigateTo,
  navigate,
  navigationRef,
  defaultBaniOrder,
  validateBaniOrder,
  ensureDbExists,
  checkForBaniDBUpdate,
  REMOTE_DB_URL,
  writeRemoteMD5Hash,
  LOCAL_DB_PATH,
  listDocumentDirectory,
  revertMD5Hash,
  getCurrentDBMD5Hash,
  StatusBarComponent,
  SafeArea,
  showToast,
  showErrorToast,
  showSuccessToast,
  showInfoToast,
  convertToUnicode,
  BottomNavigation,
  useTheme,
  useThemedStyles,
  ListItemTitle,
  useBackHandler,
  trackBaniOpen,
  trackBaniListen,
  trackBaniListenCompletion,
  trackBaniArtistDefault,
  trackTrackDownload,
  trackAudioLinkRequest,
  trackScrollProgress,
  ThemedSwitch,
};
