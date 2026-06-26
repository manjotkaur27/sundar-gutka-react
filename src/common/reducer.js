import { combineReducers } from "@reduxjs/toolkit";
import * as actionTypes from "./actions/actionTypes";
import constant from "./constant";

const createReducer =
  (initialState, handlers) =>
  (state = initialState, action) => {
    if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
      return handlers[action.type](state, action);
    }
    return state;
  };

const isNightMode = createReducer(false, {
  [actionTypes.TOGGLE_NIGHT_MODE]: (state, action) => action.value,
});

const fontSize = createReducer(constant.SMALL, {
  [actionTypes.SET_FONT_SIZE]: (state, action) => action.value,
});

const transliterationLanguage = createReducer(constant.ENGLISH, {
  [actionTypes.SET_TRANSLITERATION]: (state, action) => action.value,
});

const fontFace = createReducer(constant.BALOO_PAAJI, {
  [actionTypes.SET_FONT_FACE]: (state, action) => action.value,
});

// Font used only for the Bani (scripture) text inside the Reader's WebView —
// independent of `fontFace`, which drives Gurmukhi titles elsewhere in the app.
const baniFontFace = createReducer(constant.GURBANI_AKHAR_TRUE, {
  [actionTypes.SET_BANI_FONT_FACE]: (state, action) => action.value,
});
const language = createReducer(constant.Default.toUpperCase(), {
  [actionTypes.SET_LANGUAGE]: (state, action) => action.value,
});

const isTransliteration = createReducer(false, {
  [actionTypes.TOGGLE_TRANSLITERATION]: (state, action) => action.value,
});

const theme = createReducer(constant.Default, {
  [actionTypes.SET_THEME]: (state, action) => action.value,
});

const isStatusBar = createReducer(true, {
  [actionTypes.TOGGLE_STATUS_BAR]: (state, action) => action.value,
});

const isScreenAwake = createReducer(true, {
  [actionTypes.TOGGLE_SCREEN_AWAKE]: (state, action) => action.value,
});

const isAutoScroll = createReducer(false, {
  [actionTypes.TOGGLE_AUTO_SCROLL]: (state, action) => action.value,
  // Auto-cancel when Audio turns ON (either runtime or feature toggle)
  [actionTypes.TOGGLE_AUDIO]: (state, action) => (action.value ? false : state),
  [actionTypes.TOGGLE_AUDIO_FEATURE_ENABLED]: (state, action) => (action.value ? false : state),
});

const isAudio = createReducer(false, {
  [actionTypes.TOGGLE_AUDIO]: (state, action) => action.value,
  // Auto-cancel when AutoScroll turns ON
  [actionTypes.TOGGLE_AUTO_SCROLL]: (state, action) => (action.value ? false : state),
});

const isAudioFeatureEnabled = createReducer(true, {
  [actionTypes.TOGGLE_AUDIO_FEATURE_ENABLED]: (state, action) => action.value,
  // Auto-disable Audio feature when AutoScroll turns ON
  [actionTypes.TOGGLE_AUTO_SCROLL]: (state, action) => (action.value ? false : state),
});

const isAudioAutoPlay = createReducer(false, {
  [actionTypes.TOGGLE_AUDIO_AUTO_PLAY]: (state, action) => action.value,
});

const isAudioSyncScroll = createReducer(true, {
  [actionTypes.TOGGLE_AUDIO_SYNC_SCROLL]: (state, action) => action.value,
});

const audioPlaybackSpeed = createReducer(1.0, {
  [actionTypes.SET_AUDIO_PLAYBACK_SPEED]: (state, action) => action.value,
});

const baniLength = createReducer("", {
  [actionTypes.SET_BANI_LENGTH]: (state, action) => action.value,
});

const isLarivaar = createReducer(false, {
  [actionTypes.TOGGLE_LARIVAAR]: (state, action) => action.value,
});

const isLarivaarAssist = createReducer(false, {
  [actionTypes.TOGGLE_LARIVAAR_ASSIST]: (state, action) => action.value,
});

const isParagraphMode = createReducer(false, {
  [actionTypes.TOGGLE_PARAGRAPH_MODE]: (state, action) => action.value,
});

