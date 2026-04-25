import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { pauseTrack, stopTrack, resetPlayer } from "@common/TrackPlayerUtils";
import { HomeIcon, SettingsIcon, MusicIcon, ReadIcon } from "@common/icons";
import { CustomText, actions, constant, STRINGS, showErrorToast, showInfoToast } from "@common";
import createStyles from "./style";

const { INTERNET_CHECK_URL } = constant;

const BottomNavigation = ({ activeKey }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAudio = useSelector((state) => state.isAudio);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;
  const [isSettings, setIsSettings] = useState(false);
  const [previousRouteName, setPreviousRouteName] = useState(null);
  const previousConnectivityRef = useRef(null);
  // Require 2 consecutive poll failures before declaring "offline" to
  // avoid false-positive toasts from transient mobile network blips
  // (DNS hiccup, DOZE wake, tower switch, etc.).
  const consecutiveFailuresRef = useRef(0);
  const insets = useSafeAreaInsets();
  // On iOS: apply a small capped padding so icons sit just above the home indicator
  // without ballooning the navbar height. On Android: gesture bar is hidden by
  // sticky-immersive mode in MainActivity, so no bottom padding is needed.
  const bottomPad = Platform.OS === "ios" ? Math.min(insets.bottom, 8) : 0;

  const checkInternetConnection = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      // HEAD is lighter than GET — no body to download, lower latency.
      const response = await fetch(INTERNET_CHECK_URL, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      const isConnected = response?.ok ?? false;
      return isConnected;
    } catch (_) {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const wait = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

  // Helper function to get current route name
  const getCurrentRouteName = useCallback(() => {
    const navState = navigation.getState();
    return navState?.routes[navState?.index]?.name;
  }, [navigation]);

  useEffect(() => {
    const updateIsSettings = () => {
      const state = navigation.getState?.();
      if (!state) return;

      const topRoute = state.routes[state.index];
      let currentRouteName = topRoute?.name;

      // Handle nested navigators just in case
      if (topRoute?.state && typeof topRoute.state.index === "number") {
        const nestedRoute = topRoute.state.routes[topRoute.state.index];
        currentRouteName = nestedRoute?.name ?? currentRouteName;
      }

      // When entering Settings, check the previous route in navigation stack
      if (currentRouteName === constant.SETTINGS) {
        // Get the previous route from navigation state
        if (state.index > 0) {
          const prevRoute = state.routes[state.index - 1];
          let prevRouteName = prevRoute?.name;
          if (prevRoute?.state && typeof prevRoute.state.index === "number") {
            const nestedRoute = prevRoute.state.routes[prevRoute.state.index];
            prevRouteName = nestedRoute?.name ?? prevRouteName;
          }
          setPreviousRouteName(prevRouteName);
        }
      } else {
        // Update previous route when not on Settings
        setPreviousRouteName(currentRouteName);
      }

      setIsSettings(currentRouteName === constant.SETTINGS);
    };

    // Run once on mount
    updateIsSettings();

    // Subscribe to navigation state changes
    const unsubscribe =
      navigation.addListener?.("state", () => {
        updateIsSettings();
      }) || undefined;

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;

    const syncConnectivity = async () => {
      const isConnected = await checkInternetConnection();
      if (!isMounted) {
        return;
      }

      if (isConnected) {
        consecutiveFailuresRef.current = 0;
      } else {
        consecutiveFailuresRef.current += 1;
      }

      const wasConnected = previousConnectivityRef.current;
      previousConnectivityRef.current = isConnected;

      // First connectivity sample should establish baseline only (no toast).
      if (wasConnected == null) {
        return;
      }

      // Only declare offline after 2 consecutive failures to avoid
      // false-positive toasts from single transient network blips.
      if (wasConnected && !isConnected && consecutiveFailuresRef.current >= 2) {
        // Mirror settings "Audio off" behavior to remove notification controls.
        await stopTrack();
        await resetPlayer();
        dispatch(actions.toggleAudio(false));
        showErrorToast(STRINGS.NETWORK_ERROR);
      }
    };

    syncConnectivity();
    const intervalId = setInterval(syncConnectivity, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [checkInternetConnection, dispatch, isAudio]);

  const navigationItems = [
    {
      key: "Home",
      icon: HomeIcon,
      handlePress: async () => {
        if (isAudio) {
          await pauseTrack();
          dispatch(actions.toggleAudio(false));
        }
        navigation.popToTop();
      },
      text: STRINGS.HOME,
    },
    {
      key: "Read",
      icon: ReadIcon,
      handlePress: async () => {
        // Pause and disable audio BEFORE navigating back so that
        // AudioControlBar's focus-based auto-resume doesn't fire
        // (it would see isAudio=true and call play() on the focus event).
        if (isAudio) {
          await pauseTrack();
          dispatch(actions.toggleAudio(false));
        }

        const currentNavRoute = getCurrentRouteName();
        if (currentNavRoute === constant.SETTINGS) {
          navigation.goBack();
        }
      },
      text: STRINGS.READ,
    },
    {
      key: "Music",
      icon: MusicIcon,
      handlePress: async () => {
        if (!isAudioFeatureOn && !isAutoScroll) {
          return;
        }

        if (isAutoScroll) {
          dispatch(actions.toggleAutoScroll(false));
          dispatch(actions.toggleAudioFeatureEnabled(true));
          showInfoToast(STRINGS.AUDIO_DISABLES_AUTO_SCROLL || "AutoScroll has been disabled");
        }

        const isConnected = await checkInternetConnection();
        if (!isConnected) {
          // Hard shutdown to clear Android notification player when offline.
          await stopTrack();
          await resetPlayer();
          dispatch(actions.toggleAudio(false));
          showErrorToast(STRINGS.NETWORK_ERROR);
          return;
        }

        const currentNavRoute = getCurrentRouteName();

        if (currentNavRoute === constant.SETTINGS) {
          // Coming back from Settings — audio is already active (just paused).
          // Simply go back and let AudioControlBar's auto-resume handle playback.
          // Don't toggle audio off→on, which causes a visible nav flicker.
          if (isAudio) {
            navigation.goBack();
            return;
          }
          navigation.goBack();
        }

        // Audio is already active — nothing to do. The user can switch
        // artists via the player's own UI. Avoid the destructive
        // toggleAudio(false)→wait→toggleAudio(true) remount cycle which
        // causes a visible Read↔Music nav flicker.
        if (isAudio) {
          return;
        }

        dispatch(actions.toggleAudio(true));
      },
      text: STRINGS.MUSIC,
      hidden: !isAudioFeatureOn && !isAutoScroll,
    },
    {
      key: "Settings",
      icon: SettingsIcon,
      handlePress: async () => {
        // Pause playback but keep isAudio=true so the audio player UI
        // is preserved. When the user taps Back from Settings, they
        // return to the audio view (paused). If autoplay is on, the
        // AudioControlBar's loadActiveTrack effect will auto-resume.
        if (isAudio) {
          await pauseTrack();
        }
        navigation.navigate(constant.SETTINGS);
      },
      text: STRINGS.SETTINGS,
    },
  ];

  // Filter out Read and Music when on Settings page, but keep them if previous route was Read
  const shouldHideReadAndMusic = isSettings && previousRouteName !== constant.READER;
  const filteredNavigationItems = navigationItems.filter((item) => {
    if (item.hidden) {
      return false;
    }
    if (shouldHideReadAndMusic && (item.key === "Read" || item.key === "Music")) {
      return false;
    }
    return true;
  });

  return (
    <View
      style={[
        styles.container,
        // Absorb the home-indicator / gesture-bar height so the navbar background
        // colour fills behind the indicator while the icons stay compact above it.
        { paddingBottom: bottomPad },
      ]}
    >
      <View style={styles.navigationBar}>
        {filteredNavigationItems.map((item) => {
          const IconComponent = item.icon;

          return (
            <Pressable
              key={item.key}
              style={[styles.iconContainer, item.key === activeKey && styles.activeIconContainer]}
              onPress={item.handlePress}
              accessibilityRole="button"
              accessibilityLabel={`bottomnav-${item.key}`}
            >
              <IconComponent
                size={24}
                color={
                  item.key === activeKey ? theme.colors.primary : theme.staticColors.WHITE_COLOR
                }
              />
              {activeKey !== item.key && (
                <CustomText style={styles.iconText}>{item.text}</CustomText>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

BottomNavigation.propTypes = {
  activeKey: PropTypes.string.isRequired,
};

export default BottomNavigation;
