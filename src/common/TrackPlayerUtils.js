import { logError, logMessage } from "./index";

// RNTP is required lazily (not at module load time) because its Capability.js
// initialiser reads NativeModules.TrackPlayerModule at the moment the module
// evaluates. When the native module is null (stale APK / hot-reload mismatch)
// that IIFE throws and prevents AppRegistry.registerComponent from ever running,
// crashing the entire app before it starts.
let _rntp = null;
const loadRNTP = () => {
  if (!_rntp) {
    _rntp = require("react-native-track-player"); // eslint-disable-line
  }
  return _rntp;
};

// Singleton service to manage TrackPlayer initialization
class TrackPlayerService {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
    this.activeListeners = new Set();
  }

  async initialize() {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return Promise.resolve();
    }

    // Create initialization promise
    this.initPromise = (async () => {
      try {
        logMessage("Initializing TrackPlayer service...");

        // Resolve RNTP lazily here — by the time initialize() is called the
        // native module is guaranteed to be registered by the Android runtime.
        const TrackPlayer = loadRNTP().default;
        const { Capability, RepeatMode, AppKilledPlaybackBehavior } = loadRNTP();

        await TrackPlayer.setupPlayer({
          // waitForBuffer: true tells AVPlayer (iOS) to enable
          // automaticallyWaitsToMinimizeStalling, and tells ExoPlayer (Android)
          // to wait until playbackBuffer is filled before starting audio output.
          // This is the correct setting for streaming — prevents the progress
          // bar advancing silently while audio is starved.
          waitForBuffer: true,
          maxCacheSize: 51200,       // 50 MB ExoPlayer cache
          minBuffer: 15,             // Android: keep ≥15s buffered ahead at all times
          maxBuffer: 50,             // Android: buffer up to 50s ahead
          backBuffer: 0,             // Android: no back-buffer (saves memory)
          playbackBuffer: 2.5,       // Android: start playing once 2.5s is buffered
          iosCategory: "playback",
          alwaysPauseOnInterruption: false,
        });

        await TrackPlayer.setRepeatMode(RepeatMode.Off);

        await TrackPlayer.updateOptions({
          // Fewer progress events -> less UI/notification churn on low-end devices.
          progressUpdateEventInterval: 2,
          // Small icon shown in Android notification (RNTP v4 expects a JS map with a uri field)
          icon: { uri: "ic_notification" },
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
            notificationChannelName: "Sundar Gutka Playback V4",
            notificationChannelDescription: "Gurbani audio playback controls",
            notificationColor: 0xFFEEB14F,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.Stop,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });

        this.isInitialized = true;
        logMessage("TrackPlayer service initialized successfully");
      } catch (error) {
        // If setupPlayer throws because it's already initialized, that's okay
        if (
          error?.message?.includes("already initialized") ||
          error?.code === "player_already_initialized"
        ) {
          this.isInitialized = true;
          logMessage("TrackPlayer already initialized");
        } else {
          logError(`TrackPlayer initialization failed: ${error?.message || "Unknown error"}`);
          this.isInitialized = false;
          throw error;
        }
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async cleanup() {
    try {
      logMessage("Cleaning up TrackPlayer service...");

      const TrackPlayer = loadRNTP().default;
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      this.isInitialized = false;
      logMessage("TrackPlayer service cleaned up successfully");
    } catch (error) {
      logError(`TrackPlayer cleanup failed: ${error?.message || "Unknown error"}`);
    }
  }

  getState() {
    return {
      isInitialized: this.isInitialized,
    };
  }
}

// Export singleton instance
const trackPlayerService = new TrackPlayerService();

export const TrackPlayerSetup = async () => {
  return trackPlayerService.initialize();
};

export const TrackPlayerCleanup = async () => {
  return trackPlayerService.cleanup();
};

export const getTrackPlayerState = () => {
  return trackPlayerService.getState();
};

export const addTrack = async (track) => {
  try {
    // Validate track object
    if (!track.url) {
      logError("Track URL is missing or empty");
      throw new Error("Track URL is missing or empty");
    }
    if (!track.id) {
      logError("Track ID is missing");
    }

    const TrackPlayer = loadRNTP().default;
    await TrackPlayer.add(track);
  } catch (error) {
    logError(`❌ Error adding track to TrackPlayer: ${error}`);
    throw error; // Re-throw to handle upstream
  }
};

export const playTrack = async () => {
  try {
    await loadRNTP().default.play();
  } catch (error) {
    logError(error);
  }
};

export const pauseTrack = async () => {
  try {
    await loadRNTP().default.pause();
  } catch (error) {
    logError(`Error pausing track: ${error}`);
  }
};

export const stopTrack = async () => {
  try {
    await loadRNTP().default.stop();
  } catch (error) {
    logError(`Error stopping track: ${error}`);
  }
};

export const resetPlayer = async () => {
  try {
    await loadRNTP().default.reset();
  } catch (error) {
    logError(`Error resetting player: ${error}`);
  }
};
