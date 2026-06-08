import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ActivityIndicator, AppState, Platform, View, Animated, NativeModules } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import {
  constant,
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
} from "@common";
import { Header, AutoScrollComponent, AudioPlayer } from "./components";
import { useBookmarks, useFetchShabad } from "./hooks";
import useReadingSession from "@common/hooks/useReadingSession";
import createStyles from "./styles";
import { loadHTML } from "./utils";
import { pauseTrack } from "@common/TrackPlayerUtils";

const Reader = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDarkMode = theme.mode === "dark";
  const readerBgColor = isDarkMode ? "rgba(18, 18, 18, 1)" : "#FFFFFF";
  const bookmarkPosition = useSelector((state) => state.bookmarkPosition);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudio = useSelector((state) => state.isAudio);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const fontSize = useSelector((state) => state.fontSize);
  const fontFace = useSelector((state) => state.fontFace);
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
  const [isHeader, toggleHeader] = useState(false);
  // Timestamp of the last deliberate tap-to-toggle — see handleMessage's
  // show/hide guard below.
  const manualToggleAtRef = useRef(0);
  // Where/when the current touch on the WebView started — used to tell a
  // genuine tap apart from the start of a scroll/drag (see onTouchEnd below).
  const tapStartRef = useRef({ x: 0, y: 0, t: 0 });
  const [viewLoaded, toggleViewLoaded] = useState(false);
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false);
  const [dateKey, setDateKey] = useState(Date.now().toString());
  // Counter that increments on every WebView load — passed to AutoScrollComponent
  // so it can re-send the scroll command after a WKWebView remount (iOS drops
  // postMessages sent to a stale WebView instance).
  const [webViewLoadTick, setWebViewLoadTick] = useState(0);
  const [titleText, setTitleText] = useState(null);
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

  // Animated height for the BottomNavigation wrapper — collapses the layout
  // space when the nav hides so no blank gap is left behind
  const navTotalHeight = theme.components.bottomNavigation.height +
    (Platform.OS === 'ios' ? insetBottom : 0);
  const navHeightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(navHeightAnim, {
      toValue: isHeader ? navTotalHeight : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isHeader, navTotalHeight]);

  // Animated progress value — driven by ref to avoid re-renders on every scroll tick
  const scrollProgressAnim = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    // Handle undefined titleUni gracefully - fallback to title if titleUni is not available
    const displayTitle = fontFace === constant.BALOO_PAAJI ? titleUni || title : title;
    setTitleText(displayTitle);
  }, [fontFace, titleUni, title]);

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
    if (Platform.OS !== "ios") return;

    const unsubscribeFocus = navigation.addListener("focus", () => {
      if (!iPadScrollGuardRef.current) return;

      // Restore position — the WebView may have scrolled to 0 while backgrounded
      if (webViewRef.current && currentElementIdRef.current) {
        const scrollMessage = {
          action: "scrollToPosition",
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
        theme,
        isLarivaar
      ),
      baseUrl: Platform.OS === "ios" ? "./" : "",
    };
  }, [
    shabad,
    isTransliteration,
    fontSize,
    baniFontFace,
    isEnglishTranslation,
    isPunjabiTranslation,
    isSpanishTranslation,
    theme,
    isLarivaar,
  ]);

  useBookmarks(webViewRef, shabad, bookmarkPosition);
  useReadingSession({ baniId: id, baniTitle: titleUni || title, navigation });

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
          data.startsWith("scroll-progress-")
        ) {
          return;
        }
      }

      // Handle UI messages (removed toggle since it's handled by onTouchStart).
      // show/hide specifically are ignored for a short window after a deliberate
      // tap — gutkaScript's own scroll-direction show/hide can fire from residual
      // scroll-settle jitter right at the top/bottom boundary (most reproducible
      // at the very end of a bani), racing the tap's toggle and leaving the
      // header/nav animation stuck mid-flight as the target keeps getting reset.
      const recentManualToggle = Date.now() - manualToggleAtRef.current < 400;
      if (data === "show") {
        if (!recentManualToggle) toggleHeader(true);
      } else if (data === "hide") {
        if (!recentManualToggle) toggleHeader(false);
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
      }
    },
    [dispatch, id, navigation, shouldNavigateBack, isPlayerDragging]
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
        isHeader={isHeader}
      />
      {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
      <WebView
        key={webViewKey}
        webviewDebuggingEnabled={__DEV__}
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
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        onContentProcessDidTerminate={reloadWebView}
        source={webViewSource}
        backgroundColor={readerBgColor}
        style={[
          webView,
          theme.mode === "dark" && { opacity: viewLoaded ? 1 : 0.1 },
          { backgroundColor: readerBgColor, marginTop: 60 },
        ]}
        onMessage={handleMessage}
        onTouchStart={(e) => {
          // Record where/when the touch landed — don't toggle yet. Toggling
          // here fired on the down-stroke of EVERY touch, including the start
          // of a scroll/drag (nestedScrollEnabled means every scroll begins
          // with a touch on this WebView), which fought gutkaScript's own
          // scroll-direction show/hide on practically every scroll and left
          // the header/nav animation perpetually re-targeted, never settling.
          const touch = e?.nativeEvent?.touches?.[0] || e?.nativeEvent || {};
          tapStartRef.current = {
            x: touch.pageX ?? 0,
            y: touch.pageY ?? 0,
            t: Date.now(),
          };
        }}
        onTouchEnd={(e) => {
          // Only toggle for an actual tap — brief, with negligible movement.
          // A scroll/drag's matching touchend has large dx/dy and/or a long
          // duration, so it's correctly excluded here.
          const touch = e?.nativeEvent?.changedTouches?.[0] || e?.nativeEvent || {};
          const dx = Math.abs((touch.pageX ?? 0) - tapStartRef.current.x);
          const dy = Math.abs((touch.pageY ?? 0) - tapStartRef.current.y);
          const dt = Date.now() - tapStartRef.current.t;
          if (dt > 400 || dx > 10 || dy > 10) return;
          manualToggleAtRef.current = Date.now();
          toggleHeader((prev) => !prev);
          // Signal the floating mini player to toggle its expanded state.
          dispatch(actions.bumpReaderTap());
        }}
      />
      {isAudioFeatureOn && isAudio && <AudioPlayer baniID={id} title={titleText} notificationTitle={titleUni || titleText} webViewRef={webViewRef} />}
      {isAutoScroll && (
        <View style={[styles.autoScrollFixedView, { bottom: styles.autoScrollFixedView.bottom + insetBottom, display: isHeader ? "flex" : "none" }]}>
          <AutoScrollComponent shabadID={id} webViewRef={webViewRef} webViewLoadTick={webViewLoadTick} />
        </View>
      )}


      {/* Native scroll progress bar — fixed above BottomNavigation */}
      <View style={styles.scrollProgressTrack}>
        <Animated.View
          style={[
            styles.scrollProgressFill,
            { width: scrollProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
          ]}
        />
      </View>

      <Animated.View style={{ height: navHeightAnim, overflow: 'hidden' }}>
        <BottomNavigation
          activeKey={isAudioFeatureOn && isAudio ? "Music" : "Read"}
          context="reader"
          visible={isHeader}
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
