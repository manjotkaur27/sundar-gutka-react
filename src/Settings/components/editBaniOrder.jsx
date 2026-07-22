import React from "react";
import { View } from "react-native";
import { ListItem, Avatar } from "@rneui/themed";
import PropTypes from "prop-types";
import { STRINGS, useTheme, useThemedStyles, ListItemTitle } from "@common";
import createStyles from "../styles";

const EditBaniOrder = ({ navigate }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { EDIT_BANI_ORDER } = STRINGS;
  const rearrangeIcon = require("../../../images/rearrangeicon.png");
  return (
    <ListItem
      bottomDivider
      containerStyle={styles.containerNightStyles}
      onPress={() => navigate("EditBaniOrder")}
    >
      <View style={styles.iconContainerStyle}>
        <Avatar source={rearrangeIcon} avatarStyle={styles.avatarStyle} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={EDIT_BANI_ORDER} style={styles.listItemTitle} />
      </ListItem.Content>
      <ListItem.Chevron color={theme.colors.primaryText} />
    </ListItem>
  );
};
EditBaniOrder.propTypes = {
  navigate: PropTypes.func.isRequired,
};
export default EditBaniOrder;
