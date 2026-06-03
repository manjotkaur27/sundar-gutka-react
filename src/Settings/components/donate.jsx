import React from "react";
import { View } from "react-native";
import { ListItem, Icon } from "@rneui/themed";
import { STRINGS, useTheme, useThemedStyles, ListItemTitle, navigate, constant } from "@common";
import createStyles from "../styles";

const Donate = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { donate } = STRINGS;
  return (
    <ListItem
      bottomDivider
      containerStyle={styles.containerNightStyles}
      onPress={() => navigate("MainTabs", { screen: constant.SEVA })}
    >
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="volunteer-activism" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={donate} style={styles.listItemTitle} />
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );
};
export default Donate;
