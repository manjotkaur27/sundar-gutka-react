import { openDatabase, enablePromise } from "react-native-sqlite-storage";
import { logError, logMessage } from "@common";
import { initSchema } from "./schema";

enablePromise(true);

const analyticsInstance = { value: null };
let analyticsInitPromise = null;

export const getAnalyticsDB = async () => {
  if (analyticsInstance.value) {
    return analyticsInstance.value;
  }
  if (analyticsInitPromise) {
    return analyticsInitPromise;
  }

  analyticsInitPromise = openDatabase({
    name: "analytics_v01.db",
    location: "Documents",
  })
    .then(async (db) => {
      await initSchema(db);
      analyticsInstance.value = db;
      analyticsInitPromise = null;
      logMessage("Analytics DB initialized");
      return db;
    })
    .catch((err) => {
      analyticsInitPromise = null;
      logMessage(`analytics_db_open_failed: ${err?.message || err}`);
      logError(new Error(`Analytics DB open failed: ${err?.message || err}`));
      throw err;
    });

  return analyticsInitPromise;
};

export const closeAnalyticsDB = async () => {
  if (analyticsInstance.value) {
    await analyticsInstance.value.close();
    analyticsInstance.value = null;
  }
};
