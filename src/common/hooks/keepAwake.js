import { useEffect } from "react";
import { AppState } from "react-native";
import { useSelector } from "react-redux";
import { activateKeepAwake, deactivateKeepAwake } from "@sayem314/react-native-keep-awake";

/**
 * BAT-02: Enhanced keep-awake hook that respects AppState.
 * The wakelock is released when the app is backgrounded/inactive and
 * re-acquired when it returns to the foreground — only if isScreenAwake is enabled.
 * Previously the lock was never released on background, draining battery unnecessarily.
 */
const useKeepAwake = () => {
  const isScreenAwake = useSelector((state) => state.isScreenAwake);

  // Activate/deactivate based on Redux setting
  useEffect(() => {
    if (isScreenAwake) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  }, [isScreenAwake]);

  // Release lock when backgrounded, re-acquire when foregrounded
  useEffect(() => {
    if (!isScreenAwake) return undefined; // no-op if keep-awake is disabled

    const handleAppStateChange = (nextState) => {
      if (nextState === "active") {
        activateKeepAwake();
      } else {
        // "background" or "inactive" — release the wakelock so screen can dim/sleep
        deactivateKeepAwake();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isScreenAwake]);
};

export default useKeepAwake;