const padched = createReducer(constant.SAT_SUBHAM_SAT, {
  [actionTypes.SET_PADCHHED]: (state, action) => action.value,
});

const isVishraam = createReducer(false, {
  [actionTypes.TOGGLE_VISHRAAM]: (state, action) => action.value,
});

const vishraamOption = createReducer(constant.VISHRAAM_COLORED, {
  [actionTypes.SET_VISHRAAM_OPTION]: (state, action) => action.value,
});

const vishraamSource = createReducer(constant.sttm, {
  [actionTypes.SET_VISHRAAM_SOURCE]: (state, action) => action.value,
});

const isStatistics = createReducer(true, {
  [actionTypes.TOGGLE_STATISTICS]: (state, action) => action.value,
});

const isEnglishTranslation = createReducer(false, {
  [actionTypes.TOGGLE_ENGLISH_TRANSLATION]: (state, action) => action.value,
});

const isSpanishTranslation = createReducer(false, {
  [actionTypes.TOGGLE_SPANISH_TRANSLATION]: (state, action) => action.value,
});

const isPunjabiTranslation = createReducer(false, {
  [actionTypes.TOGGLE_PUNJABI_TRANSLATION]: (state, action) => action.value,
});

const bookmarkPosition = createReducer(0, {
  [actionTypes.SET_BOOKMARK_POSITION]: (state, action) => action.value,
});

const bookmarkSequenceString = createReducer(null, {
  [actionTypes.SET_BOOKMARK_SEQUENCE_STRING]: (state, action) => action.value,
});

const isReminders = createReducer(false, {
  [actionTypes.TOGGLE_REMINDERS]: (state, action) => action.value,
});

const reminderBanis = createReducer(JSON.stringify([]), {
  [actionTypes.SET_REMINDER_BANIS]: (state, action) => action.value,
});

const reminderSound = createReducer(constant.Default.toLowerCase(), {
  [actionTypes.SET_REMINDER_SOUND]: (state, action) => action.value,
});

const isHeaderFooter = createReducer(false, {
  [actionTypes.TOGGLE_HEADER_FOOTER]: (state, action) => action.value,
});

const isDatabaseUpdateAvailable = createReducer(false, {
  [actionTypes.TOGGLE_DATABASE_UPDATE_AVAILABLE]: (state, action) => action.value,
});

// Audio Manifest reducer
const audioManifest = (state = {}, action) => {
  switch (action.type) {
    case actionTypes.SET_AUDIO_MANIFEST:
      return {
        ...state,
        [action.payload.baniId]: action.payload.tracks,
      };
    default:
      return state;
  }
};

const autoScrollSpeedObj = (state = {}, action) => {
  switch (action.type) {
    case actionTypes.SET_AUTO_SCROLL_SPEED:
      return { ...state, ...action.value };
    default:
      return state;
  }
};

const baniOrder = (state = null, action) => {
  switch (action.type) {
    case actionTypes.SET_BANI_ORDER:
      return action.value;
    default:
      return state;
  }
};

const baniList = (state = [], action) => {
  switch (action.type) {
    case actionTypes.SET_BANI_LIST:
      return action.value;
    default:
      return state;
  }
};

const defaultAudio = (state = {}, action) => {
  switch (action.type) {
    case actionTypes.SET_DEFAULT_AUDIO:
      return { ...state, ...action.value };
    case actionTypes.SET_BANI_LENGTH: {
      const newState = { ...state };
      constant.BANI_IDS_WITH_LENGTH_VARIANTS.forEach((id) => {
        delete newState[id];
      });
      return newState;
    }
    default:
      return state;
  }
};

const savePosition = (state = {}, action) => {
  switch (action.type) {
    case actionTypes.SET_SAVE_POSITION:
      return { ...state, ...action.value };
    default:
      return state;
  }
};
const scrollPosition = (state = 0, action) => {
  switch (action.type) {
    case actionTypes.SET_SCROLL_POSITION:
      return action.value;
    default:
      return state;
  }
};

