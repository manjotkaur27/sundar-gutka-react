import React, { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ErrorBoundary from "react-native-error-boundary";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashScreen from "react-native-splash-screen";
import Toast from "react-native-toast-message";
import toastConfig from "./src/common/toastConfig";
import { Provider } from "react-redux";
import notifee, { EventType } from "@notifee/react-native";
import {
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import { PersistGate } from "redux-persist/integration/react";
import {
  createStore,
  STRINGS,
  logError,
  initializeCrashlytics,
  setCustomKey,
  FallBack,
  resetBadgeCount,
  navigateTo,
  initializePerformanceMonitoring,
  ConfirmDialogHost,
  OnboardingCarousel,
} from "@common";
import ThemeProvider from "./src/common/context/ThemeProvider";
import NetworkProvider from "./src/common/context/NetworkProvider";
import { TrackPlayerSetup } from "./src/common/TrackPlayerUtils";
import Navigation from "./src/navigation";
import useGlobalDownloadManager from "./src/common/services/globalDownloadManager";
import useStorageMigration from "./src/common/hooks/useStorageMigration";
import useOfflinePlaybackGuard from "./src/common/hooks/useOfflinePlaybackGuard";
import useOfflineSyncToast from "./src/common/hooks/useOfflineSyncToast";
import usePauseAudioOnExit from "./src/common/hooks/usePauseAudioOnExit";
import useOnboardingTrigger from "./src/common/hooks/useOnboardingTrigger";
import usePothiSync from "./src/common/hooks/usePothiSync";
import useReminderRearm from "./src/common/hooks/useReminderRearm";
import useSsoSession from "./src/common/hooks/useSsoSession";
import useAudioCatalogSync from "./src/common/services/useAudioCatalogSync";
import useDashboardSync from "./src/services/dashboard/useDashboardSync";
import usePushRegistration from "./src/services/push/usePushRegistration";
import useRemindersSync from "./src/services/reminders/useRemindersSync";
import useSettingsSync from "./src/services/settings/useSettingsSync";
import useSyncOutbox from "./src/services/sync/useSyncOutbox";
import useRemoteThemesSync from "./src/services/themes/useRemoteThemesSync";

const { store, persistor } = createStore();

/**
 * After redux-persist rehydrates the store, sync the localization library
 * with the persisted language. Without this, STRINGS stays on the default
 * locale (English) because redux-persist's REHYDRATE action does not
 * trigger the setLanguage action creator where STRINGS.setLanguage() lives.
 */
const handleBeforeLift = () => {
  const { language } = store.getState();
  if (language) {
    STRINGS.setLanguage(language);
  }
};

// Mounts Redux-dependent background services inside the Provider tree.
const GlobalServices = () => {
  useGlobalDownloadManager();
  useStorageMigration();
  useOfflinePlaybackGuard();
  usePauseAudioOnExit();
  useOnboardingTrigger();
  useOfflineSyncToast();
  useReminderRearm();
  // Push: registers this device's FCM token with the account, keeps its
  // topics current, and shows foreground messages. Mounted here so it runs
  // on every screen and before the user has opened anything.
  usePushRegistration();
  // Reading themes from the backend, merged over the bundled set on every
  // screen that resolves a theme.
  useRemoteThemesSync();
  useSsoSession();
  // Offline audio parity: warms the manifest + lyrics caches for every audio
  // bani, so audio a user never opened online still plays offline. It went
  // missing from this list in a July commit that never mentioned it, and with
  // it every fresh install lost the eager cache entirely. It starts only after
  // the launch window (see AUDIO_CATALOG_SYNC_DELAY_MS), so it cannot compete
  // with the fresh-install DB seed it used to be blamed for.
  useAudioCatalogSync();
  // Account dashboard sync. Mounted HERE and not in DashboardScreen: on that
  // screen both the push and the restore only existed while it was mounted, so
  // signing in anywhere else never got the account's data up or down.
  useDashboardSync();
  // Account data that syncs per row — pothis and reminders — through the
  // persisted outbox. Mounted here for the same reason as the dashboard: a
  // change made on any screen goes up whether or not that screen stays open.
  // The features register with the sync registry; the outbox drains them.
  usePothiSync();
  useRemindersSync();
  // The person's preferences, per key, through the same outbox and the same
  // sync moments as reminders.
  useSettingsSync();
  useSyncOutbox();
  return null;
};

const App = () => {
  useEffect(() => {
    // Code to run on component mount
    SplashScreen.hide(); // Hide the splash screen once everything is loaded
  }, []); // The empty array causes this effect to only run on mount

  useEffect(() => {
    const setUserProperties = async () => {
      try {
        let userId = await AsyncStorage.getItem("analytics_user_id");
        if (!userId) {
          userId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          await AsyncStorage.setItem("analytics_user_id", userId);
        }
        const { language } = store.getState();
        setCustomKey({
          user_id: userId,
          app_language: language || "en-US",
          platform: Platform.OS,
          device_type: Platform.isPad === true ? "tablet" : "phone",
        });
      } catch (err) {
        logError(err);
      }
    };
    setUserProperties();
  }, []);

  useEffect(() => {
    const runSetup = async () => {
      await initializeCrashlytics();
      await initializePerformanceMonitoring();
      await TrackPlayerSetup();
    };

    // Guard against OS-initiated background cold starts (service revival, FCM,
    // Bluetooth events). startForeground() is blocked in background-restricted
    // states on Android 12+, so we must not call setupPlayer() until the app is
    // actually in the foreground. On a normal launcher tap AppState is already
    // 'active' and we run immediately with no overhead.
    if (AppState.currentState !== "active") {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          sub.remove();
          runSetup().catch(logError);
        }
      });
      return () => sub.remove();
    }

    runSetup().catch(logError);
  }, []);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      resetBadgeCount();
      if (type === EventType.PRESS) {
        try {
          await navigateTo(detail);
        } catch (error) {
          logError(error);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Taps on a notification the SYSTEM drew, rather than the app.
  //
  // notifee only reports presses on notifications it posted itself. A campaign
  // that carries a `notification` block is drawn by FCM while the app is away,
  // so notifee never sees it and its route was simply lost — the app opened
  // wherever it had been left. These two are the only handlers that hear about
  // it: `getInitialNotification` for a tap that launched the app from cold, and
  // `onNotificationOpenedApp` for one that brought it back from the background.
  //
  // The payload is reshaped into the notifee detail that navigateTo reads, so
  // one router serves every source: reminders, app-drawn campaigns and these.
  useEffect(() => {
    const messaging = getMessaging();
    const open = (remoteMessage) => {
      if (remoteMessage) {
        resetBadgeCount();
        navigateTo({ notification: { data: remoteMessage.data } }).catch(logError);
      }
    };

    getInitialNotification(messaging).then(open).catch(logError);
    return onNotificationOpenedApp(messaging, open);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor} onBeforeLift={handleBeforeLift}>
        <NetworkProvider>
          <GlobalServices />
          <ThemeProvider>
            <ErrorBoundary onError={logError} FallbackComponent={FallBack}>
              <SafeAreaProvider>
                <Navigation />
                <Toast config={toastConfig} />
                <ConfirmDialogHost />
                {/* Mounted last so the full-screen onboarding carousel stacks
                    above every screen when shown (first run + Revisit Tutorial). */}
                <OnboardingCarousel />
              </SafeAreaProvider>
            </ErrorBoundary>
          </ThemeProvider>
        </NetworkProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
