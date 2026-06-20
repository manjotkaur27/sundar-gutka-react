import { constant, STRINGS } from "@common";
import Discover from "./Discover";
import ExploreGurbani from "./ExploreGurbani";
import MonthCalendar from "./MonthCalendar";
import RandomShabad from "./RandomShabad";
import RemindersCard from "./RemindersCard";
import StreakCard from "./StreakCard";
import TodaysNitnem from "./TodaysNitnem";
import TodaysVaak from "./TodaysVaak";
import WeekChart from "./WeekChart";
import YourPractice from "./YourPractice";

const S = constant.DASHBOARD_SECTIONS;

// Single source of truth for dashboard sections: maps a section key to its
// component and a human label (for the layout editor). Order of this map is the
// canonical default order, mirrored by DEFAULT_DASHBOARD_ORDER in reducer.js.
export const SECTION_REGISTRY = {
  [S.STREAK]: { Component: StreakCard, labelKey: "DAY_STREAK" },
  [S.NITNEM]: { Component: TodaysNitnem, labelKey: "TODAYS_NITNEM" },
  [S.EXPLORE]: { Component: ExploreGurbani, labelKey: null, label: "Explore Gurbani" },
  [S.PRACTICE]: { Component: YourPractice, labelKey: "YOUR_PRACTICE" },
  [S.CALENDAR]: { Component: MonthCalendar, labelKey: "ACTIVITY" },
  [S.WEEK_CHART]: { Component: WeekChart, labelKey: "THIS_WEEK" },
  [S.DISCOVER]: { Component: Discover, labelKey: "DISCOVER" },
  [S.REMINDERS]: { Component: RemindersCard, labelKey: "REMINDERS_TITLE" },
  [S.RANDOM_SHABAD]: { Component: RandomShabad, labelKey: "RANDOM_SHABAD" },
  [S.VAAK]: { Component: TodaysVaak, labelKey: "TODAYS_VAAK" },
};

export const sectionLabel = (key) => {
  const entry = SECTION_REGISTRY[key];
  if (!entry) return key;
  return entry.labelKey ? STRINGS[entry.labelKey] : entry.label ?? key;
};

export default SECTION_REGISTRY;
