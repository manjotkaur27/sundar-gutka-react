import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS, logError, openInAppBrowser } from "@common";
import { formatFullDate } from "@common/dateLocale";
import { getDailyVaak } from "../../services/dashboard";
import { OfflineError } from "../../services/dashboard/connectivity";
import DashboardCard from "./DashboardCard";
import useDashboardTheme from "./dashboardTheme";
import OfflineNotice from "./OfflineNotice";
import SkeletonBlock from "./SkeletonBlock";

// "2026-07-25" (IST calendar date) → localised "Saturday, 25 July 2026". Built
// from the Y/M/D parts so the weekday is the IST date's weekday regardless of
// the device timezone (no UTC-parse drift).
const formatIstDate = (isoDate) => {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return "";
  return formatFullDate(new Date(y, m - 1, d));
};

const ChevronRight = ({ color }) => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);
ChevronRight.propTypes = { color: PropTypes.string.isRequired };

// Always open the live daily Hukamnama page on SikhiToTheMax — the same page the
// card's content mirrors.
const HUKAMNAMA_URL = "https://www.sikhitothemax.org/hukamnama";

const TodaysVaak = ({ refreshKey = 0, embedded = false }) => {
  const { gold, mutedText, theme, palette } = useDashboardTheme();
  // The card under these is a deep navy panel in BOTH themes, so the text on
  // it is light in both. Following the theme's text roles here put near-black
  // Gurbani on a navy card in light mode.
  const gurmukhiColor = palette.onVaakCard;
  const translationColor = palette.onVaakCardMuted;
  const gurmukhiFont = theme.typography.fonts.gurbaniHeavy;
  const [vaak, setVaak] = useState(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let active = true;
    // The vaak is the real daily Hukamnama — require connectivity so we never
    // present stale/placeholder lines as if they were today's official vaak.
    getDailyVaak({ requireOnline: true })
      .then((v) => {
        if (!active) return;
        setOffline(false);
        setVaak(v);
      })
      .catch((err) => {
        if (!active) return;
        // Offline OR API failure → show the notice; never fabricate a hukamnama.
        if (!(err instanceof OfflineError)) logError(err);
        setOffline(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, retryNonce]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  if (loading) {
    const skeleton = (
      <View style={styles.skeletonInner}>
        <SkeletonBlock style={styles.lineSkeletonWide} />
        <SkeletonBlock style={styles.lineSkeletonWide} />
        <SkeletonBlock style={styles.lineSkeletonNarrow} />
      </View>
    );
    if (embedded) return skeleton;
    return (
      <View style={styles.wrap}>
        <DashboardCard style={styles.card}>{skeleton}</DashboardCard>
      </View>
    );
  }

  if (offline) {
    return <OfflineNotice compact={embedded} message={STRINGS.VAAK_OFFLINE} onRetry={retry} />;
  }

  // No shabadId (e.g. a degraded backend fallback) → hide the Ang·Raag + Read
  // row, same guard Random Shabad uses.
  const showFooter = !!vaak?.shabadId;

  const body = (
    <>
      {/* When embedded in the Shabad/Vaak tab card the active tab is the title. */}
      {embedded ? null : (
        <CustomText style={[styles.cardTitle, { color: gold }]}>
          {STRINGS.TODAYS_VAAK.toUpperCase()}
        </CustomText>
      )}
      {/* Hukamnama date — shown in IST (the day rolls over at Sri Darbar Sahib),
          localised to the app language at render (so a language switch applies
          without waiting for the next day's fetch). Falls back to a legacy
          pre-formatted dateLabel from an older cached vaak. */}
      {vaak?.istDate || vaak?.dateLabel ? (
        <CustomText style={[styles.dateLine, { color: translationColor }]}>
          {`${vaak?.istDate ? formatIstDate(vaak.istDate) : vaak.dateLabel} · IST`}
        </CustomText>
      ) : null}
      {/* dailyVaak.js already filters the heading verse out and picks exactly
          2 lines, matching Random Shabad's short preview. */}
      {(vaak?.lines ?? []).map((line, i) => (
        <CustomText key={i} style={[styles.gurmukhi, { color: gurmukhiColor, fontFamily: gurmukhiFont }]}>
          {line}
        </CustomText>
      ))}
      {/* Gurbani only on this card — the translation belongs in the Reader,
          where the user's own translation settings apply. */}

      {showFooter ? (
        <>
          <View style={[styles.footerDivider, { backgroundColor: translationColor }]} />
          <View style={styles.footer}>
            <CustomText style={[styles.meta, { color: mutedText }]} numberOfLines={1}>
              {[vaak.ang ? `${STRINGS.ANG} ${vaak.ang}` : null, vaak.raag || null]
                .filter(Boolean)
                .join(" · ")}
            </CustomText>
            {/* Tap to read the full hukamnama on SikhiToTheMax. */}
            <Pressable
              style={styles.readLink}
              onPress={() => openInAppBrowser(HUKAMNAMA_URL)}
              hitSlop={6}
              accessibilityRole="button"
            >
              <CustomText style={[styles.readText, { color: gurmukhiColor }]}>
                {STRINGS.READ_HUKAMNAMA}
              </CustomText>
              <ChevronRight color={gurmukhiColor} />
            </Pressable>
          </View>
        </>
      ) : null}
    </>
  );

  // Embedded inside the Shabad/Vaak tab card → render bare (the parent provides
  // the card). Standalone → wrap in its own card.
  if (embedded) return body;
  return (
    <View style={styles.wrap}>
      <DashboardCard style={styles.card}>{body}</DashboardCard>
    </View>
  );
};

TodaysVaak.propTypes = { refreshKey: PropTypes.number, embedded: PropTypes.bool };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 22 },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textAlign: "center",
    marginBottom: 14,
  },
  dateLine: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 14,
  },
  gurmukhi: {
    fontSize: 19,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 31,
    paddingHorizontal: 4,
  },
  footerDivider: { height: 1, marginVertical: 16 },
  // `space-between` only yields a gap while there is room to spare; once there
  // is not, the two halves butt together ("…ਰਾਗੁ ਸੋਰਠਿRead Hukamnama") and the
  // link runs off the card. Same defect as RandomShabad, same fix.
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  meta: { fontSize: 13, flexShrink: 1 },
  readLink: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 },
  // No fontWeight — matches the "Ang · Raag" meta text beside it (Baloo Paaji
  // Regular via CustomText's default resolution) instead of the bold brand font.
  readText: { fontSize: 14, fontWeight: "600" },
  skeletonInner: { alignItems: "center", gap: 10, paddingVertical: 6 },
  lineSkeletonWide: { width: "80%", height: 18 },
  lineSkeletonNarrow: { width: "55%", height: 18 },
});

export default TodaysVaak;
