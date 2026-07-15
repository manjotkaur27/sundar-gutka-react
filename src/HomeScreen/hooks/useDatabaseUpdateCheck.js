import { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { actions, checkForBaniDBUpdate, logError } from "@common";

const DB_UPDATE_CHECK_KEY = "lastDbUpdateCheck";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const useDatabaseUpdateCheck = () => {
  const dispatch = useDispatch();
  const checkForUpdates = useCallback(async () => {
    try {
      // NET-02: Skip the network call if we checked within the last 24 hours
      const lastChecked = await AsyncStorage.getItem(DB_UPDATE_CHECK_KEY);
      if (lastChecked && Date.now() - Number(lastChecked) < COOLDOWN_MS) {
        return; // Within cooldown — no network request needed
      }

      const isUpdateAvailable = await checkForBaniDBUpdate();
      dispatch(actions.toggleDatabaseUpdateAvailable(isUpdateAvailable));

      // Persist the check timestamp
      await AsyncStorage.setItem(DB_UPDATE_CHECK_KEY, String(Date.now()));
    } catch (error) {
      logError("useDatabaseUpdateCheck", error);
      dispatch(actions.toggleDatabaseUpdateAvailable(false));
    }
  }, []);

  useEffect(() => {
    checkForUpdates();
  }, []);
};

export default useDatabaseUpdateCheck;
