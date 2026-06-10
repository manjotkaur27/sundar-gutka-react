import React, { useEffect } from "react";
import { AppState } from "react-native";
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
  FallBack,
  resetBadgeCount,
  navigateTo,
  initializePerformanceMonitoring,
  ConfirmDialogHost,
} from "@common";
import ThemeProvider from "./src/common/context/ThemeProvider";
import { TrackPlayerSetup } from "./src/common/TrackPlayerUtils";
import Navigation from "./src/navigation";
import useGlobalDownloadManager from "./src/common/services/globalDownloadManager";
import useStorageMigration from "./src/common/hooks/useStorageMigration";

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
  return null;
};

const App = () => {
  useEffect(() => {
    // Code to run on component mount
    SplashScreen.hide(); // Hide the splash screen once everything is loaded
  }, []); // The empty array causes this effect to only run on mount

  useEffect(() => {
    const runSetup = async () => {
      await initializePerformanceMonitoring();
      await initializeCrashlytics();
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
        <GlobalServices />
        <ThemeProvider>
          <ErrorBoundary onError={logError} FallbackComponent={FallBack}>
            <SafeAreaProvider>
              <Navigation />
              <Toast config={toastConfig} />
              <ConfirmDialogHost />
            </SafeAreaProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
