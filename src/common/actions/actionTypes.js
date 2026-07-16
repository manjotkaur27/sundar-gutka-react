export const TOGGLE_NIGHT_MODE = "TOGGLE_NIGHT_MODE";
export const SET_FONT_SIZE = "SET_FONT_SIZE";
export const SET_FONT_FACE = "SET_FONT_FACE";
export const SET_BANI_FONT_FACE = "SET_BANI_FONT_FACE";
export const SET_LANGUAGE = "SET_LANGUAGE";
export const TOGGLE_TRANSLITERATION = "TOGGLE_TRANSLITERATION";
export const SET_TRANSLITERATION = "SET_TRANSLITERATION";
export const SET_THEME = "SET_THEME";
export const TOGGLE_SCREEN_AWAKE = "TOGGLE_SCREEN_AWAKE";
export const TOGGLE_STATUS_BAR = "TOGGLE_STATUS_BAR";
export const TOGGLE_AUTO_SCROLL = "TOGGLE_AUTO_SCROLL";
export const SET_BANI_LENGTH = "SET_BANI_LENGTH";
export const TOGGLE_LARIVAAR = "TOGGLE_LARIVAAR";
export const TOGGLE_LARIVAAR_ASSIST = "TOGGLE_LARIVAAR_ASSIST";
export const TOGGLE_PARAGRAPH_MODE = "TOGGLE_PARAGRAPH_MODE";
export const SET_PADCHHED = "SET_PADCHHED";
export const TOGGLE_VISHRAAM = "TOGGLE_VISHRAAM";
export const SET_VISHRAAM_OPTION = "SET_VISHRAAM_OPTION";
export const SET_VISHRAAM_SOURCE = "SET_VISHRAAM_SOURCE";
export const TOGGLE_STATISTICS = "TOGGLE_STATISTICS";
export const TOGGLE_ENGLISH_TRANSLATION = "TOGGLE_ENGLISH_TRANSLATION";
export const TOGGLE_PUNJABI_TRANSLATION = "TOGGLE_PUNJABI_TRANSLATION";
export const TOGGLE_SPANISH_TRANSLATION = "TOGGLE_SPANISH_TRANSLATION";
export const SET_BOOKMARK_POSITION = "SET_BOOKMARK_POSITION";
export const SET_BOOKMARK_SEQUENCE_STRING = "SET_BOOKMARK_SEQUENCE_STRING";
export const TOGGLE_REMINDERS = "TOGGLE_REMINDERS";
export const SET_REMINDER_BANIS = "SET_REMINDER_BANIS";
export const SET_REMINDER_SOUND = "SET_REMINDER_SOUND";
export const SET_AUTO_SCROLL_SPEED = "SET_AUTO_SCROLL_SPEED";
export const SET_CACHE_SHABAD = "SET_CACHE_SHABAD";
export const SET_SAVE_POSITION = "SET_SAVE_POSITION";
export const SET_BANI_LIST = "SET_BANI_LIST";
export const SET_BANI_ORDER = "SET_BANI_ORDER";
export const SET_SCROLL_POSITION = "SET_SCROLL_POSITION";
export const TOGGLE_HEADER_FOOTER = "TOGGLE_HEADER_FOOTER";
export const TOGGLE_DATABASE_UPDATE_AVAILABLE = "TOGGLE_DATABASE_UPDATE_AVAILABLE";
export const TOGGLE_AUDIO = "TOGGLE_AUDIO";
export const TOGGLE_AUDIO_FEATURE_ENABLED = "TOGGLE_AUDIO_FEATURE_ENABLED";
export const TOGGLE_AUDIO_AUTO_PLAY = "TOGGLE_AUDIO_AUTO_PLAY";
export const TOGGLE_AUDIO_SYNC_SCROLL = "TOGGLE_AUDIO_SYNC_SCROLL";
export const SET_DEFAULT_AUDIO = "SET_DEFAULT_AUDIO";
export const SET_AUDIO_PLAYBACK_SPEED = "SET_AUDIO_PLAYBACK_SPEED";
export const SET_CURRENT_BANI = "SET_CURRENT_BANI";

// Manifest actions
export const SET_AUDIO_MANIFEST = "SET_AUDIO_MANIFEST";

