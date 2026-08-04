import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatWeekdayLong, formatDayMonth, formatDateTime } from "@common/dateLocale";
import Svg, { Line } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PropTypes from "prop-types";
import { CloseIcon, PersonIcon } from "@common/icons";
import { CustomText, STRINGS } from "@common";
import { getNanakshahiDate } from "../../services/dashboard";
import { LAST_PUSH_KEY } from "../useDashboardSync";
import useDashboardTheme from "./dashboardTheme";

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

// The Fateh, broken at its own halfway point rather than wherever the line
// happens to run out. Left to wrap on its own, the closing ॥ was landing alone
// on the second line; the two halves are also how it is conventionally written.
// The no-break space binds each ॥ to the word before it, so the mark can never
// be orphaned even if a half has to wrap on a very narrow screen.
const FATEH = "ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ ॥\nਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥";

const DashboardHeader = ({ onMenuPress = () => {}, onClosePress = () => {}, refreshKey = 0 }) => {
  const { gold, primaryText, mutedText, theme, c, layout } = useDashboardTheme();
  const { top: safeTop } = useSafeAreaInsets();

  // Date line under the Fateh — a brand tint, quieter than the Fateh itself.
  const belowNameColor = c.textSecondary;
  // The one Dashboard blue, not a second brand pair.
  const avatarTextColor = c.textBrand;
  // The one header foreground — brand navy in light, white in dark, independent
  // of the golden Fateh it sits next to. Matches the Seva header's cross.
  const closeIconColor = c.headerFg;

  const dateLine = useMemo(() => {
    const now = new Date();
    const weekday = formatWeekdayLong(now);
    const dayMonth = formatDayMonth(now);
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
        setLastSyncedLabel(STRINGS.NEVER);
        return;
      }
      setLastSyncedLabel(formatDateTime(new Date(Number(raw))));
    });
    return () => {
      active = false;
    };
    // STRINGS.getLanguage() in deps so "never" / the formatted timestamp
    // re-localise when the user switches language.
  }, [refreshKey, STRINGS.getLanguage()]);

  const bg = c.backgroundAlt;

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8, backgroundColor: bg }]}>
      <View style={styles.topRow}>
        <CustomText
          style={[
            styles.salutation,
            { color: gold, fontFamily: theme.typography.fonts.gurbaniHeavy },
          ]}
          // Two lines, and never shrunk: adjustsFontSizeToFit would render the
          // Fateh at a different size on every screen width.
          numberOfLines={2}
        >
          {FATEH}
        </CustomText>
        {/* Top-right dismiss, level with the golden salutation line rather
            than down in the avatar/menu row. */}
        <Pressable
          onPress={onClosePress}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.CLOSE}
        >
          <CloseIcon size={layout.header.closeIconSize} color={closeIconColor} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.nameBlock}>
          {/* No account system exists, so there is no name to greet. The Fateh
              above stands in its place as the header's title. */}
          {/* Gregorian + Nanakshahi date line. */}
          <CustomText style={[styles.date, { color: belowNameColor }]} numberOfLines={1}>
            {dateLine}
          </CustomText>
          {/* Temporary testing readout — remove once cloud sync is verified. */}
          {lastSyncedLabel ? (
            <CustomText style={[styles.syncLine, { color: mutedText }]} numberOfLines={1}>
              {`${STRINGS.LAST_SYNCED}: ${lastSyncedLabel}`}
            </CustomText>
          ) : null}
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={onMenuPress}
            hitSlop={8}
            style={[
              styles.iconBtn,
              { backgroundColor: c.fillSubtle },
            ]}
          >
            <MenuIcon color={primaryText} />
          </Pressable>
          <View
            style={[
              styles.avatar,
              { backgroundColor: c.accentSubtle },
            ]}
          >
            {/* Generic account glyph — there is no login/account system yet
                (see DEFAULT_NAME above), so this is a cosmetic placeholder
                only, matching the non-interactive avatar it replaces. */}
            <PersonIcon size={22} color={avatarTextColor} />
          </View>
        </View>
      </View>
    </View>
  );
};

DashboardHeader.propTypes = {
  onMenuPress: PropTypes.func,
  onClosePress: PropTypes.func,
  refreshKey: PropTypes.number,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    // Top-aligned so the dismiss button stays level with the Fateh's first
    // line instead of drifting down when it wraps to two.
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  salutation: {
    fontSize: 19,
    lineHeight: 28,
    flex: 1,
    paddingRight: 8,
  },
  closeBtn: {
    padding: 2,
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
  date: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 650,
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
});

export default DashboardHeader;
