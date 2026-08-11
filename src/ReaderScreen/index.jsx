import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ActivityIndicator, AppState, Platform, View, Animated, NativeModules } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useDispatch, useSelector } from "react-redux";
import { useReaderTheme } from "@theme/reader";
import PropTypes from "prop-types";
import useReadingSession from "@common/hooks/useReadingSession";
import { pauseTrack } from "@common/TrackPlayerUtils";
import {
  constant,
  convertToUnicode,
  actions,
  logError,
  SafeArea,
  BottomNavigation,
  useTheme,
  useThemedStyles,
  StatusBarComponent,
  useBackHandler,
  showInfoToast,
  STRINGS,
  trackScrollProgress,
  trackNavBar,
} from "@common";
import AddToPothiSheet from "../Pothi/components/AddToPothiSheet";
import useRequireSignIn from "../Pothi/hooks/useRequireSignIn";
import { Header, AutoScrollComponent, AudioPlayer, ReaderScrollbar } from "./components";
import { useBookmarks, useFetchShabad } from "./hooks";
import createStyles from "./styles";
import { loadHTML } from "./utils";

// How long the bars linger with no interaction before auto-hiding during
// auto-scroll or audio playback.
const BARS_IDLE_HIDE_MS = 4000;

// Route params for the sign-in redirect out of this screen. A module constant,
// so its identity is stable and the callback that depends on it is not rebuilt
// on every render.
const READER_SETTINGS_PARAMS = { fromReader: true };

// The WebView's own top margin, and therefore where the scrollable viewport
// actually begins. ReaderScrollbar's track must start at the SAME line or its
// thumb travel no longer matches the page's — named once so the two cannot
// drift apart. This is NOT the header overlay height: the header floats OVER
// the page, while this is where the page itself starts.
const WEBVIEW_TOP_MARGIN = 60;

// React Native's own global. Read once here, so the dangling-underscore rule —
// which exists to stop US inventing such names — is waived in one place rather
// than at the JSX attribute, where a comment cannot go.
// eslint-disable-next-line no-underscore-dangle
const isDevBuild = Boolean(global.__DEV__);

