import React, { useState, useRef, useCallback } from "react";
import { ScrollView, View, InteractionManager } from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeArea,
  StatusBarComponent,
  useTheme,
  useThemedStyles,
  logError,
  trackJourneyView,
} from "@common";
import { getOrCreateSummary } from "../database/analytics";
import { computeStreaks } from "../services/streakEngine";
import createStyles from "./styles";
import JourneyHeader from "./components/JourneyHeader";
import ActivityCalendar from "./components/ActivityCalendar";
import MostReadSection from "./components/MostReadSection";
import MostListenedSection from "./components/MostListenedSection";
import LifetimeStats from "./components/LifetimeStats";
import KhalisAppsCarousel from "./components/KhalisAppsCarousel";
import SlimCalendarStrip from "./components/SlimCalendarStrip";
import FeatureTilesRow from "./components/FeatureTilesRow";

const DashboardScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  useSelector((state) => state.language);

  const [streak, setStreak] = useState(0);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Tracks only the JourneyHeader height — SlimCalendarStrip is a separate floating view
  // so it cannot affect this value and cause a scroll feedback loop
  const [headerHeight, setHeaderHeight] = useState(0);

  const calendarLayoutRef = useRef({ y: 0, height: 280 });
  // Mirrors calendarCollapsed without triggering a re-render, used inside the scroll handler
  const collapseRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Defer SQLite work until after the navigation animation to avoid bridge contention
      // with the Reader's saveSession writes that fire simultaneously on blur.
      const task = InteractionManager.runAfterInteractions(async () => {
        try {
          await computeStreaks();
          const summary = await getOrCreateSummary();
          if (active && summary) {
            setStreak(summary.current_streak ?? 0);
            trackJourneyView(summary.current_streak ?? 0, summary.total_days_active ?? 0).catch(
              () => {},
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
    }, []),
  );

  const handleScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    const { y: calY, height: calH } = calendarLayoutRef.current;

    // Hysteresis: collapse at 20% into the calendar; re-expand 60px earlier to prevent flicker.
    const collapseAt = calY + calH * 0.2;
    const expandAt = calY + calH * 0.2 - 60;

    if (!collapseRef.current && y > collapseAt) {
      collapseRef.current = true;
      setCalendarCollapsed(true);
    } else if (collapseRef.current && y < expandAt) {
      collapseRef.current = false;
      setCalendarCollapsed(false);
    }
  }, []);

  const onCalendarLayout = useCallback((e) => {
    calendarLayoutRef.current = {
      y: e.nativeEvent.layout.y,
      height: e.nativeEvent.layout.height,
    };
  }, []);

  // Only the JourneyHeader — strip is separate so paddingTop never changes on strip toggle
  const onJourneyHeaderLayout = useCallback((e) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  const bg = theme.mode === "dark" ? theme.colors.inactiveView : "#ffffff";

  return (
    <SafeArea backgroundColor={bg} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor="transparent" />

      {/* Scrollable content — sits beneath the floating glass header */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          headerHeight > 0 && { paddingTop: headerHeight },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <View onLayout={onCalendarLayout}>
          <ActivityCalendar refreshKey={refreshKey} />
        </View>

        <View style={styles.divider} />

        <FeatureTilesRow />

        <View style={styles.divider} />

        <MostReadSection refreshKey={refreshKey} />

        <View style={styles.divider} />

        <MostListenedSection refreshKey={refreshKey} />

        <View style={styles.divider} />

        <LifetimeStats refreshKey={refreshKey} />

        <View style={styles.divider} />

        <KhalisAppsCarousel />
      </ScrollView>

      {/* Floating glass header — absolutely overlaid so scroll content blurs behind it.
          Contains ONLY JourneyHeader; strip is a separate view so its
          appearance/disappearance cannot affect headerHeight and trigger a scroll loop. */}
      <View style={styles.floatingHeader} onLayout={onJourneyHeaderLayout}>
        <JourneyHeader streak={streak} />
      </View>

      {/* Slim calendar strip — always mounted so there's no reconciliation cost on
          scroll threshold crossings. Visibility is toggled via opacity + pointerEvents
          so it never shifts layout (the view is position:absolute already). */}
      <View
        style={[styles.floatingStrip, { top: headerHeight, opacity: calendarCollapsed ? 1 : 0 }]}
        pointerEvents={calendarCollapsed ? "auto" : "none"}
      >
        <SlimCalendarStrip refreshKey={refreshKey} />
      </View>
    </SafeArea>
  );
};

export default DashboardScreen;
