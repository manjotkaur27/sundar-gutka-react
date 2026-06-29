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
import usePauseAudioOnExit from "./src/common/hooks/usePauseAudioOnExit";
import useOnboardingTrigger from "./src/common/hooks/useOnboardingTrigger";

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
