import React from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { ListItem, Avatar } from "@rneui/themed";
import { STRINGS, actions, useThemedStyles, ListItemTitle, ThemedSwitch } from "@common";
import createStyles from "../styles";

const CollectStatistics = () => {
  const isStatistics = useSelector((state) => state.isStatistics);
  const styles = useThemedStyles(createStyles);
  const { COLLECT_STATISTICS } = STRINGS;
  const analyticsIcon = require("../../../images/analyticsicon.png");
  const dispatch = useDispatch();
  return (
    <ListItem bottomDivider containerStyle={styles.containerNightStyles}>
      <View style={styles.iconContainerStyle}>
        <Avatar source={analyticsIcon} avatarStyle={styles.avatarStyle} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={COLLECT_STATISTICS} style={styles.listItemTitle} />
      </ListItem.Content>
      <ThemedSwitch
        value={isStatistics}
        onValueChange={(value) => dispatch(actions.toggleStatistics(value))}
      />
    </ListItem>
  );
};
export default CollectStatistics;