// Audio catalog cache — the persisted offline copy of the backend /audios
// manifest, keyed by baniId. Populated by the eager catalog sync and per-bani
// lazy refresh; read as the offline source for the audio player.
export const SET_AUDIO_CATALOG_ENTRY = "SET_AUDIO_CATALOG_ENTRY";
export const SET_AUDIO_CATALOG_META = "SET_AUDIO_CATALOG_META";
export const CLEAR_AUDIO_CATALOG = "CLEAR_AUDIO_CATALOG";

// Audio progress actions
export const SET_AUDIO_PROGRESS = "SET_AUDIO_PROGRESS";
export const CLEAR_AUDIO_PROGRESS = "CLEAR_AUDIO_PROGRESS";

// Reader tap signal — incremented on each tap in the bani WebView so the
// floating mini player can toggle its expanded/collapsed state.
export const BUMP_READER_TAP = "BUMP_READER_TAP";

// Seva Donor actions
export const SET_DONOR_STATE = "SET_DONOR_STATE";
export const CLEAR_DONOR_STATE = "CLEAR_DONOR_STATE";

// Floating mini-player drag state — used to disable WebView scroll while dragging
export const SET_PLAYER_DRAGGING = "SET_PLAYER_DRAGGING";

// Download queue
export const ENQUEUE_DOWNLOAD            = 'ENQUEUE_DOWNLOAD';
export const UPDATE_DOWNLOAD_STATUS      = 'UPDATE_DOWNLOAD_STATUS';
export const UPDATE_DOWNLOAD_PROGRESS    = 'UPDATE_DOWNLOAD_PROGRESS';
export const REMOVE_DOWNLOAD_QUEUE_ENTRY = 'REMOVE_DOWNLOAD_QUEUE_ENTRY';
export const RETRY_DOWNLOAD              = 'RETRY_DOWNLOAD';
export const REQUEUE_PAUSED_DOWNLOADS    = 'REQUEUE_PAUSED_DOWNLOADS';

// Download registry
export const ADD_DOWNLOAD_ENTRY      = 'ADD_DOWNLOAD_ENTRY';
export const REMOVE_DOWNLOAD_ENTRIES = 'REMOVE_DOWNLOAD_ENTRIES';
export const SET_DOWNLOAD_REGISTRY   = 'SET_DOWNLOAD_REGISTRY';
export const CLEAR_DOWNLOAD_REGISTRY = 'CLEAR_DOWNLOAD_REGISTRY';

// Download settings
export const TOGGLE_DOWNLOAD_WIFI_ONLY        = 'TOGGLE_DOWNLOAD_WIFI_ONLY';
export const TOGGLE_AUTO_DOWNLOAD             = 'TOGGLE_AUTO_DOWNLOAD';

// Onboarding carousel guide
// Transient visibility of the full-screen onboarding carousel (not persisted —
// see store.js blacklist). Toggled true on a fresh install and by "Revisit".
export const SET_ONBOARDING_VISIBLE = 'SET_ONBOARDING_VISIBLE';
// Persisted "the user has finished/skipped the carousel once" flag, so the
// first-run auto-open never resurfaces on later launches.
export const SET_ONBOARDING_SEEN = 'SET_ONBOARDING_SEEN';
// ─── Dashboard redesign ─────────────────────────────────────────────────────
// Local editable user profile (name only until SSO is live)
export const SET_USER_PROFILE = "SET_USER_PROFILE";

// Customizable dashboard layout — section order + hidden sections
export const SET_DASHBOARD_LAYOUT = "SET_DASHBOARD_LAYOUT";
export const RESET_DASHBOARD_LAYOUT = "RESET_DASHBOARD_LAYOUT";

// Today's Nitnem — the user's selected daily bani set + per-day completion map
export const SET_NITNEM_BANIS = "SET_NITNEM_BANIS";
export const TOGGLE_NITNEM_DONE = "TOGGLE_NITNEM_DONE";
export const MARK_NITNEM_AUTO_DONE = "MARK_NITNEM_AUTO_DONE";
// Restore the whole nitnem slice at once (cross-device sync / GET /dashboard/latest)
export const RESTORE_NITNEM = "RESTORE_NITNEM";
