import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Pressable, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { pauseTrack } from "@common/TrackPlayerUtils";
import {
  HomeIcon,
  SettingsIcon,
  MusicIcon,
  ReadIcon,
  DashboardIcon,
  SevaIcon,
} from "@common/icons";
import { CustomText, actions, constant, STRINGS, SafeArea } from "@common";
import { getSevaConfig } from "../../../services/sevaConfig";
import createStyles from "./style";

const BottomNavigation = ({
  activeKey,
  context = "home",
  visible = true,
  navigation: propNavigation,
}) => {
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const isAudio = useSelector((state) => state.isAudio);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  useSelector((state) => state.language); // re-render on language change so STRINGS labels update
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;

  const [showSevaDot, setShowSevaDot] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? Math.min(insets.bottom, 8) : 0;

  // Helper function to get current route name
  const getCurrentRouteName = useCallback(() => {
    const navState = navigation.getState();
    return navState?.routes[navState?.index]?.name;
  }, [navigation]);

  // Animate visibility (slide down when hidden)
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  // Load seva dot state from config
  useEffect(() => {
    let cancelled = false;
    getSevaConfig()
      .then((cfg) => {
        if (!cancelled) setShowSevaDot(!!cfg?.showSevaDot);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Connectivity is handled globally and event-driven now: NetworkProvider is
  // the single source of truth, and useOfflinePlaybackGuard (mounted once in
  // GlobalServices) stops streaming playback when real internet is lost. The
  // old per-instance polling watchdog that lived here has been removed.

  // Standard home screen navigator items
  const homeNavigationItems = [
    {
      key: "Home",
      icon: HomeIcon,
      handlePress: () => {
        navigation.navigate("Home");
      },
      text: STRINGS.HOME,
    },
    {
      key: "Dashboard",
      icon: DashboardIcon,
      handlePress: () => {
        navigation.navigate(constant.DASHBOARD);
      },
      text: STRINGS.DASHBOARD,
    },
    {
      key: "Seva",
      icon: SevaIcon,
      showDot: showSevaDot,
      handlePress: () => {
        navigation.navigate(constant.SEVA);
      },
      text: STRINGS.SEVA,
    },
    {
      key: "Settings",
      icon: SettingsIcon,
      handlePress: () => {
        navigation.navigate(constant.SETTINGS);
      },
      text: STRINGS.SETTINGS,
    },
  ];

  // Reader-specific navigation items (strictly matches all logic & dispatches)
  const readerNavigationItems = [
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
      text: STRINGS.ALL_BANIS, // Maps to "All Banis" localization key
    },
    {
      key: "Read",
      icon: ReadIcon,
      handlePress: async () => {
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
        if (!isAudioFeatureOn) {
          dispatch(actions.toggleAudioFeatureEnabled(true));
        }

        if (isAutoScroll) {
          dispatch(actions.toggleAutoScroll(false));
          dispatch(actions.toggleAudioFeatureEnabled(true));
        }

        const currentNavRoute = getCurrentRouteName();

        if (currentNavRoute === constant.SETTINGS) {
          if (isAudio) {
            navigation.goBack();
            return;
          }
          navigation.goBack();
        }

        if (isAudio) {
          return;
        }

        dispatch(actions.toggleAudio(true));
      },
      text: STRINGS.MUSIC,
    },
    {
      key: "Settings",
      icon: SettingsIcon,
      handlePress: async () => {
        if (isAudio) {
          await pauseTrack();
        }
        navigation.navigate(constant.SETTINGS, { fromReader: true });
      },
      text: STRINGS.SETTINGS,
    },
  ];

  const navigationItems =
    context === "reader" ? readerNavigationItems : homeNavigationItems;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
      }}
    >
      <SafeArea
        backgroundColor={theme.colors.primary}
        edges={["bottom"]}
        flex={0}
      >
        <View
          style={[
            styles.container,
            { paddingBottom: bottomPad }
          ]}
        >
          <View style={styles.navigationBar}>
            {navigationItems.map((item) => {
              const IconComponent = item.icon;

              return (
                <Pressable
                  key={item.key}
                  style={styles.iconContainer}
                  onPress={item.handlePress}
                  accessibilityRole="button"
                  accessibilityLabel={`bottomnav-${item.key}`}
                >
                  <View style={item.key === activeKey ? styles.activeIconContainer : null}>
                    <View style={{ position: "relative" }}>
                      <IconComponent
                        size={24}
                        color={
                          item.key === activeKey
                            ? theme.colors.primary
                            : theme.staticColors.WHITE_COLOR
                        }
                      />
                      {!!item.showDot && (
                        <View
                          style={{
                            position: "absolute",
                            top: -7,
                            right: -9,
                            backgroundColor: "#E53E3E",
                            borderRadius: 9,
                            minWidth: 16,
                            height: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingHorizontal: 2,
                            borderWidth: 1.2,
                            borderColor: item.key === activeKey ? theme.staticColors.WHITE_COLOR : theme.colors.primary,
                          }}
                        >
                          <CustomText
                            style={{
                              color: "#FFFFFF",
                              fontSize: 9,
                              fontWeight: "bold",
                              fontFamily: theme.typography.fonts.balooPaajiSemiBold,
                              textAlign: "center",
                              lineHeight: 13,
                            }}
                          >
                            1
                          </CustomText>
                        </View>
                      )}
                    </View>
                  </View>
                  {activeKey !== item.key && (
                    <CustomText style={styles.iconText}>{item.text}</CustomText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </SafeArea>
    </Animated.View>
  );
};

BottomNavigation.propTypes = {
  activeKey: PropTypes.string.isRequired,
  context: PropTypes.oneOf(["home", "reader"]),
  visible: PropTypes.bool,
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

export default BottomNavigation;
