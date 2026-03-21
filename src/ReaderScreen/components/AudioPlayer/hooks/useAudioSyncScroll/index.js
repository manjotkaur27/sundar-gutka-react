import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import fetchLRCData from "../../utils/fetchLRC";

const useAudioSyncScroll = (progress, isPlaying, webViewRef, lyricsUrl, seekSyncRequest = null) => {
  const SEEK_PROGRESS_SETTLE_MS = 1800;
  const SEEK_PROGRESS_TOLERANCE_SEC = 1.25;
  const isAudioSyncScroll = useSelector((state) => state.isAudioSyncScroll);
  const isParagraphMode = useSelector((state) => state.isParagraphMode);
  const lastSequenceRef = useRef(null);
  const lastHandledSeekTokenRef = useRef(null);
  const seekGuardRef = useRef({
    active: false,
    targetPosition: null,
    targetSequence: null,
    expiresAt: 0,
  });
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const [baniLRC, setBaniLRC] = useState(null);

  // Load LRC data when audioUrl changes
  useEffect(() => {
    let isMounted = true;

    if (!lyricsUrl || !isAudioSyncScroll) {
      setBaniLRC(null);
      return undefined;
    }

    fetchLRCData(lyricsUrl).then((data) => {
      if (isMounted) {
        setBaniLRC(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [lyricsUrl, isAudioSyncScroll]);

  // Find current sequence based on audio progress.
  // LRC entries are sorted by start time, so we can binary-search instead of
  // scanning linearly on every playback tick — O(log n) vs O(n).
  const findCurrentSequence = (currentTime) => {
    if (currentTime == null || !baniLRC || !Array.isArray(baniLRC)) {
      return null;
    }

    let lo = 0;
    let hi = baniLRC.length - 1;
    while (lo <= hi) {
      // eslint-disable-next-line no-bitwise
      const mid = (lo + hi) >>> 1;
      const ts = baniLRC[mid];
      if (currentTime < ts.start) {
        hi = mid - 1;
      } else if (currentTime > ts.end) {
        lo = mid + 1;
      } else {
        return {
          currentSequence: ts.sequence,
          timeOut: (ts.end - ts.start) * 1000,
        };
      }
    }

    // If there is no exact timestamp hit (common around tiny timing gaps),
    // anchor to the nearest previous line so sync never gets stuck after seek.
    const fallbackIndex = hi < 0 ? 0 : lo >= baniLRC.length ? baniLRC.length - 1 : hi;
    const fallback = baniLRC[fallbackIndex];
    if (!fallback) {
      return {
        currentSequence: null,
        timeOut: 1000,
      };
    }

    return {
      currentSequence: fallback.sequence,
      timeOut: Math.max(120, (fallback.end - fallback.start) * 1000),
    };
  };

  // Scroll to specific sequence in WebView
  const scrollToSequence = (sequence, timeOut, options = {}) => {
    const { force = false, behavior = "auto" } = options;

    if (!webViewRef?.current?.postMessage || !sequence) {
      return false;
    }

    // Validate sequence is a safe positive integer
    const sequenceNumber = Number(sequence);
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
      // Invalid sequence - fail silently to prevent XSS
      return false;
    }

    try {
      // If a scroll is already in-flight, do not clear its unlock timer.
      // Clearing first and then returning would leave the lock stuck forever.
      if (isScrollingRef.current && !force) {
        return false;
      }

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      if (force) {
        isScrollingRef.current = false;
      }

      // Prevent multiple rapid scroll calls
      if (isScrollingRef.current) return false;
      isScrollingRef.current = true;

      const scrollMessage = {
        action: "scrollToSequence",
        sequence: sequenceNumber,
        behavior,
        timeout: timeOut,
        isParagraphMode,
      };

      webViewRef.current.postMessage(JSON.stringify(scrollMessage));

      // Reset scrolling flag after a short delay
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        scrollTimeoutRef.current = null;
      }, force ? 120 : 250);
      return true;
    } catch (error) {
      isScrollingRef.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      return false;
    }
  };

  // Main effect to handle sync scrolling
  useEffect(() => {
    // Only proceed if sync scroll is enabled and audio is playing
    if (!isAudioSyncScroll || !isPlaying || progress?.position == null || !baniLRC) {
      return;
    }

    // After a manual seek, ignore transient old-position progress ticks until
    // playback timeline catches up to the requested seek target.
    const guard = seekGuardRef.current;
    if (guard.active) {
      const now = Date.now();
      const isGuardExpired = now > guard.expiresAt;
      const targetPosition = Number(guard.targetPosition);
      const isNearSeekTarget =
        Number.isFinite(targetPosition) &&
        Math.abs(progress.position - targetPosition) <= SEEK_PROGRESS_TOLERANCE_SEC;

      if (!isGuardExpired && !isNearSeekTarget) {
        return;
      }

      seekGuardRef.current = {
        active: false,
        targetPosition: null,
        targetSequence: null,
        expiresAt: 0,
      };
    }

    const { currentSequence, timeOut } = findCurrentSequence(progress.position);

    // Only scroll if sequence changed and we have a valid sequence
    if (currentSequence !== null && currentSequence !== lastSequenceRef.current) {
      const didScroll = scrollToSequence(currentSequence, timeOut);
      if (didScroll) {
        lastSequenceRef.current = currentSequence;
      }
    }
  }, [progress?.position, isPlaying, isAudioSyncScroll, webViewRef, baniLRC]);

  // Seek-triggered sync: force an immediate jump to the target sequence so
  // rapid slider seeks don't get dropped by in-flight smooth-scroll throttling.
  useEffect(() => {
    if (!isAudioSyncScroll || !baniLRC || !seekSyncRequest) {
      return;
    }

    const seekToken = seekSyncRequest.ts;
    if (!seekToken || seekToken === lastHandledSeekTokenRef.current) {
      return;
    }
    lastHandledSeekTokenRef.current = seekToken;

    const lookup = findCurrentSequence(seekSyncRequest.position);
    const targetSequence = lookup?.currentSequence ?? null;

    seekGuardRef.current = {
      active: true,
      targetPosition: seekSyncRequest.position,
      targetSequence,
      expiresAt: Date.now() + SEEK_PROGRESS_SETTLE_MS,
    };

    if (!targetSequence) {
      return;
    }

    const didScroll = scrollToSequence(targetSequence, lookup.timeOut, {
      force: true,
      behavior: "auto",
    });
    if (didScroll) {
      lastSequenceRef.current = targetSequence;
    }
  }, [seekSyncRequest, isAudioSyncScroll, baniLRC]);

  // Reset when sync scroll is disabled or audio stops
  useEffect(() => {
    if (!isAudioSyncScroll || !isPlaying || !baniLRC) {
      lastSequenceRef.current = null;
      isScrollingRef.current = false;
      seekGuardRef.current = {
        active: false,
        targetPosition: null,
        targetSequence: null,
        expiresAt: 0,
      };
      // Clear any pending timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    }
  }, [isAudioSyncScroll, isPlaying, baniLRC]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentSequence: findCurrentSequence(progress?.position || 0)?.currentSequence,
    isScrollingEnabled: isAudioSyncScroll && isPlaying,
  };
};

export default useAudioSyncScroll;
