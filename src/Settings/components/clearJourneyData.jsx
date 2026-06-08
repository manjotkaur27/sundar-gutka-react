import React, { useState } from "react";
import { Alert, View } from "react-native";
import { ListItem, Icon } from "@rneui/themed";
import { STRINGS, logError, showSuccessToast, useThemedStyles } from "@common";
import useTheme from "@common/context";
import { clearAllAnalyticsData } from "../../database/analytics";
import createStyles from "../styles";

const ClearJourneyData = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isClearing, setIsClearing] = useState(false);

  const handlePress = () => {
    Alert.alert(
      STRINGS.CLEAR_JOURNEY_DATA,
      STRINGS.CLEAR_JOURNEY_CONFIRM,
      [
        { text: STRINGS.cancel, style: "cancel" },
        {
          text: STRINGS.delete,
          style: "destructive",
          onPress: async () => {
            if (isClearing) return;
            setIsClearing(true);
            try {
              await clearAllAnalyticsData();
              showSuccessToast(STRINGS.CLEAR_JOURNEY_SUCCESS);
            } catch (err) {
              logError(new Error(`clearAllAnalyticsData failed: ${err?.message || err}`));
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ListItem bottomDivider containerStyle={styles.containerNightStyles} onPress={handlePress}>
      <View style={styles.iconContainerStyle}>
        <Icon name="delete-sweep" size={26} color={theme.colors.primaryText} />
      </View>
      <ListItem.Content>
        <ListItem.Title style={[styles.listItemTitle, { color: theme.colors.primaryText }]}>
          {isClearing ? "Clearing…" : STRINGS.CLEAR_JOURNEY_DATA}
        </ListItem.Title>
      </ListItem.Content>
    </ListItem>
  );
};

export default ClearJourneyData;
