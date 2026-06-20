import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS, logError } from "@common";
import { getWordOfDay, getNextEvent } from "../../services/dashboard";
import SectionLabel from "./SectionLabel";
import useDashboardTheme, { GOLD } from "./dashboardTheme";

const Discover = ({ refreshKey }) => {
  const { card, accentBlue, primaryText, mutedText } = useDashboardTheme();
  const [word, setWord] = useState(null);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    let active = true;
    getWordOfDay().then((w) => active && setWord(w)).catch(logError);
    getNextEvent().then((e) => active && setEvent(e)).catch(logError);
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <View>
      <SectionLabel title={STRINGS.DISCOVER} />
      <View style={styles.row}>
        {/* Word of the Day */}
        <View style={[card, styles.card]}>
          <CustomText style={[styles.cardTag, { color: GOLD }]}>
            {STRINGS.WORD_OF_DAY.toUpperCase()}
          </CustomText>
          <CustomText style={[styles.word, { color: primaryText }]} numberOfLines={1}>
            {word?.gurmukhi ?? "—"}
          </CustomText>
          <CustomText style={[styles.translit, { color: mutedText }]} numberOfLines={1}>
            {word?.transliteration ?? ""}
          </CustomText>
          <CustomText style={[styles.meaning, { color: mutedText }]} numberOfLines={2}>
            {word?.meaning ?? ""}
          </CustomText>
        </View>

        {/* Upcoming event */}
        <View style={[card, styles.card]}>
          <CustomText style={[styles.cardTag, { color: accentBlue }]}>
            {STRINGS.UPCOMING.toUpperCase()}
          </CustomText>
          <CustomText style={[styles.bigNum, { color: primaryText }]}>
            {event ? event.daysAway : "—"}
          </CustomText>
          <CustomText style={[styles.translit, { color: mutedText }]}>
            {event ? STRINGS.DAYS_AWAY : ""}
          </CustomText>
          <CustomText style={[styles.eventName, { color: primaryText }]} numberOfLines={1}>
            {event?.name ?? ""}
          </CustomText>
          <CustomText style={[styles.meaning, { color: mutedText }]} numberOfLines={1}>
            {event?.subtitle ?? ""}
          </CustomText>
        </View>
      </View>
    </View>
  );
};

Discover.propTypes = { refreshKey: PropTypes.number };
Discover.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, paddingHorizontal: 20 },
  card: { flex: 1, padding: 16, aspectRatio: 1, overflow: "hidden" },
  cardTag: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginBottom: 6 },
  word: { fontSize: 22, fontWeight: "600", lineHeight: 28 },
  bigNum: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  translit: { fontSize: 12, marginTop: 2 },
  meaning: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  eventName: { fontSize: 13, fontWeight: "600", marginTop: 6 },
});

export default Discover;
