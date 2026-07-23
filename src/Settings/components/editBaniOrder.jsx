import React from "react";
import { View, Linking } from "react-native";
import { ListItem, Icon } from "@rneui/themed";
import { STRINGS, useTheme, useThemedStyles, ListItemTitle } from "@common";
import { buildQgivUrl } from "../../services/sevaConfig";
import createStyles from "../styles";

const Donate = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { donate } = STRINGS;
  // Lead to the same Qgiv donation form the Seva screen hands off to (its in-app
  // give link is hidden on this branch). No amount/frequency context here, so we
  // open the base form via the shared builder rather than hardcoding the URL.
  return (
    <ListItem
      bottomDivider
      containerStyle={styles.containerNightStyles}
      onPress={() => Linking.openURL(buildQgivUrl({}))}
    >
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="volunteer-activism" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={donate} style={styles.listItemTitle} />
      </ListItem.Content>
      <ListItem.Chevron color={theme.colors.primaryText} />
    </ListItem>
  );
};
export default Donate;
