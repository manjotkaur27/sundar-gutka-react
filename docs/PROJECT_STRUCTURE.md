# Project Structure

```text
sundar-gutka-react/
├── android/                        # Android native code and configuration
│   ├── app/
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Permissions, service declarations
│   │       ├── java/               # Kotlin/Java native code (MainActivity.kt)
│   │       └── res/                # Drawables, strings, styles, XML configs
│   └── build.gradle
├── ios/                            # iOS native code and configuration
│   ├── SundarGutka/
│   │   ├── AppDelegate.swift
│   │   └── Info.plist
│   └── Podfile
├── src/
│   ├── AboutScreen/                # About screen
│   │   ├── hooks/
│   │   └── styles/
│   ├── Bookmarks/                  # Bookmark management
│   │   └── hooks/
│   ├── common/                     # Shared utilities, components, and hooks
│   │   ├── actions/                # Redux action creators
│   │   ├── components/             # Reusable UI components (AppBar, BottomNavigation)
│   │   ├── context/                # React context providers (ThemeProvider)
│   │   ├── firebase/               # Firebase integration (analytics.js, crashlytics.js)
│   │   ├── hooks/                  # Custom hooks (useBackHandler)
│   │   ├── icons/                  # Custom icon components
│   │   ├── middleware/             # Redux middleware (crashlytics.js)
│   │   ├── test-utils/             # Shared Jest mocks and test utilities
│   │   ├── TrackPlayerUtils.js     # Lazy RNTP loader + player helpers
│   │   ├── reducer.js              # Combined Redux reducer
│   │   ├── constant.js             # App-wide constants
│   │   └── index.js                # Barrel export
│   ├── database/                   # SQLite connection and utilities
│   │   └── utils/
│   ├── DatabaseUpdate/             # In-app DB update UI and logic
│   │   ├── components/
│   │   └── hooks/
│   ├── EditBaniOrder/              # Bani ordering customisation
│   │   └── components/
│   ├── FolderScreen/               # Folder navigation screen
│   ├── HomeScreen/                 # Main home screen with Bani list
│   │   ├── components/
│   │   └── hooks/
│   ├── navigation/                 # React Navigation configuration
│   ├── ReaderScreen/               # Main reading interface
│   │   ├── components/
│   │   │   └── AudioPlayer/        # Full audio player subsystem
│   │   │       ├── components/     # AudioControlBar, AudioTrackDialog, etc.
│   │   │       ├── hooks/          # useTrackPlayer, useAudioManifest, useAudioSyncScroll, etc.
│   │   │       ├── utils/          # audioDownloader.js, urlHelper.js, fetchLRC.js
│   │   │       └── assets/lyrics/  # bundledLyrics.js (19 lyrics files inlined at build time)
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── utils/
│   ├── services/
│   │   └── TrackPlayerService.js   # Background audio service (remote controls, ducking)
│   ├── Settings/                   # Settings screen and all setting components
│   │   ├── components/
│   │   ├── hooks/
│   │   └── styles/
│   └── theme/                      # Light/dark theme configuration
├── assets/
│   └── fonts/                      # Gurbani and UI fonts
├── docs/
│   └── PROJECT_STRUCTURE.md        # This file
├── images/                         # App icons and static images
├── patches/                        # patch-package patches (MusicService.kt fix)
├── app.js                          # Main app entry point
├── index.js                        # AppRegistry + TrackPlayer service registration
└── package.json                    # Dependencies and scripts
```

---

## Key Directories

### `src/common/`
Shared code used across the entire app.
- **`actions/`** — Redux action creators for all state slices
- **`components/`** — `AppBar`, `BottomNavigation`, error boundary fallback
- **`context/`** — `ThemeProvider` (light/dark mode context)
- **`firebase/`** — `analytics.js` (7 dedicated events), `crashlytics.js`, `performance.js`, `helper.js` (sanitizeName utility)
- **`hooks/`** — `useBackHandler` (Android hardware back button)
- **`test-utils/`** — Shared Jest mocks for `react-redux`, icons, context, and styled components
- **`TrackPlayerUtils.js`** — Lazy RNTP loader (`loadRNTP()`), singleton `TrackPlayerService` class, exported player helpers (`playTrack`, `pauseTrack`, `addTrack`, etc.)
- **`reducer.js`** — All Redux reducers including `audioManifest`, `audioProgress`, `isAudioFeatureEnabled`, `defaultAudio`, `baniLength`

### `src/ReaderScreen/components/AudioPlayer/`
The complete audio player subsystem. Notable files:

| File | Purpose |
|---|---|
| `hooks/useTrackPlayer/index.js` | Core player hook — fast-seek, prefetch, buffering watchdog, seek coalescing |
| `hooks/useAudioManifest/index.js` | Track manifest fetching, emergency fallback, corrupt-file validation, Redux merge |
| `hooks/useAudioSyncScroll/index.js` | Binary-search lyrics sync with seek guard |
| `hooks/useDownloadManager/index.js` | Background M4A download with `trackSizeMB` validation |
| `hooks/useArtistListeningDuration/index.js` | Wall-clock listening duration tracking for `bani_listen` event |
| `hooks/useBookmarks/index.js` | Bookmark timestamp detection and scroll integration |
| `components/AudioControlBar/index.jsx` | Player UI — slider, optimistic seek, buffering indicator |
| `components/AudioTrackDialog/index.jsx` | Artist picker + 30-second preview system |
| `utils/audioDownloader.js` | `downloadTrack`, `downloadAudioOnly`, prefetch LRU cache |
| `assets/lyrics/bundledLyrics.js` | 19 lyrics files inlined by Metro at build time |

### `src/services/TrackPlayerService.js`
Background audio service registered via `TrackPlayer.registerPlaybackService()`. Handles:
- Remote controls: play, pause, stop, seek, next, previous
- Audio ducking (`RemoteDuck`): transient (phone call) vs. permanent (another music app)
- Queue ended → stop and reset
- Reads `isAudioAutoPlay` from `AsyncStorage` to decide whether to auto-resume after a transient duck

### `patches/`
`patch-package` patches applied automatically on every `npm install` via the `postinstall` hook.
- `react-native-track-player+4.1.2.patch` — patches `MusicService.kt` to handle null intents and wrap `startAndStopEmptyNotificationToAvoidANR()` in try/catch, preventing `ForegroundServiceStartNotAllowedException` crashes on Android 12+

### `docs/`
- `PROJECT_STRUCTURE.md` — This file

---

## Path Aliases

Configured in `babel.config.js`:

| Alias | Resolves to |
|---|---|
| `@common` | `./src/common` |
| `@database` | `./src/database/db` |
| `@service` | `./src/services` |
| `@settings` | `./src/Settings` |
| `@theme` | `./src/theme` |