const Reader = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  // How far the floating header covers the page.
  //
  // The header is absolutely positioned so it can slide away, which means the
  // top of the WebView viewport sits BEHIND it. A restore that scrolls an
  // element to "top of viewport" therefore parks that line under the header,
  // and the only way to read it is to scroll back up — which is what made a
  // freshly opened bani look like it had opened part-scrolled. Restores offset
  // by this instead.
  //
  // Built from the same two tokens as the header itself, so they cannot drift.
  const headerOverlayHeight = theme.layout.header.topClearance + theme.layout.header.minHeight;
  // The reading theme styles the Bani surface. `theme` above stays the app
  // appearance and still drives everything outside this screen.
  //
  // Its light/dark records take this ground from `c.backgroundAlt` — the same
  // role the Reader header and the rest of the app sit on — so following the app
  // keeps the Reader matching every other screen, exactly as before. `readerBg`
  // is the one value that feeds SafeArea, the status bar and the WebView, which
  // is why threading the theme through here reaches all three.
  const { theme: readerTheme } = useReaderTheme();
  const isReaderDark = readerTheme.base === "dark";
  const readerBgColor = readerTheme.background.color;
  const bookmarkPosition = useSelector((state) => state.bookmarkPosition);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudio = useSelector((state) => state.isAudio);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const fontSize = useSelector((state) => state.fontSize);
  const baniFontFace = useSelector((state) => state.baniFontFace);
  const isLarivaar = useSelector((state) => state.isLarivaar);
  const isLarivaarAssist = useSelector((state) => state.isLarivaarAssist);
  const isEnglishTranslation = useSelector((state) => state.isEnglishTranslation);
  const isPunjabiTranslation = useSelector((state) => state.isPunjabiTranslation);
  const isSpanishTranslation = useSelector((state) => state.isSpanishTranslation);
  const isParagraphMode = useSelector((state) => state.isParagraphMode);
  const isVishraam = useSelector((state) => state.isVishraam);
  const vishraamOption = useSelector((state) => state.vishraamOption);
  const savePosition = useSelector((state) => state.savePosition);
  const isAudioSyncScroll = useSelector((state) => state.isAudioSyncScroll);
  const isPlayerDragging = useSelector((state) => state.isPlayerDragging);

  const webViewRef = useRef(null);
  const { webView } = styles;
  const { title, id, titleUni } = route.params.params || {};
  // A bani OPENS with its chrome showing. It used to start hidden, so arriving
  // on the screen gave no header and no bottom navigation until you tapped —
  // there was nothing on screen to tell you a tap would bring them back. The
  // idle timer still hides them once you settle into reading.
  const [isHeader, toggleHeader] = useState(true);
  const [viewLoaded, toggleViewLoaded] = useState(false);
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false);
  const [dateKey, setDateKey] = useState(Date.now().toString());
  // Counter that increments on every WebView load — passed to AutoScrollComponent
  // so it can re-send the scroll command after a WKWebView remount (iOS drops
  // postMessages sent to a stale WebView instance).
  const [webViewLoadTick, setWebViewLoadTick] = useState(0);
  const [titleText, setTitleText] = useState(null);
  // Whether the add-to-pothi sheet is up. Signed out it never opens — see
  // handleAddToPothiPress.
  const [filing, setFiling] = useState(false);
  const readSavedPosition = (entry) => {
    if (!entry) return { elementId: null, sequence: null };
    if (typeof entry === "string") return { elementId: entry, sequence: null };
    if (typeof entry === "object") {
      return { elementId: entry.elementId || null, sequence: entry.sequence || null };
    }
    return { elementId: null, sequence: null };
  };
  const initialSaved = readSavedPosition(savePosition[id]);
  const currentElementIdRef = useRef(initialSaved.elementId);
  const currentSequenceRef = useRef(initialSaved.sequence);

  const dispatch = useDispatch();
  const { shabad, isLoading } = useFetchShabad(id);
  const { bottom: insetBottom } = useSafeAreaInsets();

  // Bottom-nav overlay footprint (nav height + the 5px progress track on top).
  // The audio player is lifted by exactly this much when the bars show so it
  // clears the nav.
  const navChromeHeight = theme.components.bottomNavigation.height + 5;

  // Native-driver transforms (NOT a JS height animation) so toggling the bars
  // never resizes the flex WebView underneath — the reflow was the low-end-
  // Android jank source. navSlideAnim slides the nav overlay off-screen;
  // audioLiftAnim rides the audio player above the nav; progressLiftAnim lifts
  // the progress bar to sit on top of the nav when the bars are shown.
  const navSlideAnim = useRef(new Animated.Value(300)).current; // starts hidden
  const navClusterHeightRef = useRef(0);
  const audioLiftAnim = useRef(new Animated.Value(0)).current; // starts down
  const progressLiftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const distance = navClusterHeightRef.current || 300;
    const anim = Animated.parallel([
      Animated.timing(navSlideAnim, {
        toValue: isHeader ? 0 : distance,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(audioLiftAnim, {
        toValue: isHeader ? -navChromeHeight : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(progressLiftAnim, {
        // Lift the progress bar onto the nav (nav height = navChromeHeight − 5px
        // track) when shown; drop it back to the bottom edge when hidden.
        toValue: isHeader ? -(navChromeHeight - 5) : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    // Stop the native-driven animation when the screen unmounts (or isHeader
    // toggles) mid-flight. Left running, the native driver keeps updating props
    // on nodes whose backing Animated.Values may be dropped during teardown,
    // which crashes in PropsAnimatedNode.updateView with "Mapped property node
    // does not exist" (RN #12893 / #37267). Stopping first also prevents the old
    // and new animations overlapping on the same values across isHeader toggles.
    return () => anim.stop();
  }, [isHeader, navSlideAnim, audioLiftAnim, progressLiftAnim, navChromeHeight]);

  // ── Bar-visibility funnel + idle auto-hide ──────────────────────────────
  // Live state mirrored into refs so the stable (empty-dep) scheduler never
  // reads stale closures.
  const isHeaderRef = useRef(isHeader);
  const isAutoScrollRef = useRef(isAutoScroll);
  const isAudioActiveRef = useRef(isAudioFeatureOn && isAudio);
  const barsIdleTimerRef = useRef(null);

  useEffect(() => {
    isAutoScrollRef.current = isAutoScroll;
  }, [isAutoScroll]);
  useEffect(() => {
    isAudioActiveRef.current = isAudioFeatureOn && isAudio;
  }, [isAudioFeatureOn, isAudio]);

  // Single mutation path for bar visibility — dedupes and fires analytics.
  const setBarsVisible = useCallback((visible, trigger) => {
    if (isHeaderRef.current === visible) return;
    isHeaderRef.current = visible;
    toggleHeader(visible);
    let mode = "reading";
    if (isAutoScrollRef.current) mode = "autoscroll";
    else if (isAudioActiveRef.current) mode = "audio";
    trackNavBar(visible, trigger, mode);
  }, []);

  const clearBarsIdleTimer = useCallback(() => {
    if (barsIdleTimerRef.current) {
      clearTimeout(barsIdleTimerRef.current);
      barsIdleTimerRef.current = null;
    }
  }, []);

  // While auto-scroll or audio is active and the bars are showing, hide them
  // after a period of no interaction. Any activity (touch/scroll/control tap)
  // restarts the countdown.
  const scheduleBarsIdleHide = useCallback(() => {
    clearBarsIdleTimer();
    if ((isAutoScrollRef.current || isAudioActiveRef.current) && isHeaderRef.current) {
      barsIdleTimerRef.current = setTimeout(() => {
        setBarsVisible(false, "auto_hide_idle");
      }, BARS_IDLE_HIDE_MS);
    }
  }, [clearBarsIdleTimer, setBarsVisible]);

  useEffect(() => {
    scheduleBarsIdleHide();
    return clearBarsIdleTimer;
  }, [isHeader, isAutoScroll, isAudioFeatureOn, isAudio, scheduleBarsIdleHide, clearBarsIdleTimer]);

  // Animated progress value — driven by ref to avoid re-renders on every scroll tick
  const scrollProgressAnim = useRef(new Animated.Value(0)).current;
  // Measured width of the progress bar, so the fill animates a NUMERIC pixel
  // width (0 → barWidth) instead of a percentage string. Animated percentage
  // widths can fail to apply on first paint and render full-width — this avoids
  // that entirely (the fill is 0px until measured).
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  // Fraction of the bani visible on screen (0-1], reported by the WebView on
  // layout and resize. Sizes the themed scroll indicator's thumb proportionally,
  // and hides it entirely when the whole bani already fits.
  const [visibleFraction, setVisibleFraction] = useState(1);
  // Latest scroll % (0-100) for analytics — updated on every WebView scroll message
  const scrollPercentRef = useRef(0);

  // iPad scroll guard: blocks spurious WebView scroll events during and shortly
  // after screen transitions (Bookmarks → Reader). WKWebView can fire scroll-to-0
  // events both while backgrounded AND during the return transition animation.
  const iPadScrollGuardRef = useRef(false);

  const pauseAudioPlayback = useCallback(async () => {
    try {
      await pauseTrack();
    } catch (_) {
      // Best effort audio pause while leaving Reader.
    }
  }, []);

  // Save element ID when leaving screen or app goes to background
  const saveScrollPosition = useCallback(() => {
    const elementIdToSave = currentElementIdRef.current;
    const sequenceToSave = currentSequenceRef.current;
    if (elementIdToSave) {
      dispatch(actions.setPosition(elementIdToSave, id, sequenceToSave));
    }
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(actions.setCurrentBani({ id, title, titleUni }));
  }, [id, title, titleUni]);

  // A fresh bani starts at 0% progress. The Reader screen is REUSED across
  // banis (navigating to "Reader" swaps route.params without remounting), so
  // without this reset scrollPercentRef keeps the PREVIOUS bani's value.
  // useReadingSession reads that ref on blur to decide completion — so a stale
  // >=95% from an already-read bani would falsely auto-mark the next bani
  // "done" at 0 scroll. Reset the analytics ref and the progress bar on id change.
  useEffect(() => {
    scrollPercentRef.current = 0;
    scrollProgressAnim.setValue(0);
    // Back to "everything fits" until the new bani reports its own ratio, so the
    // previous bani's thumb size never briefly shows on this one.
    setVisibleFraction(1);
  }, [id, scrollProgressAnim]);

  // Bottom inset for the WebView content. Whenever the bars are visible they
  // overlay the bottom navChromeHeight strip of the viewport, hiding the last
  // few lines — in reading mode the nav bar sits there, and in audio mode the
  // player lifts up by exactly navChromeHeight over it (see audioLiftAnim). The
  // amount covered is navChromeHeight in both modes, so reserve that much
  // scrollable space at the end of the content so the last line can scroll clear.
  // Re-applied on webViewLoadTick so it survives a WebView reload. Driven by
  // message (not baked into the HTML) so it never reflows/reloads the page.
  useEffect(() => {
    if (!webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ action: "setBottomInset", value: navChromeHeight })
    );
  }, [navChromeHeight, webViewLoadTick]);

  // The header title, resolved the SAME way the bani list resolves its rows.
  //
  // It used to show the ASCII-mapped `gurmukhi` name whenever the bani font was
  // anything but Baloo, and for many banis that name is an abbreviation — the
  // list said "ਜਪੁਜੀ ਸਾਹਿਬ" while the Reader header said "ਜਪੁਜੀ". The Unicode
  // name is the full one, so it is preferred outright and the ASCII name is
  // converted when no Unicode name exists.
  //
  // This is header CHROME, not bani content: it renders in the header face like
  // every other screen's title rather than in the user's chosen bani font, which
  // is what made the ASCII form necessary in the first place.
  // Resolved the SAME way the bani list resolves its rows, and rendered in the
  // header face rather than the user's bani font.
  //
  // Not font-dependent. The old form fell back to the ASCII name whenever the
  // bani font was not Baloo, and the ASCII name is the abbreviated one for many
  // banis — so the header read "ਜਪੁਜੀ" where the list read "ਜਪੁਜੀ ਸਾਹਿਬ".
  //
  // The other half of this lives at the CALLERS: every screen that opens the
  // Reader must hand over a proper name. The dashboard's Continue and Explore
  // tiles used to pass the server's abbreviated `bani_title`, and because those
  // tiles only appear ONCE A BANI HAS BEEN READ, the header looked correct for
  // the first opening or two and then truncated — the later opens were coming
  // from a different screen.
  useEffect(() => {
    setTitleText(titleUni || convertToUnicode(title));
  }, [titleUni, title]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Save position when component unmounts
      saveScrollPosition();
      pauseAudioPlayback();
    };
  }, [saveScrollPosition, pauseAudioPlayback]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener("blur", () => {
      pauseAudioPlayback();
      trackScrollProgress(id, titleUni || title, scrollPercentRef.current, isAudioSyncScroll);
      // iPad: Activate scroll guard when leaving the screen. WKWebView can
      // trigger a layout recalculation that resets scrollY to 0 while the
      // Reader is backgrounded, then again during the return transition.
      if (Platform.OS === "ios") {
        iPadScrollGuardRef.current = true;
      }
    });

    return unsubscribeBlur;
  }, [navigation, pauseAudioPlayback, id, titleUni, title, isAudioSyncScroll]);

  // iPad: Restore WebView scroll position when returning from Bookmarks.
  // The scroll guard stays active for a grace period after focus so that
  // spurious scroll events fired during the transition animation are also
  // blocked. The guard is cleared after the WebView has had time to
  // process the scrollToPosition message.
  useEffect(() => {
    if (Platform.OS !== "ios") return undefined;

    const unsubscribeFocus = navigation.addListener("focus", () => {
      if (!iPadScrollGuardRef.current) return;

      // Restore position — the WebView may have scrolled to 0 while backgrounded
      if (webViewRef.current && currentElementIdRef.current) {
        const scrollMessage = {
          action: "scrollToPosition",
          topInset: headerOverlayHeight,
          elementId: currentElementIdRef.current,
          sequence: currentSequenceRef.current,
        };
        webViewRef.current.postMessage(JSON.stringify(scrollMessage));
      }

      // Keep the guard active for 800ms to block scroll events that fire
      // during the navigation transition animation
      setTimeout(() => {
        iPadScrollGuardRef.current = false;
      }, 800);
    });

    return unsubscribeFocus;
  }, [navigation]);

  // Memoize WebView key to prevent unnecessary remounts
  const webViewKey = useMemo(() => {
    return `${id}-${isParagraphMode}-${isLarivaar}-${isLarivaarAssist}-${isVishraam}-${vishraamOption}-${dateKey}`;
  }, [id, isParagraphMode, isLarivaar, isLarivaarAssist, isVishraam, vishraamOption, dateKey]);

  // Memoize WebView source to prevent unnecessary remounts
  const webViewSource = useMemo(() => {
    return {
      html: loadHTML(
        shabad,
        isTransliteration,
        fontSize,
        baniFontFace,
        isEnglishTranslation,
        isPunjabiTranslation,
        isSpanishTranslation,
        readerTheme,
        isLarivaar
      ),
      baseUrl: Platform.OS === "ios" ? "./" : "",
    };
    // `readerTheme` is the dependency here, not the app theme — which is what
    // makes switching a reading theme repaint the Bani immediately, with no
    // restart and no WebView remount.
  }, [
    shabad,
    isTransliteration,
    fontSize,
    baniFontFace,
    isEnglishTranslation,
    isPunjabiTranslation,
    isSpanishTranslation,
    readerTheme,
    isLarivaar,
  ]);

  useBookmarks(webViewRef, shabad, bookmarkPosition);
  useReadingSession({ baniId: id, baniTitle: titleUni || title, navigation, scrollPercentRef });

  // Handle app state changes
  useEffect(() => {
    let isMounted = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (!isMounted) return;

      if (state === "active") {
        // App came to foreground
      } else if (state === "background") {
        // App went to background - save scroll position
        saveScrollPosition();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [saveScrollPosition]);

  // Set currentElementId from savePosition when it changes
  useEffect(() => {
    if (savePosition && id && savePosition[id]) {
      const saved = savePosition[id];
      if (typeof saved === "number" && saved > 0.9) {
        // Old numeric format — reset if at end of doc
        currentElementIdRef.current = null;
        return;
      }
      const { elementId, sequence } = readSavedPosition(saved);
      currentElementIdRef.current = elementId;
      currentSequenceRef.current = sequence;
    }
  }, [savePosition, id]);

  const handleBackPress = useCallback(() => {
    saveScrollPosition();
    pauseAudioPlayback();
    navigation.goBack();
    return true;
  }, [saveScrollPosition, navigation, pauseAudioPlayback]);

  useBackHandler(handleBackPress);

  const handleBookmarkPress = useCallback(() => {
    navigation.navigate(constant.BOOKMARKS, { id });
  }, [navigation, id]);

  // The same gate "+ New Pothi" uses: signed out, this does not open a sheet
  // the user cannot submit — it says why and takes them to Settings to sign in.
  // `fromReader` keeps the reader's bottom bar there, as the nav's own Settings
  // button does.
  const requireSignIn = useRequireSignIn(navigation.navigate, READER_SETTINGS_PARAMS);

  const handleAddToPothiPress = useCallback(() => {
    if (requireSignIn()) setFiling(true);
  }, [requireSignIn]);

  // The bani being read, in the shape the pothi model stores. `id` is coerced
  // because a route param can arrive as a string and every stored `baaniId` is
  // a number — a string would never match one and the sheet would show a bani
  // it already holds as unticked.
  const filingBani = useMemo(
    () => ({ id: Number(id), gurmukhi: title, gurmukhiUni: titleUni }),
    [id, title, titleUni]
  );

  const handleMessage = useCallback(
    (message) => {
      if (isPlayerDragging) {
        return;
      }
      // Update last activity timestamp
      const { data } = message.nativeEvent;

      // GUARD: On iOS, navigating away (e.g. to Bookmarks) can trigger a WKWebView
      // layout recalculation that resets scrollY to 0. This fires spurious scroll
      // events both while backgrounded AND during the return transition animation.
      // The ref-based guard (set on blur, cleared 800ms after focus) blocks all
      // scroll-derived messages during this window.
      if (iPadScrollGuardRef.current) {
        if (
          data === "show" ||
          data === "hide" ||
          data.includes("scroll-elementId-") ||
          // Let the position-restore progress fill through — it reflects an
          // intentional scrollIntoView after load, not a spurious transition
          // scroll-to-0, so the bar must still track the restored position.
          (data.startsWith("scroll-progress-") && !data.startsWith("scroll-progress-restore-"))
        ) {
          return;
        }
      }

      // Handle UI messages. gutkaScript posts: "toggle" on a genuine tap,
      // "show"/"hide" on scroll up/down, and "activity" on any touch (to restart
      // the idle auto-hide countdown during auto-scroll/audio). setBarsVisible is
      // the single mutation path (dedupes + fires analytics).
      if (data === "toggle") {
        setBarsVisible(!isHeaderRef.current, "tap");
        scheduleBarsIdleHide();
        dispatch(actions.bumpReaderTap());
      } else if (data === "activity") {
        scheduleBarsIdleHide();
      } else if (data === "show") {
        setBarsVisible(true, "scroll_up");
        scheduleBarsIdleHide();
      } else if (data === "hide") {
        setBarsVisible(false, "scroll_down");
      } else if (data.includes("scroll-elementId-")) {
        // Capture element ID (and optional sequence) from WebView scroll events.
        // Only update refs here — do NOT dispatch to Redux on every scroll tick.
        // saveScrollPosition() reads these refs and dispatches once on blur/unmount.
        const payload = data.split("scroll-elementId-")[1];
        const [elementId, seqPart] = payload.split("|seq-");
        const sequence = seqPart || null;
        currentElementIdRef.current = elementId;
        currentSequenceRef.current = sequence;
        if (shouldNavigateBack) {
          navigation.goBack();
          setShouldNavigateBack(false);
        }
      } else if (data.includes("sequenceString-")) {
        const sequenceStringData = data.split("-")[1];
        dispatch(actions.setBookmarkSequenceString(sequenceStringData));
      } else if (data.startsWith("scroll-progress-restore-")) {
        // Visual-only: fill the bar to the restored scroll position WITHOUT
        // touching scrollPercentRef. Restoring a prior position must never count
        // as reading toward completion — scrollPercentRef resets to 0 on open and
        // catches up once the user actually scrolls. (Must be checked before the
        // generic scroll-progress- branch below, whose prefix this also matches.)
        const pct = parseFloat(data.split("scroll-progress-restore-")[1]);
        if (Number.isFinite(pct)) {
          Animated.timing(scrollProgressAnim, {
            toValue: pct,
            duration: 0,
            useNativeDriver: false,
          }).start();
        }
      } else if (data.startsWith("scroll-progress-")) {
        const pct = parseFloat(data.split("scroll-progress-")[1]);
        if (Number.isFinite(pct)) {
          // width isn't transform-drivable, so this can't use the native driver —
          // fine here since it's an instant (duration: 0) set, not a tween.
          Animated.timing(scrollProgressAnim, {
            toValue: pct,
            duration: 0,
            useNativeDriver: false,
          }).start();
          scrollPercentRef.current = Math.round(pct * 100);
        }
      } else if (data.startsWith("scroll-ratio-")) {
        // What fraction of the bani fits on screen. Sizes the themed scroll
        // indicator's thumb and nothing else. Sent on layout and resize only,
        // never per scroll.
        const visible = parseFloat(data.split("scroll-ratio-")[1]);
        if (Number.isFinite(visible) && visible > 0) setVisibleFraction(visible);
      }
    },
    [
      dispatch,
      id,
      navigation,
      shouldNavigateBack,
      isPlayerDragging,
      setBarsVisible,
      scheduleBarsIdleHide,
    ]
  );

  const handleLoadStart = useCallback(() => {
    setTimeout(() => {
      toggleViewLoaded(true);
    }, 100);
  }, []);

  const handleLoadEnd = useCallback(() => {
    // Scroll to saved element ID after WebView is fully loaded
    if (webViewRef.current && currentElementIdRef.current) {
      const scrollMessage = {
        action: "scrollToPosition",
        topInset: headerOverlayHeight,
        elementId: currentElementIdRef.current,
        sequence: currentSequenceRef.current,
      };
      webViewRef.current.postMessage(JSON.stringify(scrollMessage));
    }

    // iPad fix: Disable the native iOS "tap status bar to scroll to top"
    // gesture on this WebView. On iPad, the touch target extends into the
    // app header, causing scroll resets when tapping back/title/bookmark.
    // Uses the custom WebViewScrollFixer native module (ios/WebViewScrollFixer.m)
    // so we don't need to patch react-native-webview.
    if (Platform.OS === "ios" && NativeModules.WebViewScrollFixer) {
      NativeModules.WebViewScrollFixer.disableScrollsToTop();
    }

    // Signal AutoScrollComponent that a fresh WebView is ready AFTER a short
    // delay so the scrollToPosition message above has time to execute in the
    // WebView. Without this, auto-scroll resumes from the top of the page.
    setTimeout(() => {
      setWebViewLoadTick((prev) => prev + 1);
    }, 500);
  }, []);

  const handleError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    logError(`Reader web View Error ${nativeEvent}`);
  }, []);

  const handleHttpError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    logError("HTTP error status code:", nativeEvent.statusCode);
  }, []);

  const reloadWebView = useCallback(() => {
    if (webViewRef.current) {
      // FEAT-06: Notify user and regenerate key — scroll restore happens in handleLoadEnd
      if (STRINGS.RELOADING_BANI) {
        showInfoToast(STRINGS.RELOADING_BANI);
      }
      setDateKey(Date.now().toString());
    }
  }, []);

  return (
    <SafeArea backgroundColor={readerBgColor} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor={readerBgColor} />
      <Header
        title={titleText}
        handleBackPress={handleBackPress}
        handleBookmarkPress={handleBookmarkPress}
        handleAddToPothiPress={handleAddToPothiPress}
        isHeader={isHeader}
      />
      {/* The same sheet the Folders tab opens, so filing a bani from the reader
          and filing one from a list are the one flow — including the "New
          Pothi" row that creates a pothi and drops this bani straight into it,
          without leaving the bani being read. */}
      <AddToPothiSheet visible={filing} onClose={() => setFiling(false)} bani={filingBani} />
      {isLoading && <ActivityIndicator size="small" color={theme.c.primary} />}
      {/* Don't mount the WebView until the shabad has loaded. Mounting on the
          initial empty shabad ([]) renders a placeholder page whose height equals
          the viewport, which the "not scrollable" check misreads as a completed
          read (false 100%) before the real content replaces it. Waiting also
          removes the wasteful empty→full WebView reload on every bani open. */}
      {shabad.length > 0 && (
        <WebView
          key={webViewKey}
          webviewDebuggingEnabled={isDevBuild}
          javaScriptEnabled
          originWhitelist={["*"]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          ref={webViewRef}
          onError={handleError}
          onHttpError={handleHttpError}
          decelerationRate={0.998}
          scrollEnabled={!isPlayerDragging}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled
          // Neither platform can give a THEMED scrollbar here:
          //   • Android draws the root scroller's bar itself, from a static app
          //     resource (colors.xml -> scrollbar_thumb), and never consults
          //     ::-webkit-scrollbar (crbug 40226034).
          //   • iOS offers only default/black/white on the UIScrollView
          //     indicator, and dropped custom CSS scrollbars in iOS 14.
          // So the native indicator is off on both and <ReaderScrollbar/> draws a
          // themed one over the top. An earlier attempt turned the native bar off
          // on Android expecting the CSS to take over — it does not, which left
          // no scrollbar at all.
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onContentProcessDidTerminate={reloadWebView}
          // Android equivalent of onContentProcessDidTerminate above: when the
          // Chromium renderer process dies out-of-process, react-native-webview
          // returns true so Android doesn't kill our app — but the WebView is
          // dead and would otherwise sit blank. Reload it the same way an iOS
          // content-process death is already handled. (Cannot catch the
          // in-process/low-memory SIGBUS case — that tears down the whole
          // process before any JS handler can run.)
          onRenderProcessGone={reloadWebView}
          source={webViewSource}
          backgroundColor={readerBgColor}
          style={[
            webView,
            // Gated on the READING theme's base, not the app's: a dark reading
            // theme needs the same first-paint fade even in a light app.
            isReaderDark && { opacity: viewLoaded ? 1 : 0.1 },
            { backgroundColor: readerBgColor, marginTop: WEBVIEW_TOP_MARGIN },
          ]}
          onMessage={handleMessage}
        />
      )}
      {/* Themed scroll indicator. Drawn here rather than styled in CSS because
          neither platform lets a reading theme tint the real scrollbar — see the
          component for the detail. Rides scrollProgressAnim, the same signal the
          bottom progress bar already uses. */}
      {shabad.length > 0 && (
        <ReaderScrollbar
          progress={scrollProgressAnim}
          color={readerTheme.scrollbar.thumb}
          width={readerTheme.scrollbar.width}
          visibleFraction={visibleFraction}
          topInset={WEBVIEW_TOP_MARGIN}
          bottomInset={insetBottom + 10}
        />
      )}
      {isAudioFeatureOn && isAudio && (
        <Animated.View
          style={{ transform: [{ translateY: audioLiftAnim }] }}
          // Touching the audio controls counts as activity — restart the idle
          // countdown so the bars (and the lifted player) don't drop mid-interaction.
          onTouchStart={scheduleBarsIdleHide}
          onTouchMove={scheduleBarsIdleHide}
        >
          <AudioPlayer
            baniID={id}
            title={titleText}
            notificationTitle={titleUni || titleText}
            webViewRef={webViewRef}
            isNavBarVisible={isHeader}
            // Opening the full player from the circle must not bring the bars
            // back with it — the user asked for the controls, not the chrome.
            onHideBars={() => setBarsVisible(false, "player_expanded")}
          />
        </Animated.View>
      )}
      {isAutoScroll && (
        <View
          testID="auto-scroll-bar-wrapper"
          style={[
            styles.autoScrollFixedView,
            {
              bottom: styles.autoScrollFixedView.bottom + insetBottom,
              display: isHeader ? "flex" : "none",
            },
          ]}
        >
          <AutoScrollComponent
            shabadID={id}
            webViewRef={webViewRef}
            webViewLoadTick={webViewLoadTick}
            onActivity={scheduleBarsIdleHide}
          />
        </View>
      )}

      {/* Bottom nav overlay — pinned to the bottom, slid out via a single
          native-driver transform, so showing/hiding never resizes the WebView. */}
      <Animated.View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) {
            navClusterHeightRef.current = h;
            // Snap to the exact off-screen distance on first measure so the
            // initial hidden state lands precisely with no visible flash.
            if (!isHeader) navSlideAnim.setValue(h);
          }
        }}
        style={[styles.bottomChrome, { transform: [{ translateY: navSlideAnim }] }]}
      >
        <BottomNavigation
          activeKey={isAudioFeatureOn && isAudio ? "Music" : "Read"}
          context="reader"
          visible
        />
      </Animated.View>

      {/* Reading-progress bar — a separate bottom-pinned layer that never hides.
          pointerEvents none so the thin bar never intercepts taps meant for the
          nav/mini-player beneath it. */}
      <Animated.View
        pointerEvents="none"
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== progressBarWidth) setProgressBarWidth(w);
        }}
        style={[
          styles.scrollProgressBar,
          // Sits on the bottom edge of the Bani surface, so it takes the reading
          // theme's tint rather than the app's. Following the app resolves both
          // steps back to withAlpha(c.accent, …) — what the stylesheet sets.
          { backgroundColor: readerTheme.chrome.progressTrack },
          { transform: [{ translateY: progressLiftAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.scrollProgressFill,
            { backgroundColor: readerTheme.chrome.progressFill },
            {
              width: scrollProgressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, progressBarWidth],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </Animated.View>
    </SafeArea>
  );
};

Reader.propTypes = {
  navigation: PropTypes.shape().isRequired,
  route: PropTypes.shape().isRequired,
};

export default React.memo(Reader);
