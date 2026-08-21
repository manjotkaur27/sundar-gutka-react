import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { createMigrate, persistReducer, persistStore } from "redux-persist";
import crashlyticsMiddleware from "./middleware/crashlytics";
import reducer from "./reducer";

/**
 * One-time corrections to state already on people's phones. A new default only
 * reaches a fresh install — everyone else keeps whatever was saved the first
 * time they ever opened the app, which is exactly what these are for.
 *
 * 1: `isStatusBar` back to false, i.e. the status bar shown.
 *
 * Until now the native side hid every system bar and re-applied it on each
 * window focus change, so the setting was overruled a moment after anyone
 * changed it and the app was effectively full-screen for everybody. The saved
 * value therefore records what the switch happened to default to, not a choice
 * anyone made — so there is nothing here worth preserving, and leaving it would
 * strand every existing user in full screen while new installs got the bar.
 */
export const migrations = {
  1: (state) => ({ ...state, isStatusBar: false }),
};

// "auth" is blacklisted deliberately: redux-persist writes plain, unencrypted
// AsyncStorage, and the SSO session holds an email + SAML nameID. The session
// is rehydrated from the Keychain by useSsoSession instead, which also keeps
// status "unknown" until that read resolves.
const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  blacklist: ["navigation", "baniList", "audioManifest", "readerTapTick", "onboardingVisible", "auth"],
  // Bumping this runs every migration above the STORED version, so an install
  // that has never seen a migration (version -1) runs them all in order.
  version: 1,
  migrate: createMigrate(migrations),
};
const persistedReducer = persistReducer(persistConfig, reducer);

const configure = () => {
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // immutableCheck scans the entire state tree on every action — very expensive on low-end
        // devices. Keep it enabled only during development where it adds real value.
        immutableCheck: __DEV__,
        serializableCheck: {
          // redux-persist dispatches non-serializable functions during persist/flush
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/FLUSH', 'persist/REGISTER'],
        },
      }).concat(crashlyticsMiddleware),
  });
  const persistor = persistStore(store);
  return { store, persistor };
};

export default configure;
