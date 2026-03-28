/* eslint-env jest */

const listeners = {};

const mockTrackPlayer = {
  addEventListener: jest.fn((eventName, handler) => {
    listeners[eventName] = handler;
    return { remove: jest.fn() };
  }),
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  reset: jest.fn(() => Promise.resolve()),
  seekTo: jest.fn(() => Promise.resolve()),
  skipToNext: jest.fn(() => Promise.resolve()),
  skipToPrevious: jest.fn(() => Promise.resolve()),
  getPlaybackState: jest.fn(() => Promise.resolve({ state: "playing" })),
};

const Event = {
  RemotePlay: "RemotePlay",
  RemotePause: "RemotePause",
  RemoteStop: "RemoteStop",
  RemoteSeek: "RemoteSeek",
  RemoteNext: "RemoteNext",
  RemotePrevious: "RemotePrevious",
  RemoteDuck: "RemoteDuck",
  PlaybackQueueEnded: "PlaybackQueueEnded",
  PlaybackError: "PlaybackError",
};

const State = {
  Playing: "playing",
  Buffering: "buffering",
  Paused: "paused",
};

jest.mock("react-native-track-player", () => ({
  __esModule: true,
  default: mockTrackPlayer,
  Event,
  State,
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(JSON.stringify({ isAudioAutoPlay: "true" }))),
  },
}));

describe("TrackPlayerService RemoteDuck behavior", () => {
  let registerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    jest.resetModules();
    registerService = require("./TrackPlayerService");
    await registerService();
  });

  it("auto-resumes after transient duck when playback was active", async () => {
    mockTrackPlayer.getPlaybackState.mockResolvedValueOnce({ state: State.Playing });

    await listeners[Event.RemoteDuck]({ paused: true, permanent: false });
    await listeners[Event.RemoteDuck]({ paused: false, permanent: false });

    expect(mockTrackPlayer.pause).toHaveBeenCalled();
    expect(mockTrackPlayer.play).toHaveBeenCalled();
  });

  it("does not auto-resume after transient duck when playback was not active", async () => {
    mockTrackPlayer.getPlaybackState.mockResolvedValueOnce({ state: State.Paused });

    await listeners[Event.RemoteDuck]({ paused: true, permanent: false });
    await listeners[Event.RemoteDuck]({ paused: false, permanent: false });

    expect(mockTrackPlayer.pause).toHaveBeenCalled();
    expect(mockTrackPlayer.play).not.toHaveBeenCalled();
  });

  it("stops and resets on permanent duck and never auto-resumes", async () => {
    await listeners[Event.RemoteDuck]({ paused: true, permanent: true });
    await listeners[Event.RemoteDuck]({ paused: false, permanent: false });

    expect(mockTrackPlayer.pause).toHaveBeenCalled();
    expect(mockTrackPlayer.stop).toHaveBeenCalled();
    expect(mockTrackPlayer.reset).toHaveBeenCalled();
    expect(mockTrackPlayer.play).not.toHaveBeenCalled();
  });

  it("handles playback state check failure without resuming", async () => {
    mockTrackPlayer.getPlaybackState.mockRejectedValueOnce(new Error("state read failed"));

    await listeners[Event.RemoteDuck]({ paused: true, permanent: false });
    await listeners[Event.RemoteDuck]({ paused: false, permanent: false });

    expect(mockTrackPlayer.pause).toHaveBeenCalled();
    expect(mockTrackPlayer.play).not.toHaveBeenCalled();
  });
});
