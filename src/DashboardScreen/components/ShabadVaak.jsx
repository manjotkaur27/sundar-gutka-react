import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Polyline } from "react-native-svg";
import PropTypes from "prop-types";
import { CustomText, STRINGS } from "@common";
import useDashboardTheme from "./dashboardTheme";
import RandomShabad from "./RandomShabad";
import TodaysVaak from "./TodaysVaak";

const ShuffleIcon = ({ color }) => (
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
    <Polyline points="16 3 21 3 21 8" />
    <Path d="M4 20L21 3" />
    <Polyline points="21 16 21 21 16 21" />
    <Path d="M15 15l6 6" />
    <Path d="M4 4l5 5" />
  </Svg>
);
ShuffleIcon.propTypes = { color: PropTypes.string.isRequired };

// Combined card: a segmented toggle (inside the card, like the audio bar's
// Tracks/Options pills) switches between Today's Vaak and Random Shabad. Both
// children stay mounted (toggled via display) so the shabad pre-fetches while the
// user is on the Vaak tab — switching is then instant. The active child renders
// "embedded" (bare, no own card/title) since this card + the active tab frame it.
const ShabadVaak = ({ refreshKey }) => {
  const { card, isDark, accentBlue, mutedText } = useDashboardTheme();
  const [tab, setTab] = useState("vaak");
  const [shabadNonce, setShabadNonce] = useState(0);

  const inactiveBg = isDark ? "rgba(255,255,255,0.06)" : "#eef2fb";
  const tabs = [
    { id: "vaak", label: STRINGS.TODAYS_VAAK },
    { id: "shabad", label: STRINGS.RANDOM_SHABAD },
  ];

  return (
    <View style={styles.wrap}>
      <View style={[card, styles.card]}>
        {/* Tabs (+ shuffle for the shabad tab) live INSIDE the card header. */}
        <View style={styles.header}>
          <View style={styles.tabsGroup}>
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tab, { backgroundColor: active ? accentBlue : inactiveBg }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <CustomText style={[styles.tabText, { color: active ? "#fff" : mutedText }]}>
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
              <ShuffleIcon color={accentBlue} />
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
      </View>
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
