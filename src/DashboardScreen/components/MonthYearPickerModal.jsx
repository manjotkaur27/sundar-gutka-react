import React, { useEffect, useState } from "react";
import { View, Modal, StyleSheet, Pressable, Animated } from "react-native";
import PropTypes from "prop-types";
import useSheetPresentation from "@common/components/ui/useSheetPresentation";
import { monthShort } from "@common/dateLocale";
import { ChevronLeftIcon, ChevronRight, CloseIcon } from "@common/icons";
import { CustomText } from "@common";
import useDashboardTheme from "./dashboardTheme";

// Localised short month labels (Jan…Dec in the app language), built at render
// time so a language switch is reflected immediately.
const monthLabels = () => Array.from({ length: 12 }, (_, i) => monthShort(i));

const getToday = () => {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() + 1 };
};

// react-native-modal-datetime-picker has no working dark-mode hook on Android
// (isDarkModeEnabled/accentColor/textColor are IOS-only in the underlying
// @react-native-community/datetimepicker — confirmed by grepping its native
// Android sources, which contain no theme concept at all). The native
// Android dialog always renders in the OS's day/night style, independent of
// this app's own in-app theme toggle — so it could never actually "match the
// app's theme" the way every other themed piece of the dashboard does. This
// is a fully custom, themed replacement: a plain dim (no blur) behind a
// sheet that slides up/down under its own Animated control, matching the
// hand-rolled slide DayDetailModal-style sheets elsewhere in the dashboard.
const MonthYearPickerModal = ({ visible, year, month, onSelect, onClose }) => {
  const { cardBg, accentBlue, primaryText, mutedText, separator, c, layout } = useDashboardTheme();
  const today = getToday();

  // Defaults to today's year every time the picker opens — same "show
  // today's date by default" behavior the native picker had, independent of
  // whichever month the calendar happens to be showing underneath.
  const [viewYear, setViewYear] = useState(today.year);

  // The entrance comes from the shared hook, so this picker, the Dashboard's
  // other sheets and the Settings sheets all open the same way. It used to
  // hand-roll its own Animated.parallel with its own durations — a third
  // implementation of the same thing.
  const { mounted, translateY } = useSheetPresentation(visible);

  // The picker always opens on today's year, whichever month the calendar
  // behind it happens to be showing.
  useEffect(() => {
    if (visible) setViewYear(today.year);
  }, [visible]);

  if (!mounted) return null;

  // Every month and year is reachable. A month with no data reads as an empty
  // calendar, which tells the user more than an arrow that refuses to move.
  const chipBg = c.surfaceSelected;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Instant, like every other scrim in the app. */}
        <View
          style={[styles.dim, { backgroundColor: c.scrim }]}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onClose}
        />
        <Animated.View
          style={[styles.sheet, { backgroundColor: cardBg, transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: separator }]} />

          <View style={styles.header}>
            <Pressable
              onPress={() => setViewYear((y) => y - 1)}
              hitSlop={8}
              style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            >
              <ChevronLeftIcon size={18} color={primaryText} />
            </Pressable>
            <CustomText style={[styles.yearText, { color: primaryText }]}>{viewYear}</CustomText>
            <Pressable
              onPress={() => setViewYear((y) => y + 1)}
              hitSlop={8}
              style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            >
              <ChevronRight size={18} color={primaryText} />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <CloseIcon size={layout.header.closeIconSize} color={mutedText} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {monthLabels().map((label, i) => {
              const m = i + 1;
              const isSelected = viewYear === year && m === month;
              const isToday = viewYear === today.year && m === today.month;
              return (
                <Pressable
                  key={label}
                  onPress={() => onSelect(viewYear, m)}
                  style={({ pressed }) => [
                    styles.cell,
                    // Every cell keeps the same chip shape/size so the grid
                    // reads as one consistent grid regardless of state —
                    // only the fill/border changes.
                    { backgroundColor: chipBg },
                    isSelected && { backgroundColor: accentBlue },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: accentBlue },
                    pressed && styles.cellPressed,
                  ]}
                >
                  <CustomText
                    style={[styles.cellText, { color: isSelected ? c.onAccent : primaryText }]}
                  >
                    {label}
                  </CustomText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

MonthYearPickerModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    // Set at render from c.scrim — dark mode needs a heavier one.
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  navBtn: { padding: 4 },
  // Nothing in this sheet is ever disabled, so the only state to express is the
  // touch. Matches the month arrows in MonthCalendar.
  navBtnPressed: { opacity: 0.45 },
  yearText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  closeBtn: { padding: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "22%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
  },
  cellPressed: {
    opacity: 0.6,
  },
  cellText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default MonthYearPickerModal;
