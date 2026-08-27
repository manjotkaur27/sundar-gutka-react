import { setReminderBanis } from "@common/actions";
import { scheduleReminders, constant, trackReminderEvent, STRINGS } from "@common";

/**
 * The reminder the edit sheet should show, read from the store as it is NOW.
 *
 * The sheet used to be handed the row object captured at tap time. Saving a
 * new title or time updated the store, but the sheet kept the snapshot — so
 * reopening "Notification Text" from the same sheet showed the OLD title, and
 * a second edit started from it. That is what "the text sometimes did not
 * save" was: it had saved, and the sheet was looking at a stale copy.
 *
 * `parsed` is the persisted list (source of truth for title/time/enabled),
 * `rows` the display list with the bani's translit/gurmukhi/label resolved.
 * Returns null once the reminder no longer exists, which closes the sheet.
 */
// Every language's stock title begins with its own "Time for". A title that
// starts with none of them was typed by the user.
const STOCK_TITLE_LANGUAGES = ["en-US", "hi", "pa", "fr", "it", "es"];
const stockTitlePrefixes = () =>
  STOCK_TITLE_LANGUAGES.map((lang) =>
    typeof STRINGS.getString === "function"
      ? STRINGS.getString("time_for", lang) || STRINGS.time_for
      : STRINGS.time_for
  ).filter(Boolean);

/**
 * Whether a reminder's notification title is the user's own words.
 *
 * A rename sets `titleCustom`, but titles renamed before that flag existed have
 * no flag — so the text itself is the fallback: the stock title is
 * "<Time for> <bani>" in whichever language it was created in, and a title
 * that opens with none of those six prefixes was typed. Prefix only, so a
 * later language or transliteration switch cannot make an untouched title
 * look customised.
 */
export const isCustomTitle = (section) => {
  if (!section || !section.title) return false;
  if (section.titleCustom) return true;
  const title = String(section.title);
  return !stockTitlePrefixes().some((prefix) => title.startsWith(`${prefix} `));
};

export const liveSection = (parsed, rows, editing) => {
  if (!editing) return null;
  const stored = (parsed || []).find((item) => item.key === editing.key);
  if (!stored) return null;
  const row = (rows || []).find((item) => item.key === editing.key);
  return { ...editing, ...row, ...stored };
};

const setDefaultReminders = async (baniListData, dispatch, isReminders, reminderSound) => {
  const baniList = baniListData;

  const defaultReminders = () => {
    const defaultIndexes = [0, 1, 19, 21];
    const defaultTimings = ["3:00 AM", "3:30 AM", "6:00 PM", "10:00 PM"];
    return defaultIndexes.map((index, idx) => {
      const bani = baniList[index];
      return {
        key: bani.id,
        id: bani.id,
        gurmukhi: bani.gurmukhi,
        translit: bani.translit,
        enabled: true,
        title: `${STRINGS.time_for} ${bani.translit}`,
        time: defaultTimings[idx],
      };
    });
  };
  const data = defaultReminders();

  dispatch(setReminderBanis(JSON.stringify(data)));

  await scheduleReminders(isReminders, reminderSound, JSON.stringify(data));
  trackReminderEvent(constant.RESET_REMINDER, true);
};

export default setDefaultReminders;
