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

const DashboardHeader = ({ onMenuPress, onClosePress, refreshKey }) => {
  const { isDark, gold, primaryText, mutedText, theme } = useDashboardTheme();
  const { top: safeTop } = useSafeAreaInsets();
  // Explicit fontFamily (no fontWeight alongside it) — pairing a numeric
  // fontWeight with a custom TTF makes Android synthesize a fake bold and
  // silently fall back off the real glyph.
  const nameFont = theme.typography.fonts.balooPaajiSemiBold;

  // Username: brand blue in light mode, off-white in dark.
  const nameColor = isDark ? "#ffffffff" : "#00397e";
  // Text below the name (date line) and the avatar's "U" initial each get their
  // own client-specified accents, distinct from the generic mutedText/nameColor.
  const belowNameColor = isDark ? "#a1bee7ff" : "#9AA8C4";
  const avatarTextColor = isDark ? "#5A99FD" : "#113979";
  // Close button: white in dark mode, app brand blue in light — same blue as
  // the username text, independent of the golden salutation line it sits
  // next to.
  const closeIconColor = isDark ? "#FFFFFF" : "#00397e";

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

  const bg = isDark ? "#031329" : "#F4F7FC";

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8, backgroundColor: bg }]}>
      <View style={styles.topRow}>
        <CustomText
          style={[
            styles.salutation,
            { color: gold, fontFamily: theme.typography.fonts.gurbaniHeavy },
          ]}
          // Sharing the row with the close button (added later) leaves it less
          // width than when it had the row to itself — on a narrow phone this
          // could wrap unpredictably and shove the button around. Clamp to one
          // line; it's decorative, so an ellipsis on the smallest devices is a
          // safe fallback.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ ॥ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
        </CustomText>
        {/* Top-right dismiss, level with the golden salutation line rather
            than down in the avatar/menu row. */}
        <Pressable onPress={onClosePress} hitSlop={8} style={styles.closeBtn}>
          <CloseIcon size={20} color={closeIconColor} />
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.nameBlock}>
          <CustomText
            style={[
              styles.name,
              {
                color: nameColor,
                fontFamily: nameFont,
                // Faux-bold: BalooPaaji ships only Regular + SemiBold and a named
                // TTF ignores fontWeight, so thicken the strokes with a same-color
                // shadow. Replace with a real Bold Baloo face if one is bundled.
                textShadowColor: nameColor,
                textShadowOffset: { width: 0.5, height: 0 },
                textShadowRadius: 0.4,
              },
            ]}
            numberOfLines={1}
          >
            {STRINGS.USER}
          </CustomText>
          {/* Gregorian + Nanakshahi date line (greeting removed per design). */}
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

DashboardHeader.defaultProps = {
  onMenuPress: () => {},
  onClosePress: () => {},
  refreshKey: 0,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  salutation: {
    fontSize: 12,
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
  name: {
    fontSize: 23,
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
