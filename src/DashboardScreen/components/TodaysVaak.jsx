import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS, logError, openInAppBrowser } from "@common";
import { getDailyVaak } from "../../services/dashboard";
import { OfflineError } from "../../services/dashboard/connectivity";
import useDashboardTheme, { GOLD } from "./dashboardTheme";
import OfflineNotice from "./OfflineNotice";

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

const TodaysVaak = ({ refreshKey, embedded }) => {
  const { card, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
  const [vaak, setVaak] = useState(null);
  const [offline, setOffline] = useState(false);

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
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (offline) return <OfflineNotice compact message={STRINGS.VAAK_OFFLINE} />;

  const body = (
    <>
      {/* When embedded in the Shabad/Vaak tab card the active tab is the title. */}
      {embedded ? null : (
        <CustomText style={[styles.cardTitle, { color: GOLD }]}>
          {STRINGS.TODAYS_VAAK.toUpperCase()}
        </CustomText>
      )}
      {/* Hukamnama date — shown in IST (the day rolls over at Sri Darbar Sahib). */}
      {vaak?.dateLabel ? (
        <CustomText style={[styles.dateLine, { color: mutedText }]}>
          {`${vaak.dateLabel} · IST`}
        </CustomText>
      ) : null}
      {(vaak?.lines ?? []).map((line, i) => (
        <CustomText key={i} style={[styles.gurmukhi, { color: primaryText }]}>
          {line}
        </CustomText>
      ))}
      {vaak?.translation ? (
        <CustomText style={[styles.translation, { color: mutedText }]}>
          {vaak.translation}
        </CustomText>
      ) : null}

      <View style={[styles.footerDivider, { backgroundColor: separator }]} />
      {/* Tap to read the full hukamnama on SikhiToTheMax. */}
      <Pressable
        style={styles.readLink}
        onPress={() => openInAppBrowser(HUKAMNAMA_URL)}
        hitSlop={6}
        accessibilityRole="button"
      >
        <CustomText style={[styles.readText, { color: accentBlue }]}>
          {STRINGS.READ_HUKAMNAMA}
        </CustomText>
        <ChevronRight color={accentBlue} />
      </Pressable>
    </>
  );

  // Embedded inside the Shabad/Vaak tab card → render bare (the parent provides
  // the card). Standalone → wrap in its own card.
  if (embedded) return body;
  return (
    <View style={styles.wrap}>
      <View style={[card, styles.card]}>{body}</View>
    </View>
  );
};

TodaysVaak.propTypes = { refreshKey: PropTypes.number, embedded: PropTypes.bool };
TodaysVaak.defaultProps = { refreshKey: 0, embedded: false };

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
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 31,
    paddingHorizontal: 4,
  },
  translation: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  footerDivider: { height: 1, marginTop: 16, marginBottom: 12 },
  readLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  readText: { fontSize: 14, fontWeight: "700" },
});

export default TodaysVaak;
