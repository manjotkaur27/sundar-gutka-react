import React, { useEffect, useState } from "react";
import { View, ScrollView, Pressable, StyleSheet, Image } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import PropTypes from "prop-types";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { CustomText, STRINGS, constant, actions, openInAppBrowser } from "@common";
import { getRecentReadBanis, getRecentListenedBanis } from "../../database/analytics";
import SectionLabel from "./SectionLabel";
import useDashboardTheme, { GOLD } from "./dashboardTheme";
import useBaniLookup from "./useBaniLookup";

const KHALIS_LOGO = require("../../assets/images/khalis.png");
const STTM_LOGO = require("../../assets/images/sikhi2max.webp");
const SHABADAVALI_LOGO = require("../../assets/images/shabadavali.png");

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
];

const ExploreGurbani = ({ refreshKey }) => {
  const { card, isDark, accentBlue, primaryText, mutedText } = useDashboardTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { nameOf } = useBaniLookup();
  const iconBg = isDark ? "rgba(255,255,255,0.08)" : "#eef2fb";

  const [lastRead, setLastRead] = useState(null);
  const [lastListened, setLastListened] = useState(null);

  useEffect(() => {
    getRecentReadBanis(1).then((r) => setLastRead(r[0] ?? null)).catch(() => {});
    getRecentListenedBanis(1).then((r) => setLastListened(r[0] ?? null)).catch(() => {});
  }, [refreshKey]);

  // Fall back to the default bani so Continue Reading/Listening always render.
  const fallback = { bani_id: constant.defaultBani.id, bani_title: constant.defaultBani.titleUni };
  const readItem = lastRead ?? fallback;
  const listenItem = lastListened ?? fallback;

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
    <Pressable
      onPress={() => openReader(item, withAudio)}
      style={({ pressed }) => [card, styles.tile, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon === "book" ? <BookIcon color={accentBlue} /> : <HeadphonesIcon color={accentBlue} />}
      </View>
      <CustomText style={[styles.title, { color: primaryText }]} numberOfLines={2}>
        {nameOf(item.bani_id) || item.bani_title || `Bani ${item.bani_id}`}
      </CustomText>
      <CustomText style={[styles.subtitle, { color: mutedText }]} numberOfLines={1}>{label}</CustomText>
    </Pressable>
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
        <ContinueTile icon="book" label={STRINGS.CONTINUE_READING} item={readItem} withAudio={false} />
        <ContinueTile icon="headphones" label={STRINGS.CONTINUE_LISTENING} item={listenItem} withAudio />

        {APP_TILES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => openInAppBrowser(t.url)}
            style={({ pressed }) => [card, styles.tile, pressed && { opacity: 0.75 }]}
            accessibilityRole="link"
            accessibilityLabel={t.title}
          >
            <View style={styles.iconRow}>
              <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                {t.icon === "search" ? (
                  <SearchIcon color={accentBlue} />
                ) : (
                  <Image source={t.image} style={styles.iconImg} resizeMode="contain" />
                )}
              </View>
              {t.badge ? (
                <View style={[styles.badge, { backgroundColor: GOLD }]}>
                  <CustomText style={styles.badgeText}>{t.badge}</CustomText>
                </View>
              ) : null}
            </View>
            <CustomText style={[styles.title, { color: primaryText }]} numberOfLines={2}>{t.title}</CustomText>
            <CustomText style={[styles.subtitle, { color: mutedText }]} numberOfLines={1}>{t.subtitle}</CustomText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

ExploreGurbani.propTypes = { refreshKey: PropTypes.number };
ExploreGurbani.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  tile: { width: 150, padding: 16 },
  iconRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  iconBox: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 14 },
  iconImg: { width: 32, height: 32 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: "600" },
  subtitle: { fontSize: 12, marginTop: 3 },
});

export default ExploreGurbani;
