import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import crashlyticsMiddleware from "./middleware/crashlytics";
import reducer from "./reducer";

const persistConfig = { key: "root", storage: AsyncStorage, blacklist: ["navigation", "baniList", "audioManifest"] };
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
