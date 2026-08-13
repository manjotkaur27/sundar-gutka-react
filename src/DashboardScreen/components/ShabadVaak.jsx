import React, { useState } from "react";
import { View, Pressable, StyleSheet, Image, useWindowDimensions } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS } from "@common";
import DashboardCard, { CARD_RADIUS } from "./DashboardCard";
import useDashboardTheme from "./dashboardTheme";
import RandomShabad from "./RandomShabad";
import RefreshSpinner from "./RefreshSpinner";
import TodaysVaak from "./TodaysVaak";
// Sunlit Sri Harmandir Sahib, used as the faint backdrop for the Hukamnama tab.
// Square crop, so `cover` fills the wide card by trimming top and bottom evenly
// rather than cutting the building out of frame.
const DARBAR_SAHIB = require("../../assets/images/darbar-sahib.jpg");

// Combined card: a segmented toggle (inside the card, like the audio bar's
// Tracks/Options pills) switches between Today's Vaak and Random Shabad. Both
// children stay mounted (toggled via display) so the shabad pre-fetches while the
// user is on the Vaak tab — switching is then instant. The active child renders
// "embedded" (bare, no own card/title) since this card + the active tab frame it.
const ShabadVaak = ({ refreshKey = 0 }) => {
  // Side by side, the two pills plus the shuffle button need more width than a
  // small screen has once the labels grow — "RANDOM SHABAD" clipped to
  // "RANDO…". Stacking them puts each on its own full-width row, which reads
  // better than two half-legible pills.
  const { fontScale } = useWindowDimensions();
  const stackedTabs = (fontScale || 1) > 1.15;

  const { mutedText, gold, palette } = useDashboardTheme();
  const [tab, setTab] = useState("vaak");
  const [shabadNonce, setShabadNonce] = useState(0);
  // Mirrors RandomShabad's fetch state so the shuffle can show progress and
  // stop accepting taps — otherwise it looks inert and each extra tap queues
  // another swap that lands seconds later.
  const [shabadLoading, setShabadLoading] = useState(false);

  const inactiveBg = palette.vaakTabBg;
  const goldTint = palette.vaakTabActiveBg;
  const tabs = [
    { id: "vaak", label: STRINGS.TODAYS_VAAK },
    { id: "shabad", label: STRINGS.RANDOM_SHABAD },
  ];

  return (
    <View style={styles.wrap}>
      {/* Deep navy in BOTH themes — this card is not a standard surface. */}
      <DashboardCard style={[styles.card, { backgroundColor: palette.vaakCardBg }]}>
        {/* Sri Darbar Sahib behind the Hukamnama tab, to place where the
            hukamnama comes from. Only on that tab — the random shabad is not
            from the darbar. Clipped by its own wrapper rather than by the card,
            so the card keeps its shadow (overflow hidden suppresses elevation
            on Android). First child, and non-interactive, so it paints beneath
            the content without intercepting taps. */}
        {tab === "vaak" ? (
          <View style={styles.backdrop} pointerEvents="none">
            <Image
              source={DARBAR_SAHIB}
              style={[styles.backdropImage, { opacity: palette.backdropOpacity }]}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Tabs (+ shuffle for the shabad tab) live INSIDE the card header. */}
        <View style={[styles.header, stackedTabs && styles.headerStacked]}>
          <View style={[styles.tabsGroup, stackedTabs && styles.tabsGroupStacked]}>
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
                  <CustomText
                    style={[styles.tabText, { color: active ? gold : mutedText }]}
                    numberOfLines={1}
                  >
                    {t.label.toUpperCase()}
                  </CustomText>
                </Pressable>
              );
            })}
          </View>

          {tab === "shabad" ? (
            <Pressable
              onPress={() => setShabadNonce((n) => n + 1)}
              disabled={shabadLoading}
              hitSlop={10}
              style={({ pressed }) => [
                styles.shuffleBtn,
                { backgroundColor: inactiveBg },
                pressed && styles.shuffleBtnPressed,
                shabadLoading && styles.shuffleBtnBusy,
              ]}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.SHUFFLE}
              accessibilityState={{ disabled: shabadLoading, busy: shabadLoading }}
            >
              <RefreshSpinner color={gold} size={14} spinning={shabadLoading} />
            </Pressable>
          ) : null}
        </View>

        {/* Both mounted; only the active one is shown (display) so each pre-fetches. */}
        <View style={tab === "vaak" ? styles.shown : styles.hidden}>
          <TodaysVaak embedded refreshKey={refreshKey} />
        </View>
        <View style={tab === "shabad" ? styles.shown : styles.hidden}>
          <RandomShabad
            embedded
            refreshKey={refreshKey}
            reloadNonce={shabadNonce}
            onLoadingChange={setShabadLoading}
          />
        </View>
      </DashboardCard>
    </View>
  );
};

ShabadVaak.propTypes = { refreshKey: PropTypes.number };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  backdropImage: { width: "100%", height: "100%" },
  card: { padding: 18 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tabsGroup: { flexDirection: "row", gap: 6, flexShrink: 1 },
  // One pill per row, each taking the full width of the card.
  tabsGroupStacked: { flexDirection: "column", alignSelf: "stretch", flexShrink: 0 },
  // The shuffle button moves to the top of the column rather than sitting
  // beside a two-storey stack.
  headerStacked: { alignItems: "flex-start" },
  // The group shrinking is not enough on its own: a child that cannot shrink
  // keeps its full width and simply overflows the shrunken parent, which is how
  // the shuffle button ended up painted ON TOP of "RANDOM SHABAD".
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, flexShrink: 1 },
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
    // Round, icon-only and already at the touch-target floor.
    flexShrink: 0,
  },
  // Dimmed while a shabad is in flight, so the control reads as busy rather
  // than broken when it stops responding to taps.
  shuffleBtnBusy: { opacity: 0.6 },
  // Instant acknowledgement on touch-down, before any async work starts.
  shuffleBtnPressed: { opacity: 0.5 },
  shown: { display: "flex" },
  hidden: { display: "none" },
});

export default ShabadVaak;
