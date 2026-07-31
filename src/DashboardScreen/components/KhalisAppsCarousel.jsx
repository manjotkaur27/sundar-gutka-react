import React from "react";
import { View, ScrollView, Pressable, Linking, StyleSheet, Image, Platform } from "react-native";
import { CustomText, useTheme, logError, trackKhalisAppClicked } from "@common";

const APPS = [
  {
    id: "sahej-path",
    name: "Sahej Path",
    pkg: "antisoft.livesehajpath",
    image: require("../../assets/images/sahej_path.png"),
    iconBgDark: "#0a1628",
    iconBgLight: "#E2E8F1",
    url: "https://play.google.com/store/apps/details?id=antisoft.livesehajpath&hl=en_IN",
  },
  {
    id: "sttm",
    name: "Sikhi To The Max",
    pkg: "com.nest.sttm",
    image: require("../../assets/images/sikhi2max.webp"),
    iconBgDark: "#0f2044",
    iconBgLight: "#ffffff",
    url: "https://play.google.com/store/apps/details?id=com.nest.sttm&hl=en_IN",
  },
  {
    id: "shabadavali",
    name: "Shabadavali",
    image: require("../../assets/images/shabadavali.png"),
    iconBgDark: "#0d1c10",
    iconBgLight: "#ffffff",
    url: "https://shabadavali.com/en/login",
  },
];

const openUrl = (url, name, pkg) => {
  trackKhalisAppClicked(name).catch(() => {});
  // On Android, market:// opens the Play Store app directly (not the browser).
  // If the target app is already installed, Play Store shows an "Open" button.
  // Fall back to the https Play Store URL if market:// is unavailable (no Play Store).
  if (Platform.OS === "android" && pkg) {
    Linking.openURL(`market://details?id=${pkg}`).catch(() => {
      Linking.openURL(url).catch((err) =>
        logError(new Error(`ExploreCarousel openURL failed: ${err?.message || err}`))
      );
    });
    return;
  }
  Linking.openURL(url).catch((err) =>
    logError(new Error(`ExploreCarousel openURL failed: ${err?.message || err}`))
  );
};

const ICON_SIZE = 88;
const ICON_INNER = 68;
const CARD_WIDTH = 120;

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  appItem: {
    width: CARD_WIDTH,
    alignItems: "center",
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 20,
    marginBottom: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxLight: {
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.3)",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  iconImage: {
    width: ICON_INNER,
    height: ICON_INNER,
  },
  iconEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
});

const KhalisAppsCarousel = () => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <View style={styles.container}>
      <CustomText style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>
        Explore
      </CustomText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {APPS.map((app) => {
          const iconBg = isDark ? app.iconBgDark : app.iconBgLight;
          return (
            <Pressable
              key={app.id}
              onPress={() => openUrl(app.url, app.name, app.pkg)}
              style={({ pressed }) => [styles.appItem, { opacity: pressed ? 0.75 : 1 }]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: iconBg },
                  !isDark && !app.image && styles.iconBoxLight,
                ]}
              >
                {app.image ? (
                  <Image source={app.image} style={styles.iconImage} resizeMode="contain" />
                ) : (
                  <CustomText style={styles.iconEmoji}>{app.emoji}</CustomText>
                )}
              </View>
              <CustomText
                style={[styles.appName, { color: theme.colors.primaryText }]}
                numberOfLines={2}
              >
                {app.name}
              </CustomText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default KhalisAppsCarousel;
