import React from "react";
import { View } from "react-native";
import { ListItem, Icon } from "@rneui/themed";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { ListItemTitle } from "@common";
import createStyles from "../../styles";

const ListItemWithIcon = ({ iconName, title, navigate, navigationTarget }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <ListItem
      containerStyle={styles.containerNightStyles}
      bottomDivider
      onPress={() => navigate(navigationTarget)}
    >
      <View style={styles.iconContainerStyle}>
        <Icon name={iconName} size={26} color={theme.colors.primaryText} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={title} style={styles.listItemTitle} />
      </ListItem.Content>
      <ListItem.Chevron color={theme.colors.primaryText} />
    </ListItem>
  );
};

ListItemWithIcon.propTypes = {
  iconName: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  navigate: PropTypes.func.isRequired,
  navigationTarget: PropTypes.string.isRequired,
};

export default ListItemWithIcon;
