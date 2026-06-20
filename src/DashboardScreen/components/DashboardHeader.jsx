import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { CustomText, STRINGS } from "@common";
import { getNanakshahiDate } from "../../services/dashboard";
import useDashboardTheme, { GOLD } from "./dashboardTheme";

const MenuIcon = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" stroke={color} strokeWidth="2" strokeLinecap="round">
    <Line x1="3" y1="6" x2="21" y2="6" />
    <Line x1="3" y1="12" x2="21" y2="12" />
    <Line x1="3" y1="18" x2="21" y2="18" />
  </Svg>
);
MenuIcon.propTypes = { color: PropTypes.string.isRequired };

const initialsOf = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
};

const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return "GREETING_MORNING";
  if (h < 17) return "GREETING_AFTERNOON";
  return "GREETING_EVENING";
};

const DashboardHeader = ({ onMenuPress, onAvatarPress, onEditName }) => {
  const { isDark, primaryText, mutedText } = useDashboardTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const profile = useSelector((state) => state.userProfile);
  const name = profile?.name ?? "";

  const dateLine = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleString("default", { weekday: "long" });
    const dayMonth = now.toLocaleString("default", { day: "numeric", month: "long" });
    const nanak = getNanakshahiDate(now);
    return `${weekday} · ${dayMonth} · ${nanak.label}`;
  }, []);

  const bg = isDark ? "#041126" : "#ffffff";
  const initials = initialsOf(name);

  return (
    <View style={[styles.container, { paddingTop: safeTop + 8, backgroundColor: bg }]}>
      <CustomText style={[styles.salutation, { color: GOLD }]}>
        ੴ ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ ॥ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
      </CustomText>

      <View style={styles.row}>
        <View style={styles.nameBlock}>
          <Pressable onPress={onEditName} hitSlop={6}>
            <CustomText style={[styles.name, { color: primaryText }]} numberOfLines={1}>
              {name || STRINGS.GREETING_MORNING}
            </CustomText>
          </Pressable>
          <CustomText style={[styles.date, { color: mutedText }]} numberOfLines={1}>
            {name ? dateLine : `${STRINGS[greetingKey()]} · ${dateLine}`}
          </CustomText>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={onMenuPress}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f4f9" }]}
          >
            <MenuIcon color={primaryText} />
          </Pressable>
          <Pressable
            onPress={onAvatarPress}
            hitSlop={8}
            style={[styles.avatar, { backgroundColor: isDark ? "rgba(37,129,223,0.25)" : "#dbe6fb" }]}
          >
            <CustomText style={[styles.avatarText, { color: isDark ? "#bcd4ff" : "#113979" }]}>
              {initials || "•"}
            </CustomText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

DashboardHeader.propTypes = {
  onMenuPress: PropTypes.func,
  onAvatarPress: PropTypes.func,
  onEditName: PropTypes.func,
};

DashboardHeader.defaultProps = {
  onMenuPress: () => {},
  onAvatarPress: () => {},
  onEditName: () => {},
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  salutation: {
    fontSize: 12,
    fontWeight: "500",
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
    fontWeight: "600",
  },
  date: {
    fontSize: 13,
    marginTop: 2,
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
