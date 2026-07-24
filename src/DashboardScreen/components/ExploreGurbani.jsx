import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Linking,
  Platform,
  NativeModules,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import PropTypes from "prop-types";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { CustomText, STRINGS, constant, actions, openInAppBrowser } from "@common";
import { getRecentReadBanis, getRecentListenedBanis } from "../../database/analytics";
import { getRestoredTopBanis } from "../../services/dashboard";
import DashboardCard from "./DashboardCard";
import useDashboardTheme from "./dashboardTheme";
import SectionLabel from "./SectionLabel";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";
import useBaniLookup from "./useBaniLookup";

const KHALIS_LOGO = require("../../assets/images/khalis.png");
const SEHAJ_PATH_LOGO = require("../../assets/images/sehajpath.webp");
const STTM_LOGO = require("../../assets/images/sikhi2max.webp");
const SHABADAVALI_LOGO = require("../../assets/images/shabadavali.png");

// Android: launched directly via the native AppLauncher module (see
// AppLauncherModule.kt), which asks PackageManager for the app's own launcher
// intent — a real app-to-app launch, not a Play Store listing. iOS has no
// equivalent here (no custom URL scheme was provided for Sehaj Path), so it
// always opens the App Store listing, which itself shows "Open" instead of
// "Get" when the app is already installed.
const SEHAJ_PATH_ANDROID_PKG = "com.khalis.sehajpathapp";
const SEHAJ_PATH_STORE_URL = Platform.select({
  ios: "https://apps.apple.com/us/app/khalis-sehaj-path/id6752426194",
  default: "https://play.google.com/store/apps/details?id=com.khalis.sehajpathapp",
});

const SearchIcon = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8" />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);
SearchIcon.propTypes = { color: PropTypes.string.isRequired };

const BookIcon = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Svg>
);
BookIcon.propTypes = { color: PropTypes.string.isRequired };

const HeadphonesIcon = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
    <Path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </Svg>
);
HeadphonesIcon.propTypes = { color: PropTypes.string.isRequired };

const APP_TILES = [
  { id: "khalis-ai", title: "Ask Khalis AI", subtitle: "Gurbani Q&A", image: KHALIS_LOGO, badge: "NEW", url: "https://www.sikhitothemax.org/" },
  { id: "search", title: "Search Shabad", subtitle: "SikhiToTheMax", icon: "search", url: "https://www.sikhitothemax.org" },
  { id: "hukamnama", title: "Hukamnama", subtitle: "Sri Darbar Sahib", image: STTM_LOGO, url: "https://www.sikhitothemax.org/hukamnama" },
  { id: "shabadavali", title: "Learn a Word", subtitle: "Shabadavali", image: SHABADAVALI_LOGO, url: "https://shabadavali.com/en/login" },
  {
    id: "sehaj-path",
    title: "Sehaj Path",
    subtitle: "Khalis App",
    image: SEHAJ_PATH_LOGO,
    pkg: SEHAJ_PATH_ANDROID_PKG,
    url: SEHAJ_PATH_STORE_URL,
    deepLink: true,
  },
];

// Deep-links to the native Sehaj Path app instead of the in-app browser used
// for the other tiles (those are plain websites). On Android, AppLauncher
// resolves true if it found and launched the app; false means it isn't
// installed (not an error) so we fall through to the store link either way.
const openAppTile = async (t) => {
  if (Platform.OS === "android" && t.pkg && NativeModules.AppLauncher) {
    try {
      const opened = await NativeModules.AppLauncher.openApp(t.pkg);
      if (opened) return;
    } catch (_) {
      // Fall through to the store link below.
    }
  }
  Linking.openURL(t.url).catch(() => {});
};

