import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { CustomText, useTheme } from "@common";

const PLACEHOLDER_TILES = [
  { id: "1", icon: "✨", label: "Coming Soon" },
  { id: "2", icon: "📊", label: "Coming Soon" },
  { id: "3", icon: "🎯", label: "Coming Soon" },
];

const FeatureTilesRow = () => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const cardBg = isDark ? theme.colors.inactiveView : "#ffffff";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const accentBlue = isDark ? theme.colors.enabledText : theme.colors.primary;

  return (
    <View style={styles.wrapper}>
      <CustomText style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>
        Insights
      </CustomText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PLACEHOLDER_TILES.map((tile) => (
          <View
            key={tile.id}
            style={[styles.tile, { backgroundColor: cardBg, borderColor }]}
          >
            <CustomText style={styles.tileIcon}>{tile.icon}</CustomText>
            <CustomText style={[styles.tileName, { color: accentBlue }]}>
              {tile.label}
            </CustomText>
            <CustomText style={[styles.tileDesc, { color: theme.colors.textDisabled }]}>
              Feature will be added soon
            </CustomText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  row: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tile: {
    width: 150,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  tileIcon: {
    fontSize: 28,
  },
  tileName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tileDesc: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
});

export default FeatureTilesRow;
