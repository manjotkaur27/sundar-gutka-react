import React from "react";
import { View, ScrollView, Pressable, Linking, StyleSheet } from "react-native";
import { CustomText, useTheme, logError, trackKhalisAppClicked } from "@common";

const APPS = [
  {
    id: "gurbani-media",
    name: "Gurbani Media",
    tagline: "Audio Library",
    emoji: "🎬",
    iconBgDark: "#1c1c2e",
    iconBgLight: "#ffffff",
    url: "https://khalisfoundation.org",
  },
  {
    id: "sttm",
    name: "Sikhi To The Max",
    tagline: "Search Engine",
    emoji: "🔍",
    iconBgDark: "#0f2044",
    iconBgLight: "#ffffff",
    url: "https://www.sikhitothemax.org",
  },
  {
    id: "learn-larivaar",
    name: "Learn Larivaar",
    tagline: "Reading Practice",
    emoji: "✍️",
    iconBgDark: "#0d2414",
    iconBgLight: "#ffffff",
    url: "https://learnlarivaar.com",
  },
];

const openUrl = (url, name) => {
  trackKhalisAppClicked(name).catch(() => {});
  Linking.openURL(url).catch((err) =>
    logError(new Error(`ExploreCarousel openURL failed: ${err?.message || err}`))
  );
};

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
              onPress={() => openUrl(app.url, app.name)}
              style={({ pressed }) => [styles.appItem, { opacity: pressed ? 0.75 : 1 }]}
            >
              {/* iOS-style rounded-square app icon */}
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: iconBg },
                  !isDark && styles.iconBoxLight,
                ]}
              >
                <CustomText style={styles.iconEmoji}>{app.emoji}</CustomText>
              </View>
              <CustomText
                style={[styles.appName, { color: theme.colors.primaryText }]}
                numberOfLines={2}
              >
                {app.name}
              </CustomText>
              <CustomText
                style={[styles.appTagline, { color: theme.colors.textDisabled }]}
                numberOfLines={1}
              >
                {app.tagline}
              </CustomText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const ICON_SIZE = 100;
const CARD_WIDTH = 130;

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
    alignItems: "flex-start",
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconBoxLight: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 3,
    lineHeight: 18,
  },
  appTagline: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default KhalisAppsCarousel;
