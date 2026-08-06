// Khalis backend base URL (Seva + Dashboard APIs).
//
// ── PRODUCTION (Azure Container Apps) ───────────────────────────────────────
const KHALIS_API_BASE = "https://khalis-user-api.salmonriver-80392db4.eastus.azurecontainerapps.io";
//
// ── LOCAL DEV ───────────────────────────────────────────────────────────────
// To test against the backend running on THIS machine (khalis-users-api → PORT
// 3500), swap in the line below. On a USB device/emulator run once:
//   adb reverse tcp:3500 tcp:3500
// (cleartext to localhost is allowed — see android res/xml/
// network_security_config.xml). Reset Metro: react-native start --reset-cache.
// const KHALIS_API_BASE = "http://localhost:3500";

export default {
  DB: "gutka_v01",
  ENGLISH: "ENGLISH",
  ENGLISH_TITLE_CASE: "English",
  HINDI: "HINDI",
  SHAHMUKHI: "SHAHMUKHI",
  IPA: "IPA",
  GURBANI_AKHAR_TRUE: "GurbaniAkharTrue",
  GURBANI_AKHAR_THICK_TRUE: "GurbaniAkharThickTrue",
  BALOO_PAAJI: "BalooPaaji2-Regular",
  BALOO_PAAJI_SEMI_BOLD: "BalooPaaji2-SemiBold",
  GURBANI_AKHAR_HEAVY_TRUE: "GurbaniAkharHeavyTrue",
  ANMOL_LIPI: "AnmolLipiSG",
  READER: "Reader",
  SETTINGS: "Settings",
  DASHBOARD: "Dashboard",
  SEVA: "Seva",
  // The current onboarding-carousel version. The carousel auto-opens whenever a
  // user's persisted `seenOnboardingVersion` is below this number, so every
  // build that bumps this re-shows the carousel exactly once to EVERYONE on
  // their next launch — fresh installs, updaters from old versions, and users
  // who already saw an earlier onboarding alike. Bump it whenever the
  // onboarding content should be force-shown again.
  ONBOARDING_VERSION: 1,
  // Master switch for the onboarding carousel. While false the carousel never
  // auto-opens and the Settings "Revisit Tutorial" row is hidden, so it cannot
  // be reached at all. The carousel and its slides stay in the build untouched:
  // set this back to true to restore the feature with no other change.
  ONBOARDING_ENABLED: false,
  EXTRA_SMALL: "EXTRA_SMALL",
  SMALL: "SMALL",
  MEDIUM: "MEDIUM",
  LARGE: "LARGE",
  EXTRA_LARGE: "EXTRA_LARGE",
  DEFAULT: "DEFAULT",
  HINDI_UNICODE: `हिंदी`,
  PUNJABI: `ਪੰਜਾਬੀ`,
  FRANCAIS: `Français`,
  ESPANOL: `Español`,
  ITALIANO: "Italiano",
  Default: "Default",
  SAT_SUBHAM_SAT: "SAT_SUBHAM_SAT",
  Light: "Light",
  Dark: "Dark",
  EXTRA_LONG: "EXTRA_LONG",
  LONG: "LONG",
  SHORT: "SHORT",
  EXISTS_BUDDHA_DAL: "existsBuddhaDal",
  EXISTS_TAKSAL: "existsTaksal",
  EXISTS_MEDIUM: "existsMedium",
  EXISTS_SGPS: "existsSGPC",
  GURMUKHI: "GURMUKHI",
  TRANSLITERATION: "TRANSLITERATION",
  TRANSLATION: "TRANSLATION",
  REMINDER_OPTIONS: "Reminder Options",
  KHALIS_FOUNDATION_URL: "https://khalisfoundation.org",
  BANI_DB_URL: "https://www.banidb.com/",
  sttm: "sttm",
  VISHRAAM_COLORED: "VISHRAAM_COLORED",
  VISHRAAM_GRADIENT: "VISHRAAM_GRADIENT",
  MAST_SABH_MAST: "MAST_SABH_MAST",
  DEFAULT_SPEED: 50,
  MARK_AS_READ: "mark-as-read",
  SOUND: "sound",
  REMINDERS_DEFAULT: "Reminders default",
  ALERT_DESCRIPTION: "Alert notification reminders for chosen Bani",
  WAHEGURU_SOUL: "waheguru_soul",
  REMINDERS_WAHEGURU_SOUL: "Reminders waheguru soul",
  WAKE_UP_JAP: "wake_up_jap",
  REMINDERS_WAKE_UP: "Reminders wake up jap",
  FOLDERSCREEN: "FolderScreen",
  HOME_SCREEN: "Home Screen",
  ABOUT_SCREEN: "About Screen",
  FALLBACK_SCREEN: "Fallback Screen",
  BOOKMARKS: "Bookmarks",
  FONT_SIZE: "fontSize",
  FONT_FACE: "fontFace",
  BANI_FONT_FACE: "baniFontFace",
  LANGUAGE: "appLanguage",
  TRANSLITERATION_LANGUAGE: "transliterationLanguage",
  SPANISH: "spanish",
  NIGHT_MODE: "nightMode",
  KEEP_AWAKE: "keepAwake",
  BANI_LENGTH: "baniLength",
  THEME: "Theme",
  LARIVAAR: "larivaar",
  LARIVAAR_ASSIST: "larivaarAssist",
  PADCHED: "padched",
  STATISTICS: "statistics",
  STATUS_BAR: "statusBar",
  PARAGRAPH: "paragraph",
  AUTO_SCROLL: "autoScroll",
  AUDIO: "audio",
  AUDIO_AUTO_PLAY: "audioAutoPlay",
  AUDIO_SYNC_SCROLL: "audioSyncScroll",
  DEFAULT_AUDIO: "defaultAudio",
  VISHRAAM: "vishraam",
  VISHRAAM_OPTION: "vishraamOption",
  VISHRAAM_SOURCE: "vishraamSource",
  REMINDERS: "reminders",
  REMINDER_SOUND: "reminderSound",
  EDIT_BANI_ORDER: "Edit Bani Order",
  ADD_REMINDER: "addReminder",
  RESET_REMINDER: "resetReminderDefault",
  UPDATE_REMINDER: "updateReminder",
  PORTRAIT: "PORTRAIT",
  LANDSCAPE: "LANDSCAPE",
  REMOTE_DB_URL: "https://banidb.blob.core.windows.net/database",
  CHOPAYI_SAHIB_ID: 9,
  REHRAAS_SAHIB_ID: 21,
  BANI_IDS_WITH_LENGTH_VARIANTS: [9, 21, 23],
  MAST_SABH_MAST_TUKK: "smwpq msqu suB msqu",
  MAST_SABH_MAST_TUKK_UNI: "ਸਮਾਪਤ ਮਸਤੁ ਸੁਭ ਮਸਤੁ",
  MINIMUM_BOTTOM_PADDING: 35,
  defaultBani: {
    id: 1,
    title: "gur mMqR",
    titleUni: "ਗੁਰ ਮੰਤ੍ਰ",
  },
  ICON_SIZE_SMALL: 18,
  ANALYTICS_DB_NAME: "analytics_v01.db",
  MIN_READ_SESSION_SECONDS: 240,
  MIN_LISTEN_SESSION_SECONDS: 240,
  KHALIS_APPS_API_URL: "",
  ANALYTICS_SYNC_API_URL: "",

  // ─── Dashboard redesign ───────────────────────────────────────────────────
  // Section keys for the customizable dashboard layout (order below = default order).
  DASHBOARD_SECTIONS: {
    STREAK: "streak",
    NITNEM: "nitnem",
    EXPLORE: "explore",
    PRACTICE: "practice",
    CALENDAR: "calendar",
    WEEK_CHART: "weekChart",
    DISCOVER: "discover",
    REMINDERS: "reminders",
    // Combined tabbed card (Today's Vaak + Random Shabad). Replaces the former
    // standalone RANDOM_SHABAD ("randomShabad") and VAAK ("vaak") sections; those
    // legacy keys are migrated/stripped on rehydrate (see reducer.js).
    SHABAD_VAAK: "shabadVaak",
  },
  // Minimum number of visible sections the user must keep when customizing layout.
  DASHBOARD_MIN_VISIBLE: 4,
  // Earliest month history browsing (calendar arrows, week nav, date picker) is
  // allowed to reach — there is no activity data before this, by product
  // decision, regardless of what a device's local SQLite table might contain.
  DASHBOARD_HISTORY_FLOOR: { year: 2026, month: 7 },
  // Default daily Nitnem bani set, by Banis.ID, in reading order:
  //   2  Japji Sahib
  //   6  Tav Prasad Savaiye (Sraavag Sudh)
  //   4  Jaap Sahib
  //   9  Benati Chaupai Sahib
  //   21 Rehras Sahib
  //   1  Gur Mantar
  //
  // Savaiye is ID 6. NEITHER Shabad Hazare (ID 3) nor Shabad Hazare Patishahi
  // 10 (ID 5) belongs in the default — they are two distinct banis and the
  // similar names make the wrong one easy to reach for.
  DEFAULT_NITNEM_BANI_IDS: [2, 6, 4, 9, 21, 1],

  // Khalis backend endpoints (all derived from KHALIS_API_BASE above).
  DASHBOARD_API_BASE_URL: KHALIS_API_BASE,
  SEVA_CONFIG_API_URL: `${KHALIS_API_BASE}/seva/config`,
  // "Seva by other means" pages (public, no auth). Each returns a translated,
  // constrained HTML content fragment the app renders natively and caches (per
  // page + language) for offline use. The path segment matches the page key
  // sent by services/sevaMeans.js.
  SEVA_MEANS_API_BASE: KHALIS_API_BASE,
  DAILY_VAAK_API_URL: `${KHALIS_API_BASE}/dashboard/daily-vaak`,
  WORD_OF_DAY_API_URL: `${KHALIS_API_BASE}/dashboard/word-of-day`,
  DASHBOARD_SYNC_API_URL: `${KHALIS_API_BASE}/dashboard/cache`, // POST, Bearer JWT
  DASHBOARD_LATEST_API_URL: `${KHALIS_API_BASE}/dashboard/latest`, // GET, Bearer JWT
  // Khalis audio catalog (public, no auth): GET /audios/:baniId. This is the
  // SINGLE, authoritative source for the audio manifest — reciters, track URLs,
  // durations, sizes and lyrics URLs all live server-side, so adding/changing a
  // track is a backend data change, never an app release. The app never falls
  // back to hardcoded track data; its only offline source is the persisted
  // audioCatalog cache (see reducer.js) that this endpoint populates.
  AUDIO_API_BASE: `${KHALIS_API_BASE}/audios`,
  // Bani IDs known to have audio. Used by the eager catalog prefetch
  // (useAudioCatalogSync) to warm the offline cache, since the backend has no
  // bulk "all banis" endpoint yet — GET /audios/:id is per-bani only. Banis the
  // user opens are also cached lazily on visit regardless of this list, so a
  // newly audio-enabled bani still works when visited; this list only controls
  // which banis are PRE-warmed for offline. Replace with a catalog endpoint when
  // the backend ships one. (Integers only — not URLs or track data.)
  AUDIO_BANI_IDS: [2, 4, 6, 9, 10, 21, 23, 1000],
  // A cached bani manifest older than this is refreshed from the network on the
  // next visit / catalog sync (while online). Stale-but-present cache is always
  // used immediately; the refresh happens in the background.
  AUDIO_CATALOG_TTL_MS: 24 * 60 * 60 * 1000,
  // Max parallel manifest fetches during the eager catalog prefetch, so a cold
  // sync never fans out ~30 simultaneous requests on a low-end device.
  AUDIO_CATALOG_SYNC_CONCURRENCY: 4,
  // Random Shabad stays on BaniDB directly (backend proxy was dropped).
  RANDOM_SHABAD_API_URL: "",
  // Backend serves the yearly Gurpurab/events feed here (CMS-style — updated
  // server-side once a year, no app release needed). The app falls back to its
  // bundled local computation when this is unreachable or not yet deployed, so it
  // is safe to point at the endpoint before the backend ships it.
  UPCOMING_EVENTS_API_URL: `${KHALIS_API_BASE}/dashboard/events`,
  NANAKSHAHI_API_URL: "",
  // Reachability probe for dashboard network services (see services/dashboard/
  // connectivity.js). Same globally-distributed 204 endpoint the app's NetInfo
  // layer uses (services/networkManager.js) — returns HTTP 204 when there is
  // real internet, so a captive portal (which returns 200) reads as offline.
  INTERNET_CHECK_URL: "https://clients3.google.com/generate_204",
};
