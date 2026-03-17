/* eslint-env jest */
// Jest setup file - runs before all tests
// This centralizes common mocks so you don't have to repeat them in every test file

// Mock react-redux hooks (factory functions are called inside jest.mock)
jest.mock("react-redux", () => {
  const { createReactReduxMock } = require("@common/test-utils/mocks/react-redux");
  return createReactReduxMock().mock;
});

// Mock theme/context - useTheme is the default export
jest.mock("@common/context", () => {
  const { createContextMock } = require("@common/test-utils/mocks/context");
  return createContextMock();
});

// Mock useThemedStyles to return a stable style object
jest.mock("@common/hooks/useThemedStyles", () => {
  const { createUseThemedStylesMock } = require("@common/test-utils/mocks/useThemedStyles");
  return createUseThemedStylesMock();
});

// Mock icons to simple components
jest.mock("@common/icons", () => {
  const { createIconsMock } = require("@common/test-utils/mocks/icons");
  return createIconsMock();
});

// Mock @common exports
jest.mock("@common", () => {
  const { createCommonMock } = require("@common/test-utils/mocks/common");
  return createCommonMock();
});

// Mock react-native-fs to avoid TypeScript parsing issues
jest.mock("react-native-fs", () => ({
  DocumentDirectoryPath: "/test/documents",
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve("")),
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(() => Promise.resolve({ statusCode: 200 })),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() => Promise.resolve({ isFile: () => true, size: 0 })),
}));

// Mock react-native-track-player to avoid ESM/native module parsing in Jest
jest.mock("react-native-track-player", () => ({
  __esModule: true,
  default: {
    setupPlayer: jest.fn(() => Promise.resolve()),
    setRepeatMode: jest.fn(() => Promise.resolve()),
    updateOptions: jest.fn(() => Promise.resolve()),
    add: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
    seekTo: jest.fn(() => Promise.resolve()),
    getState: jest.fn(() => Promise.resolve("paused")),
    getActiveTrack: jest.fn(() => Promise.resolve(null)),
    getPosition: jest.fn(() => Promise.resolve(0)),
    getDuration: jest.fn(() => Promise.resolve(0)),
  },
  Capability: {
    Play: "Play",
    Pause: "Pause",
    SkipToNext: "SkipToNext",
    SkipToPrevious: "SkipToPrevious",
    Stop: "Stop",
    SeekTo: "SeekTo",
  },
  RepeatMode: {
    Off: "Off",
  },
  AppKilledPlaybackBehavior: {
    StopPlaybackAndRemoveNotification: "StopPlaybackAndRemoveNotification",
  },
  Event: {
    RemoteDuck: "remote-duck",
    PlaybackTrackChanged: "playback-track-changed",
    PlaybackQueueEnded: "playback-queue-ended",
    RemotePlay: "remote-play",
    RemotePause: "remote-pause",
    RemoteNext: "remote-next",
    RemotePrevious: "remote-previous",
    RemoteStop: "remote-stop",
    RemoteSeek: "remote-seek",
  },
  State: {
    Playing: "playing",
    Paused: "paused",
  },
  useProgress: jest.fn(() => ({ position: 0, duration: 0, buffered: 0 })),
}));
