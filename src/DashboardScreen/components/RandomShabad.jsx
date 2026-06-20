import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { CustomText, STRINGS, logError, openInAppBrowser } from "@common";
import { getRandomShabad } from "../../services/dashboard";
import useDashboardTheme, { GOLD } from "./dashboardTheme";

const ShuffleIcon = ({ color }) => (
  <Svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Polyline points="16 3 21 3 21 8" />
    <Path d="M4 20L21 3" />
    <Polyline points="21 16 21 21 16 21" />
    <Path d="M15 15l6 6" />
    <Path d="M4 4l5 5" />
  </Svg>
);
ShuffleIcon.propTypes = { color: PropTypes.string.isRequired };

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

const RandomShabad = ({ refreshKey }) => {
  const { card, isDark, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);
  const [shabad, setShabad] = useState(null);

  const load = useCallback(() => {
    getRandomShabad({ language: transliterationLanguage }).then(setShabad).catch(logError);
  }, [transliterationLanguage]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // A local-DB tukk has no ang/raag/shabadId, so hide the Ang·Raag + Read row.
  const showFooter = !!shabad?.shabadId;

  return (
    <View style={styles.wrap}>
      <View style={[card, styles.card]}>
        {/* Title + shuffle live inside the tile */}
        <View style={styles.headerRow}>
          <CustomText style={[styles.cardTitle, { color: GOLD }]}>
            {STRINGS.RANDOM_SHABAD.toUpperCase()}
          </CustomText>
          <Pressable
            onPress={load}
            hitSlop={8}
            style={[
              styles.shuffleBtn,
              { backgroundColor: isDark ? "rgba(37,129,223,0.16)" : "#eef2fb" },
            ]}
          >
            <ShuffleIcon color={accentBlue} />
            <CustomText style={[styles.shuffleText, { color: accentBlue }]}>
              {STRINGS.SHUFFLE}
            </CustomText>
          </Pressable>
        </View>

        {(shabad?.lines ?? []).map((line, i) => (
          <CustomText key={i} style={[styles.gurmukhi, { color: primaryText }]}>
            {line}
          </CustomText>
        ))}
        {shabad?.translation ? (
          <CustomText style={[styles.translation, { color: mutedText }]}>
            {shabad.translation}
          </CustomText>
        ) : null}

        {showFooter ? (
          <>
            <View style={[styles.footerDivider, { backgroundColor: separator }]} />
            <View style={styles.footer}>
              <CustomText style={[styles.meta, { color: mutedText }]}>
                {[shabad.ang ? `Ang ${shabad.ang}` : null, shabad.raag || null]
                  .filter(Boolean)
                  .join(" · ")}
              </CustomText>
              <Pressable
                style={styles.readLink}
                hitSlop={6}
                onPress={() =>
                  openInAppBrowser(`https://www.sikhitothemax.org/shabad?id=${shabad.shabadId}`)
                }
              >
                <CustomText style={[styles.readText, { color: accentBlue }]}>
                  {STRINGS.READ_SHABAD}
                </CustomText>
                <ChevronRight color={accentBlue} />
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
};

RandomShabad.propTypes = { refreshKey: PropTypes.number };
RandomShabad.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 1.2 },
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
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  footerDivider: { height: 1, marginVertical: 16 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { fontSize: 13 },
  readLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  readText: { fontSize: 14, fontWeight: "700" },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shuffleText: { fontSize: 13, fontWeight: "600" },
});

export default RandomShabad;
