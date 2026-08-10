/**
 * Serialises folder mutations so an older full-source PUT can never land after
 * a newer DELETE and recreate the folder that was just removed.
 */
const createPothiSyncQueue = () => {
  let tail = Promise.resolve();

  return (operation) => {
    const result = tail.then(operation, operation);
    // Keep the queue usable after a network error while returning the original
    // result to its caller for handling.
    tail = result.catch(() => undefined);
    return result;
  };
};

export default createPothiSyncQueue;
