import { constant, STRINGS } from "@common";
import Discover from "./Discover";
import ExploreGurbani from "./ExploreGurbani";
import MonthCalendar from "./MonthCalendar";
import RemindersCard from "./RemindersCard";
import ShabadVaak from "./ShabadVaak";
import StreakCard from "./StreakCard";
import TodaysNitnem from "./TodaysNitnem";
import WeekChart from "./WeekChart";
import YourPractice from "./YourPractice";

const S = constant.DASHBOARD_SECTIONS;

// Single source of truth for dashboard sections: maps a section key to its
// component and a human label (for the layout editor). Order of this map is the
// canonical default order, mirrored by DEFAULT_DASHBOARD_ORDER in reducer.js.
export const SECTION_REGISTRY = {
  // Explicit label (not STRINGS.DAY_STREAK, which is lowercase "day streak" for
  // the StreakCard's "12 day streak" line) so the layout editor reads "Day Streak".
  [S.STREAK]: { Component: StreakCard, labelKey: null, label: "Day Streak" },
  [S.NITNEM]: { Component: TodaysNitnem, labelKey: "TODAYS_NITNEM" },
  [S.EXPLORE]: { Component: ExploreGurbani, labelKey: null, label: "Explore Gurbani" },
  [S.PRACTICE]: { Component: YourPractice, labelKey: "YOUR_PRACTICE" },
  [S.CALENDAR]: { Component: MonthCalendar, labelKey: "ACTIVITY" },
  [S.WEEK_CHART]: { Component: WeekChart, labelKey: "THIS_WEEK" },
  [S.DISCOVER]: { Component: Discover, labelKey: "DISCOVER" },
  [S.REMINDERS]: { Component: RemindersCard, labelKey: "REMINDERS_TITLE" },
  [S.SHABAD_VAAK]: { Component: ShabadVaak, labelKey: null, label: "Shabad & Vaak" },
};

export const sectionLabel = (key) => {
  const entry = SECTION_REGISTRY[key];
  if (!entry) return key;
  return entry.labelKey ? STRINGS[entry.labelKey] : entry.label ?? key;
};

export default SECTION_REGISTRY;
