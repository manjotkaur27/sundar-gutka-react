import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { CustomText, STRINGS, logError } from "@common";
import { getDailyVaak } from "../../services/dashboard";
import { OfflineError } from "../../services/dashboard/connectivity";
import OfflineNotice from "./OfflineNotice";
import useDashboardTheme, { GOLD } from "./dashboardTheme";

const TodaysVaak = ({ refreshKey }) => {
  const { card, primaryText, mutedText } = useDashboardTheme();
  const [vaak, setVaak] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    // The vaak is the real daily Hukamnama — require connectivity so we never
    // present stale/placeholder lines as if they were today's official vaak.
    getDailyVaak({ requireOnline: true })
      .then((v) => {
        if (!active) return;
        setOffline(false);
        setVaak(v);
      })
      .catch((err) => {
        if (!active) return;
        // Offline OR API failure → show the notice; never fabricate a hukamnama.
        if (!(err instanceof OfflineError)) logError(err);
        setOffline(true);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (offline) return <OfflineNotice compact message={STRINGS.VAAK_OFFLINE} />;

  return (
    <View style={styles.wrap}>
      <View style={[card, styles.card]}>
        <CustomText style={[styles.cardTitle, { color: GOLD }]}>{STRINGS.TODAYS_VAAK.toUpperCase()}</CustomText>
        {(vaak?.lines ?? []).map((line, i) => (
          <CustomText key={i} style={[styles.gurmukhi, { color: primaryText }]}>{line}</CustomText>
        ))}
        {vaak?.translation ? (
          <CustomText style={[styles.translation, { color: mutedText }]}>{vaak.translation}</CustomText>
        ) : null}
      </View>
    </View>
  );
};

TodaysVaak.propTypes = { refreshKey: PropTypes.number };
TodaysVaak.defaultProps = { refreshKey: 0 };

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20 },
  card: { padding: 22 },
  cardTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 1.2, textAlign: "center", marginBottom: 14 },
  gurmukhi: { fontSize: 19, fontWeight: "500", textAlign: "center", marginBottom: 6, lineHeight: 31, paddingHorizontal: 4 },
  translation: { fontSize: 13, textAlign: "center", marginTop: 10, lineHeight: 19, paddingHorizontal: 4 },
});

export default TodaysVaak;
