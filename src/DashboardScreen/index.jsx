import React, { useState, useCallback } from "react";
import { ScrollView, View, StyleSheet, InteractionManager } from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { SafeArea, StatusBarComponent, useTheme, logError, trackJourneyView } from "@common";
import { getOrCreateSummary } from "../database/analytics";
import { computeStreaks } from "../services/streakEngine";
import DashboardHeader from "./components/DashboardHeader";
import LayoutEditOverlay from "./components/LayoutEditOverlay";
import { SECTION_REGISTRY } from "./components/sectionRegistry";
import useDashboardSync from "./useDashboardSync";

// Registry-driven dashboard. Sections render in the user's persisted order and
// visibility (see dashboardLayout slice). Add a new section by registering it in
// sectionRegistry.js + reducer.js DEFAULT_DASHBOARD_ORDER.
const DashboardScreen = () => {
  const { theme } = useTheme();
  useSelector((state) => state.language);
  const layout = useSelector((state) => state.dashboardLayout);

  const [refreshKey, setRefreshKey] = useState(0);
  const [layoutEditVisible, setLayoutEditVisible] = useState(false);

  // Cross-device sync (dormant until SSO/JWT exists — see useDashboardSync).
  useDashboardSync();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Defer SQLite work until after the navigation animation to avoid bridge
      // contention with the Reader's saveSession writes that fire on blur.
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          await computeStreaks();
          const summary = await getOrCreateSummary();
          if (active && summary) {
            trackJourneyView(summary.current_streak ?? 0, summary.total_days_active ?? 0).catch(
              () => {}
            );
          }
        } catch (err) {
          logError(err);
        }
        if (active) setRefreshKey((k) => k + 1);
      });
      return () => {
        active = false;
        task.cancel();
      };
    }, [])
  );

  const bg = theme.mode === "dark" ? theme.colors.inactiveView : "#ffffff";
  const visibleSections = layout.order.filter(
    (key) => !layout.hidden.includes(key) && SECTION_REGISTRY[key]
  );

  return (
    <SafeArea backgroundColor={bg} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor="transparent" />

      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader onMenuPress={() => setLayoutEditVisible(true)} />

        {visibleSections.map((key) => {
          const { Component } = SECTION_REGISTRY[key];
          return (
            <View key={key} style={styles.section}>
              <Component refreshKey={refreshKey} />
            </View>
          );
        })}
      </ScrollView>

      <LayoutEditOverlay visible={layoutEditVisible} onClose={() => setLayoutEditVisible(false)} />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
  },
});

export default DashboardScreen;
