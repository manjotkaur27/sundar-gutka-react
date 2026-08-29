import { checkForBaniDBUpdate, logError, logMessage } from "@common";

export const UPDATE_CHECK = {
  OFFLINE: "offline",
  AVAILABLE: "available",
  UP_TO_DATE: "up-to-date",
  FAILED: "failed",
};

// Every reason the remote hash cannot be read that is the network's doing,
// not ours. Anything else is a genuine error and stays one.
const isNetworkFailure = (error) =>
  /^(network request failed|failed to fetch)$|timed out|aborted/i.test(
    String(error?.message || error).trim()
  );

/**
 * Decide what the Database Update screen shows. Offline is a state of its own:
 * the check is not attempted, so a phone without a connection is told so
 * rather than shown "up to date", and nothing is reported as an error.
 *
 * @param {{ isOnline: boolean }} args
 * @returns {Promise<string>} one of UPDATE_CHECK
 */
export const resolveUpdateCheck = async ({ isOnline }) => {
  if (!isOnline) return UPDATE_CHECK.OFFLINE;
  try {
    return (await checkForBaniDBUpdate()) ? UPDATE_CHECK.AVAILABLE : UPDATE_CHECK.UP_TO_DATE;
  } catch (error) {
    if (isNetworkFailure(error)) {
      logMessage(`Database update check skipped: ${error?.message || error}`);
      return UPDATE_CHECK.OFFLINE;
    }
    logError(error);
    return UPDATE_CHECK.FAILED;
  }
};