const ExploreGurbani = ({ refreshKey }) => {
  const { isDark, accentBlue, gold, mutedText, theme } = useDashboardTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { nameOf } = useBaniLookup();
  const iconBg = isDark ? "rgba(255,255,255,0.08)" : "#eef2fb";
  // Tile titles match the streak count / username navy.
  const titleColor = isDark ? "#ffffffff" : "#00397e";
  // Tile icons (search / read / listen) go white in dark mode for contrast on the navy card.
  const iconColor = isDark ? "#fff" : accentBlue;
  // Explicit SemiBold (no fontWeight) — same convention as the header name/streak
  // count, so the titles render the real SemiBold glyph instead of a fake-bold
  // (fontWeight + custom TTF) or Regular fallback that looks like a different font.
  const titleFont = theme.typography.fonts.balooPaajiSemiBold;

  const [lastRead, setLastRead] = useState(null);
  const [lastListened, setLastListened] = useState(null);

  const task = useCallback(async () => {
    const [r, l] = await Promise.all([getRecentReadBanis(1), getRecentListenedBanis(1)]);
    // Raw session history doesn't survive a reinstall — fall back to the
    // last-read/listened baaniId captured at the last cloud push. nameOf()
    // above already resolves the display name from the static bani
    // reference, so only the id is actually needed here.
    if (r[0]) {
      setLastRead(r[0]);
    } else {
      const restored = await getRestoredTopBanis();
      const baniId = restored?.read?.last?.baaniId;
      setLastRead(baniId != null ? { bani_id: baniId } : null);
    }
    if (l[0]) {
      setLastListened(l[0]);
    } else {
      const restored = await getRestoredTopBanis();
      const baniId = restored?.listen?.last?.baaniId;
      setLastListened(baniId != null ? { bani_id: baniId } : null);
    }
    // refreshKey isn't read above but forces a refetch on screen focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // No SectionError on failure: these tiles are supplementary personalization,
  // not core content — falling back to "no continue tiles" (same as a genuinely
  // new user) keeps the row from disappearing behind a heavy error block.
  const { loading } = useAsyncSection(task);

  // withAudio = true opens the bani with the audio player active (Continue Listening);
  // false opens it for reading (Continue Reading). The Reader only mounts the
  // AudioPlayer when state.isAudio is true.
  const openReader = (item, withAudio) => {
    dispatch(actions.toggleAudio(withAudio));
    navigation.navigate(constant.READER, {
      key: `Reader-${item.bani_id}`,
      params: { id: item.bani_id, title: item.bani_title ?? "", titleUni: item.bani_title ?? "" },
    });
  };

  const ContinueTile = ({ icon, label, item, withAudio }) => (
    <DashboardCard style={styles.tile}>
      <Pressable
        onPress={() => openReader(item, withAudio)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          {icon === "book" ? <BookIcon color={iconColor} /> : <HeadphonesIcon color={iconColor} />}
        </View>
        <CustomText style={[styles.title, { color: titleColor, fontFamily: titleFont }]} numberOfLines={2}>
          {nameOf(item.bani_id) || item.bani_title || `Bani ${item.bani_id}`}
        </CustomText>
        <CustomText style={[styles.subtitle, { color: mutedText }]} numberOfLines={1}>{label}</CustomText>
      </Pressable>
    </DashboardCard>
  );
  ContinueTile.propTypes = {
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    item: PropTypes.object.isRequired,
    withAudio: PropTypes.bool.isRequired,
  };

  return (
    <View>
      <SectionLabel title={STRINGS.EXPLORE} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {/* While the recent-history lookup is in flight, hold the tiles' place
            with skeletons instead of popping them in after APP_TILES. */}
        {loading ? (
          <>
            <DashboardCard style={styles.tile}>
              <SkeletonBlock style={styles.tileSkeleton} />
            </DashboardCard>
            <DashboardCard style={styles.tile}>
              <SkeletonBlock style={styles.tileSkeleton} />
            </DashboardCard>
          </>
        ) : null}

        {/* New users with no read/listen history yet get no tile — never a
            fabricated "Continue" pointing at a bani they've never opened. */}
        {!loading && lastRead ? (
          <ContinueTile
            icon="book"
            label={STRINGS.CONTINUE_READING}
            item={lastRead}
            withAudio={false}
          />
        ) : null}
        {!loading && lastListened ? (
          <ContinueTile
            icon="headphones"
            label={STRINGS.CONTINUE_LISTENING}
            item={lastListened}
            withAudio
          />
        ) : null}

        {APP_TILES.map((t) => (
          <DashboardCard key={t.id} style={styles.tile}>
            <Pressable
              onPress={() => (t.deepLink ? openAppTile(t) : openInAppBrowser(t.url))}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityRole="link"
              accessibilityLabel={t.title}
            >
              <View style={styles.iconRow}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  {t.icon === "search" ? (
                    <SearchIcon color={iconColor} />
                  ) : (
                    <Image source={t.image} style={styles.iconImg} resizeMode="contain" />
                  )}
                </View>
                {t.badge ? (
                  <View style={[styles.badge, { backgroundColor: gold }]}>
                    <CustomText style={styles.badgeText}>{t.badge}</CustomText>
                  </View>
                ) : null}
              </View>
              <CustomText style={[styles.title, { color: titleColor, fontFamily: titleFont }]} numberOfLines={2}>
                {t.title}
              </CustomText>
              <CustomText style={[styles.subtitle, { color: mutedText }]} numberOfLines={1}>
                {t.subtitle}
              </CustomText>
            </Pressable>
          </DashboardCard>
        ))}
      </ScrollView>
    </View>
  );
};

ExploreGurbani.propTypes = { refreshKey: PropTypes.number };
ExploreGurbani.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  tile: { width: 128, paddingHorizontal: 16, paddingVertical: 20 },
  pressed: { opacity: 0.75 },
  iconRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  iconBox: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 14 },
  iconImg: { width: 32, height: 32 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 0.5 },
  title: { fontSize: 16, lineHeight: 18 },
  subtitle: { fontSize: 12, marginTop: 3 },
  tileSkeleton: { width: "100%", height: 88 },
});

export default ExploreGurbani;
