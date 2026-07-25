import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS } from "@common";
import { gurmukhiToDevanagari } from "@common/gurmukhiToDevanagari";
import { getWordOfDay, getNextEvent } from "../../services/dashboard";
import DashboardCard from "./DashboardCard";
import useDashboardTheme from "./dashboardTheme";
import SectionError from "./SectionError";
import SectionLabel from "./SectionLabel";
import SkeletonBlock from "./SkeletonBlock";
import useAsyncSection from "./useAsyncSection";

const Discover = ({ refreshKey }) => {
  const { isDark, accentBlue, gold, primaryText, mutedText, theme } = useDashboardTheme();
  // Thick (bolder) Gurbani weight so the featured word carries the same visual
  // prominence a fontWeight override would have given a Latin font — already
  // the boldest Gurbani variant registered, so no further bolding is applied.
  const gurbaniFont = theme.typography.fonts.gurbaniThick;
  // Client-specified accents — main card texts / secondary card texts, light
  // mode only; dark keeps the existing primaryText/mutedText pairing. The
  // upcoming "days away" number instead gets its own dark-mode value.
  // Hero values (featured word + days-away count) match the "This week" / month
  // title color exactly.
  const cardMainColor = isDark ? primaryText : "#113879";
  const cardSecondaryColor = isDark ? mutedText : "#97A5C2";
  const upcomingNumColor = isDark ? "#ffffffff" : "#113879";
  const [word, setWord] = useState(null);
  const [event, setEvent] = useState(null);

  // Show the featured word in the READER's own script, not always Gurmukhi:
  //   Punjabi → ਸੰਤ (Gurmukhi, as sourced) · Hindi → संत (converted to
  //   Devanagari) · English + other Latin locales → "Sant" (roman). The word
  //   itself comes from the live hukamnama/BaniDB word-of-day (Gurmukhi +
  //   roman); Devanagari is derived on the fly since the feed has no Hindi form.
  const lang = STRINGS.getLanguage();
  let displayWord = "—";
  if (word) {
    if (lang === "pa") displayWord = word.gurmukhi;
    else if (lang === "hi") displayWord = gurmukhiToDevanagari(word.gurmukhi);
    else displayWord = word.transliteration || word.gurmukhi;
  }
  // Gurbani font only renders Gurmukhi; Devanagari/Latin use the app font
  // (Devanagari falls back to the system script font for those glyphs).
  const wordFont = lang === "pa" ? gurbaniFont : theme.typography.fonts.balooPaajiSemiBold;

  // Each tile fetches (and can fail/retry) independently, so a broken
  // upcoming-event lookup never takes the word-of-day tile down with it.
  const wordTask = useCallback(
    () => getWordOfDay().then(setWord),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );
  const wordSection = useAsyncSection(wordTask);

  // Cold-start only, deliberately NOT keyed on refreshKey — the upcoming-events
  // list changes at most daily (and has its own day-scoped cache besides), so
  // refetching on every Dashboard focus is unnecessary. Only refires if this
  // component actually unmounts and remounts (a real app cold start), not on
  // every tab switch back to Dashboard.
  const eventTask = useCallback(() => getNextEvent().then(setEvent), []);
  const eventSection = useAsyncSection(eventTask);

  return (
    <View>
      <SectionLabel title={STRINGS.DISCOVER} />
      <View style={styles.row}>
        {/* Word of the Day */}
        <DashboardCard style={styles.card}>
          <CustomText style={[styles.cardTag, { color: gold }]}>
            {STRINGS.WORD_OF_DAY.toUpperCase()}
          </CustomText>
          {wordSection.loading ? (
            <View style={styles.skeletonInner}>
              <SkeletonBlock style={styles.lineSkeletonWide} />
              <SkeletonBlock style={styles.lineSkeletonNarrow} />
              <SkeletonBlock style={styles.lineSkeletonBlock} />
            </View>
          ) : null}
          {!wordSection.loading && wordSection.error ? (
            <SectionError compact onRetry={wordSection.retry} />
          ) : null}
          {!wordSection.loading && !wordSection.error ? (
            <>
              <CustomText
                style={[
                  styles.word,
                  {
                    color: cardMainColor,
                    fontFamily: wordFont,
                    // Faux-bold to match the streak count / practice numbers.
                    textShadowColor: cardMainColor,
                    textShadowOffset: { width: 0.5, height: 0 },
                    textShadowRadius: 0.4,
                  },
                ]}
                numberOfLines={1}
              >
                {displayWord}
              </CustomText>
              <CustomText style={[styles.translit, { color: cardSecondaryColor }]} numberOfLines={1}>
                {/* Roman helper line — redundant when the main word already IS
                    the roman form (English/other Latin locales), so show it
                    only under the Gurmukhi/Devanagari scripts. */}
                {lang === "pa" || lang === "hi" ? word?.transliteration ?? "" : ""}
              </CustomText>
              <CustomText style={[styles.meaning, { color: cardSecondaryColor }]} numberOfLines={4}>
                {word?.meaning ?? ""}
              </CustomText>
            </>
          ) : null}
        </DashboardCard>

        {/* Upcoming event */}
        <DashboardCard style={styles.card}>
          <CustomText style={[styles.cardTag, { color: accentBlue }]}>
            {STRINGS.UPCOMING.toUpperCase()}
          </CustomText>
          {eventSection.loading ? (
            <View style={styles.skeletonInner}>
              <SkeletonBlock style={styles.lineSkeletonWide} />
              <SkeletonBlock style={styles.lineSkeletonNarrow} />
              <SkeletonBlock style={styles.lineSkeletonBlock} />
            </View>
          ) : null}
          {!eventSection.loading && eventSection.error ? (
            <SectionError compact onRetry={eventSection.retry} />
          ) : null}
          {!eventSection.loading && !eventSection.error ? (
            <>
              <CustomText
                style={[
                  styles.bigNum,
                  {
                    color: upcomingNumColor,
                    fontFamily: theme.typography.fonts.balooPaajiSemiBold,
                    // Faux-bold to match the streak count / practice numbers.
                    textShadowColor: upcomingNumColor,
                    textShadowOffset: { width: 0.5, height: 0 },
                    textShadowRadius: 0.4,
                  },
                ]}
              >
                {event ? event.daysAway : "—"}
              </CustomText>
              <CustomText style={[styles.translit, { color: cardSecondaryColor }]}>
                {event ? STRINGS.DAYS_AWAY : ""}
              </CustomText>
              <CustomText
                style={[styles.eventName, { color: cardMainColor }]}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {event?.name ?? ""}
              </CustomText>
              {event?.subtitle ? (
                <CustomText style={[styles.meaning, { color: cardSecondaryColor }]} numberOfLines={1}>
                  {event.subtitle}
                </CustomText>
              ) : null}
            </>
          ) : null}
        </DashboardCard>
      </View>
    </View>
  );
};

Discover.propTypes = { refreshKey: PropTypes.number };
Discover.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, paddingHorizontal: 20 },
  // No fixed aspectRatio — a long shabad's translation needs to grow the card
  // instead of being clipped by a locked square height.
  card: { flex: 1, padding: 16 },
  cardTag: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 6 },
  word: { fontSize: 20, lineHeight: 26 },
  bigNum: { fontSize: 20, lineHeight: 24 },
  translit: { fontSize: 12, marginTop: 2 },
  meaning: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  eventName: { fontSize: 12, fontWeight: "600", marginTop: 5, lineHeight: 15 },
  skeletonInner: { gap: 8, marginTop: 4 },
  lineSkeletonWide: { width: "70%", height: 20 },
  lineSkeletonNarrow: { width: "50%", height: 14 },
  lineSkeletonBlock: { width: "100%", height: 30 },
});

export default Discover;
