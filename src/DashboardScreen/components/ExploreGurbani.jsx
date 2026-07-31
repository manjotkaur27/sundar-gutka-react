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
import { HukamnamaIcon } from "@common/icons";
import { CustomText, STRINGS, constant, actions, openInAppBrowser } from "@common";
import { getRecentReadBanis, getRecentListenedBanis } from "../../database/analytics";
import { getRestoredTopBanis } from "../../services/dashboard";
import DashboardCard, { CARD_SHADOW_BLEED } from "./DashboardCard";
import useDashboardTheme, { BRAND } from "./dashboardTheme";
import SectionLabel from "./SectionLabel";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";
import useBaniLookup from "./useBaniLookup";

const KHALIS_LOGO = require("../../assets/images/khalis.png");
const SEHAJ_PATH_LOGO = require("../../assets/images/sehajpath.webp");
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

// Map pin for the Gurdham tile — no artwork was supplied for it, so it uses a
// location glyph drawn in the same stroked style as the search icon above.
const PinIcon = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);
PinIcon.propTypes = { color: PropTypes.string.isRequired };

// Tiles carry an `icon` key when they draw a vector glyph instead of a logo
// image. Hukamnama's darbar artwork is solid-filled and detailed, so it gets a
// slightly larger box than the stroked glyphs to stay legible.
const TileIcon = ({ name, color }) => {
  if (name === "hukamnama") return <HukamnamaIcon size={26} color={color} />;
  if (name === "gurdham") return <PinIcon color={color} />;
  return <SearchIcon color={color} />;
};
TileIcon.propTypes = {
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
};

// `titleKey`/`subtitleKey`/`badgeKey` hold STRINGS keys for the localisable
// labels (resolved at render time so a language switch applies); brand and
// proper-noun labels (SikhiToTheMax, Shabadavali, Sehaj Path, Khalis App,
// Sri Darbar Sahib) stay as literal `title`/`subtitle` — they aren't translated.
const APP_TILES = [
  { id: "search", titleKey: "TILE_SEARCH_SHABAD", subtitle: "SikhiToTheMax", icon: "search", url: "https://www.sikhitothemax.org" },
  { id: "hukamnama", titleKey: "TILE_HUKAMNAMA", subtitle: "Sri Darbar Sahib", icon: "hukamnama", url: "https://www.sikhitothemax.org/hukamnama" },
  { id: "khalis-ai", titleKey: "TILE_ASK_AI", subtitleKey: "TILE_GURBANI_QA", image: KHALIS_LOGO, badgeKey: "BADGE_NEW", url: "https://www.sikhitothemax.org/" },
  {
    id: "sehaj-path",
    title: "Sehaj Path",
    subtitle: "Khalis App",
    image: SEHAJ_PATH_LOGO,
    pkg: SEHAJ_PATH_ANDROID_PKG,
    url: SEHAJ_PATH_STORE_URL,
    deepLink: true,
  },
  { id: "shabadavali", titleKey: "TILE_LEARN_WORD", subtitle: "Shabadavali", image: SHABADAVALI_LOGO, url: "https://shabadavali.com/en/login" },
  { id: "gurdham", titleKey: "TILE_EXPLORE_GURDHAM", subtitle: "Gurdham", icon: "gurdham", url: "https://gurdham.com" },
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
  const iconBg = isDark ? "rgba(255,255,255,0.08)" : BRAND.tint88;
  // Tile titles match the streak count / username navy.
  const titleColor = isDark ? "#ffffffff" : BRAND.base;
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
        {/* Same allowance as the app tiles — bani names run long in Gurmukhi. */}
        <CustomText
          style={[styles.title, { color: titleColor, fontFamily: titleFont }]}
          numberOfLines={3}
        >
          {nameOf(item.bani_id) || item.bani_title || `Bani ${item.bani_id}`}
        </CustomText>
        <CustomText style={[styles.subtitle, { color: mutedText }]} numberOfLines={2}>
          {label}
        </CustomText>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
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

        {APP_TILES.map((t) => {
          // Resolve localisable labels from STRINGS; brand/proper-noun labels
          // fall through to the literal title/subtitle on the tile.
          const title = t.titleKey ? STRINGS[t.titleKey] : t.title;
          const subtitle = t.subtitleKey ? STRINGS[t.subtitleKey] : t.subtitle;
          const badge = t.badgeKey ? STRINGS[t.badgeKey] : t.badge;
          return (
          <DashboardCard key={t.id} style={styles.tile}>
            <Pressable
              onPress={() => (t.deepLink ? openAppTile(t) : openInAppBrowser(t.url))}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityRole="link"
              accessibilityLabel={title}
            >
              <View style={styles.iconRow}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  {t.icon ? (
                    <TileIcon name={t.icon} color={iconColor} />
                  ) : (
                    <Image source={t.image} style={styles.iconImg} resizeMode="contain" />
                  )}
                </View>
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: gold }]}>
                    <CustomText style={styles.badgeText}>{badge}</CustomText>
                  </View>
                ) : null}
              </View>
              {/* Three lines, not two: the longest translations ("Rechercher
                  sur SikhiToTheMax") need a third rather than being cut off.
                  The row stretches every tile to the tallest, so allowing it
                  costs alignment nothing. */}
              <CustomText
                style={[styles.title, { color: titleColor, fontFamily: titleFont }]}
                numberOfLines={3}
              >
                {title}
              </CustomText>
              <CustomText style={[styles.subtitle, { color: mutedText }]} numberOfLines={2}>
                {subtitle}
              </CustomText>
            </Pressable>
          </DashboardCard>
          );
        })}
      </ScrollView>
    </View>
  );
};

ExploreGurbani.propTypes = { refreshKey: PropTypes.number };
ExploreGurbani.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  // A horizontal ScrollView clips to its bounds, so the row reserves the card
  // shadow's full reach; `scroll` pulls the same amount back off the layout so
  // the extra room costs no visible space.
  row: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: CARD_SHADOW_BLEED,
    paddingBottom: CARD_SHADOW_BLEED,
  },
  scroll: { marginTop: -CARD_SHADOW_BLEED, marginBottom: -CARD_SHADOW_BLEED + 4 },
  // Sized to its content, not to a fixed width. At 128 the text box was 96dp,
  // narrower than the single word "SikhiToTheMax" (~114dp at 16px), so RN split
  // it mid-word; the longer French and Spanish labels truncated outright.
  // minWidth keeps short tiles from looking cramped, maxWidth forces wrapping
  // so one long translation can't stretch a tile across the screen. Tiles are
  // stretched to a common height by the row, so they stay aligned.
  tile: { minWidth: 150, maxWidth: 190, paddingHorizontal: 16, paddingVertical: 20 },
  pressed: { opacity: 0.75 },
  iconRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  iconBox: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 14 },
  iconImg: { width: 32, height: 32 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 0.5 },
  // 18 was tighter than the 1.4 ratio that already clipped Baloo's Gurmukhi and
  // Devanagari matras in Settings, and it now has to hold up to three lines.
  title: { fontSize: 16, lineHeight: 24 },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  tileSkeleton: { width: "100%", height: 88 },
});

export default ExploreGurbani;
