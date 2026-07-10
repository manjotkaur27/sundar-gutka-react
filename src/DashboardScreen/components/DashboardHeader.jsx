import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PropTypes from "prop-types";
import { CustomText } from "@common";
import { getNanakshahiDate } from "../../services/dashboard";
import { LAST_PUSH_KEY } from "../useDashboardSync";
import useDashboardTheme from "./dashboardTheme";

// Display name is fixed until a real account/profile feature exists.
const DEFAULT_NAME = "User";

const MenuIcon = ({ color }) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <Line x1="3" y1="6" x2="21" y2="6" />
    <Line x1="3" y1="12" x2="21" y2="12" />
    <Line x1="3" y1="18" x2="21" y2="18" />
  </Svg>
);
MenuIcon.propTypes = { color: PropTypes.string.isRequired };

const DashboardHeader = ({ onMenuPress, refreshKey }) => {
  const { isDark, gold, primaryText, mutedText, theme } = useDashboardTheme();
  const { top: safeTop } = useSafeAreaInsets();
  // Explicit fontFamily (no fontWeight alongside it) — pairing a numeric
  // fontWeight with a custom TTF makes Android synthesize a fake bold and
  // silently fall back off the real glyph.
  const nameFont = theme.typography.fonts.balooPaajiSemiBold;

  // Username: brand blue in light mode, off-white in dark.
  const nameColor = isDark ? "#E8EEF7" : "#133a78";
  // Text below the name (date line) and the avatar's "U" initial each get their
  // own client-specified accents, distinct from the generic mutedText/nameColor.
  const belowNameColor = isDark ? "#6E84A9" : "#9AA8C4";
  const avatarTextColor = isDark ? "#5A99FD" : "#113979";

  const dateLine = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleString("default", { weekday: "long" });
    const dayMonth = now.toLocaleString("default", { day: "numeric", month: "long" });
    const nanak = getNanakshahiDate(now);
    return `${weekday} · ${dayMonth} · ${nanak.label}`;
  }, []);

  // Temporary, for testing the cloud sync push (see useDashboardSync.js). Reads
  // on every refreshKey change (screen focus) since pushNow() runs on blur/
  // background, so the value written during the *previous* visit only becomes
  // visible the next time this mounts/focuses.
  const [lastSyncedLabel, setLastSyncedLabel] = useState(null);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LAST_PUSH_KEY).then((raw) => {
      if (!active) return;
      if (!raw) {
        setLastSyncedLabel("never");
        return;
      }
      setLastSyncedLabel(new Date(Number(raw)).toLocaleString());
    });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const bg = isDark ? "#050D1B" : "#F4F7FC";

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8, backgroundColor: bg }]}>
      <CustomText style={[styles.salutation, { color: gold }]}>
        ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ ॥ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
      </CustomText>

      <View style={styles.row}>
        <View style={styles.nameBlock}>
          <CustomText
            style={[styles.name, { color: nameColor, fontFamily: nameFont }]}
            numberOfLines={1}
          >
            {DEFAULT_NAME}
          </CustomText>
          {/* Gregorian + Nanakshahi date line (greeting removed per design). */}
          <CustomText style={[styles.date, { color: belowNameColor }]} numberOfLines={1}>
            {dateLine}
          </CustomText>
          {/* Temporary testing readout — remove once cloud sync is verified. */}
          {lastSyncedLabel ? (
            <CustomText style={[styles.syncLine, { color: mutedText }]} numberOfLines={1}>
              {`Last synced: ${lastSyncedLabel}`}
            </CustomText>
          ) : null}
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={onMenuPress}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f4f9" },
            ]}
          >
            <MenuIcon color={primaryText} />
          </Pressable>
          <View
            style={[
              styles.avatar,
              { backgroundColor: isDark ? "rgba(37,129,223,0.25)" : "#dbe6fb" },
            ]}
          >
            <CustomText style={[styles.avatarText, { color: avatarTextColor }]}>
              {DEFAULT_NAME[0]}
            </CustomText>
          </View>
        </View>
      </View>
    </View>
  );
};

DashboardHeader.propTypes = {
  onMenuPress: PropTypes.func,
  refreshKey: PropTypes.number,
};

DashboardHeader.defaultProps = {
  onMenuPress: () => {},
  refreshKey: 0,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  salutation: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameBlock: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontSize: 23,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  syncLine: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    opacity: 0.7,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

export default DashboardHeader;