// Audio progress reducer - stores progress per bani: { [baniId]: { trackId, position, sequence } }
const audioProgress = (state = {}, action) => {
  switch (action.type) {
    case actionTypes.SET_AUDIO_PROGRESS: {
      const { baniId, trackId, position, sequence } = action.payload;
      return {
        ...state,
        [baniId]: {
          trackId,
          position,
          ...(sequence !== undefined && { sequence }),
        },
      };
    }
    case actionTypes.CLEAR_AUDIO_PROGRESS: {
      const { baniId } = action.payload;
      const newState = { ...state };
      delete newState[baniId];
      return newState;
    }
    case actionTypes.SET_BANI_LENGTH: {
      const newState = { ...state };
      constant.BANI_IDS_WITH_LENGTH_VARIANTS.forEach((id) => {
        delete newState[id];
      });
      return newState;
    }
    default:
      return state;
  }
};
const currentBani = createReducer(null, {
  [actionTypes.SET_CURRENT_BANI]: (state, action) => action.value,
});

const readerTapTick = createReducer(0, {
  [actionTypes.BUMP_READER_TAP]: (state) => state + 1,
});

const isPlayerDragging = createReducer(false, {
  [actionTypes.SET_PLAYER_DRAGGING]: (state, action) => action.value,
});

const donor = createReducer(false, {
  [actionTypes.SET_DONOR_STATE]: (state, action) => action.value.donor,
  [actionTypes.CLEAR_DONOR_STATE]: () => false,
});

const donorType = createReducer(null, {
  [actionTypes.SET_DONOR_STATE]: (state, action) => action.value.donorType,
  [actionTypes.CLEAR_DONOR_STATE]: () => null,
});

// Download queue — entries stuck in 'downloading' at rehydrate had their native
// job killed; reset them to 'queued' so the engine restarts them from scratch.
const downloadQueue = (state = {}, action) => {
  switch (action.type) {
    case 'persist/REHYDRATE': {
      const persisted = action.payload?.downloadQueue ?? {};
      const healed = {};
      // 'downloading' = native task is re-adopted on launch (or restarted if
      // truly lost); 'paused_retry' = a backoff timer that didn't survive the
      // restart. Both resolve to 'queued' so the engine reconciles them.
      const reset = new Set(['downloading', 'paused_retry']);
      Object.entries(persisted).forEach(([k, t]) => {
        healed[k] = reset.has(t.status)
          ? { ...t, status: 'queued', progress: 0, jobId: null }
          : t;
      });
      return healed;
    }
    case actionTypes.ENQUEUE_DOWNLOAD:
      if (state[action.payload.trackKey]) return state;
      return {
        ...state,
        [action.payload.trackKey]: {
          ...action.payload,
          status: 'queued',
          progress: 0,
          retryCount: 0,
          errorMessage: null,
          jobId: null,
        },
      };
    case actionTypes.UPDATE_DOWNLOAD_STATUS:
      if (!state[action.payload.trackKey]) return state;
      return {
        ...state,
        [action.payload.trackKey]: {
          ...state[action.payload.trackKey],
          ...action.payload,
        },
      };
    case actionTypes.UPDATE_DOWNLOAD_PROGRESS:
      if (!state[action.payload.trackKey]) return state;
      return {
        ...state,
        [action.payload.trackKey]: {
          ...state[action.payload.trackKey],
          progress: action.payload.progress,
        },
      };
    case actionTypes.REMOVE_DOWNLOAD_QUEUE_ENTRY: {
      const next = { ...state };
      delete next[action.payload.trackKey];
      return next;
    }
    case actionTypes.RETRY_DOWNLOAD:
      if (!state[action.payload.trackKey]) return state;
      return {
        ...state,
        [action.payload.trackKey]: {
          ...state[action.payload.trackKey],
          status: 'queued',
          progress: 0,
          retryCount: 0,
          errorMessage: null,
        },
      };
    case actionTypes.REQUEUE_PAUSED_DOWNLOADS: {
      const next = { ...state };
      action.payload.statuses.forEach((pausedStatus) => {
        Object.keys(next).forEach((k) => {
          if (next[k].status !== pausedStatus) return;
          // A storage failure won't be fixed by retrying — leave it for the user.
          if (next[k].errorMessage === 'NOT_ENOUGH_STORAGE') return;
          // Reset the retry budget so a previously-failed entry gets a clean
          // restart (otherwise it would immediately re-fail on its first error).
          next[k] = { ...next[k], status: 'queued', progress: 0, retryCount: 0, errorMessage: null };
        });
      });
      return next;
    }
    default:
      return state;
  }
};

