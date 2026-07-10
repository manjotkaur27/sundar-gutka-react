import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS } from "@common";
import DashboardCard from "./DashboardCard";
import useDashboardTheme from "./dashboardTheme";
import RandomShabad from "./RandomShabad";
import TodaysVaak from "./TodaysVaak";

// Single-arrow refresh glyph: one near-full circular arc with one arrowhead
// (as opposed to the two-arrow "shuffle-style" refresh look).
const RefreshIcon = ({ color }) => (
  <Svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M21 12a9 9 0 1 1-3.05-6.75" />
    <Polyline points="21 3 21 8 16 8" />
  </Svg>
);
RefreshIcon.propTypes = { color: PropTypes.string.isRequired };

// Combined card: a segmented toggle (inside the card, like the audio bar's
// Tracks/Options pills) switches between Today's Vaak and Random Shabad. Both
// children stay mounted (toggled via display) so the shabad pre-fetches while the
// user is on the Vaak tab — switching is then instant. The active child renders
// "embedded" (bare, no own card/title) since this card + the active tab frame it.
const ShabadVaak = ({ refreshKey }) => {
  const { isDark, mutedText, gold } = useDashboardTheme();
  const [tab, setTab] = useState("vaak");
  const [shabadNonce, setShabadNonce] = useState(0);

  const inactiveBg = isDark ? "rgba(255,255,255,0.06)" : "#eef2fb";
  const goldTint = isDark ? "rgba(210,144,48,0.16)" : "#FBF1E2";
  // Client-specified card color for Today's Vaak / Random Shabad, dark mode only.
  const cardBgOverride = isDark ? { backgroundColor: "#0D2143" } : null;
  const tabs = [
    { id: "vaak", label: STRINGS.TODAYS_VAAK },
    { id: "shabad", label: STRINGS.RANDOM_SHABAD },
  ];

  return (
    <View style={styles.wrap}>
      <DashboardCard style={[styles.card, cardBgOverride]}>
        {/* Tabs (+ shuffle for the shabad tab) live INSIDE the card header. */}
        <View style={styles.header}>
          <View style={styles.tabsGroup}>
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tab, { backgroundColor: active ? goldTint : inactiveBg }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <CustomText style={[styles.tabText, { color: active ? gold : mutedText }]}>
                    {t.label}
                  </CustomText>
                </Pressable>
              );
            })}
          </View>

          {tab === "shabad" ? (
            <Pressable
              onPress={() => setShabadNonce((n) => n + 1)}
              hitSlop={10}
              style={[styles.shuffleBtn, { backgroundColor: inactiveBg }]}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.SHUFFLE}
            >
              <RefreshIcon color={gold} />
            </Pressable>
          ) : null}
        </View>

        {/* Both mounted; only the active one is shown (display) so each pre-fetches. */}
        <View style={tab === "vaak" ? styles.shown : styles.hidden}>
          <TodaysVaak embedded refreshKey={refreshKey} />
        </View>
        <View style={tab === "shabad" ? styles.shown : styles.hidden}>
          <RandomShabad embedded refreshKey={refreshKey} reloadNonce={shabadNonce} />
        </View>
      </DashboardCard>
    </View>
  );
};

ShabadVaak.propTypes = { refreshKey: PropTypes.number };
ShabadVaak.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 18 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tabsGroup: { flexDirection: "row", gap: 6, flexShrink: 1 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  tabText: { fontSize: 13, fontWeight: "600" },
  // Icon-only circular button (text "Shuffle" was overflowing the row alongside
  // the two tab pills); keeps the header on a single line.
  shuffleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  shown: { display: "flex" },
  hidden: { display: "none" },
});

export default ShabadVaak;