const downloadRegistry = (state = {}, action) => {
  switch (action.type) {
    case actionTypes.ADD_DOWNLOAD_ENTRY:
      return { ...state, [action.payload.relativePath]: action.payload };
    case actionTypes.REMOVE_DOWNLOAD_ENTRIES: {
      const next = { ...state };
      action.payload.forEach((k) => delete next[k]);
      return next;
    }
    case actionTypes.SET_DOWNLOAD_REGISTRY:
      return action.payload;
    case actionTypes.CLEAR_DOWNLOAD_REGISTRY:
      return {};
    default:
      return state;
  }
};

const downloadWifiOnly = createReducer(true, {
  [actionTypes.TOGGLE_DOWNLOAD_WIFI_ONLY]: (state, action) => action.value,
});

// When true, streaming a bani automatically enqueues its download in the background.
// Shipped ON by default — fresh installs auto-save what they stream (the global
// engine still gates on the WiFi-only setting before any bytes flow).
const autoDownloadOnStream = createReducer(true, {
  [actionTypes.TOGGLE_AUTO_DOWNLOAD]: (state, action) => action.value,
});

// Transient visibility of the full-screen onboarding carousel. NOT persisted
// (see store.js blacklist) so it never re-shows on its own after a restart —
// the persisted `seenOnboardingVersion` below drives the first-run auto-open.
const onboardingVisible = createReducer(false, {
  [actionTypes.SET_ONBOARDING_VISIBLE]: (state, action) => action.value,
});

// The onboarding-carousel version this user has completed (finished or skipped).
// useOnboardingTrigger auto-opens the carousel whenever this is below
// constant.ONBOARDING_VERSION, so the carousel shows exactly once per onboarding
// version — fresh installs, upgraders from old versions, and users who already
// saw an earlier onboarding all see the current one once (bumping
// ONBOARDING_VERSION re-shows it to everyone). Defaults to 0 = never completed.
// Renaming the key from the old boolean also resets existing users, so the very
// first build carrying this change re-shows the carousel to everyone once.
// "Revisit Tutorial" reopens the carousel regardless of this value.
const seenOnboardingVersion = createReducer(0, {
  [actionTypes.SET_ONBOARDING_SEEN]: (state, action) => action.value,
});

const rootReducer = combineReducers({
  donor,
  donorType,
  isNightMode,
  fontSize,
  fontFace,
  baniFontFace,
  language,
  transliterationLanguage,
  isTransliteration,
  theme,
  isAutoScroll,
  isAudio,
  isAudioFeatureEnabled,
  isAudioAutoPlay,
  isAudioSyncScroll,
  audioPlaybackSpeed,
  defaultAudio,
  isScreenAwake,
  isStatusBar,
  baniLength,
  isLarivaar,
  isLarivaarAssist,
  isParagraphMode,
  padched,
  isVishraam,
  vishraamOption,
  vishraamSource,
  isStatistics,
  isEnglishTranslation,
  isPunjabiTranslation,
  isSpanishTranslation,
  bookmarkPosition,
  bookmarkSequenceString,
  isReminders,
  reminderBanis,
  reminderSound,
  autoScrollSpeedObj,
  baniOrder,
  baniList,
  savePosition,
  scrollPosition,
  isHeaderFooter,
  isDatabaseUpdateAvailable,
  audioManifest,
  audioProgress,
  currentBani,
  readerTapTick,
  isPlayerDragging,
  downloadQueue,
  downloadRegistry,
  downloadWifiOnly,
  autoDownloadOnStream,
  onboardingVisible,
  seenOnboardingVersion,
});
export default rootReducer;
