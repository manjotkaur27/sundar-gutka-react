import React from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { ListItem, Avatar, Icon } from "@rneui/themed";
import { toggleLarivaar, toggleLarivaarAssist } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, ThemedSwitch } from "@common";
import createStyles from "../styles";

const LarivaarComponent = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isLarivaar = useSelector((state) => state.isLarivaar);
  const isLarivaarAssist = useSelector((state) => state.isLarivaarAssist);

  const dispatch = useDispatch();
  const larivaarIcon = require("../../../images/larivaaricon.png");
  return (
    <>
      <ListItem bottomDivider containerStyle={styles.containerNightStyles}>
        <View style={styles.iconContainerStyle}>
          <Avatar source={larivaarIcon} avatarStyle={styles.avatarStyle} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={STRINGS.larivaar} style={styles.listItemTitle} />
        </ListItem.Content>
        <ThemedSwitch value={isLarivaar} onValueChange={(value) => dispatch(toggleLarivaar(value))} />
      </ListItem>
      {isLarivaar && (
        <ListItem bottomDivider containerStyle={styles.containerNightStyles}>
          <View style={styles.iconContainerStyle}>
            <Icon name="opacity" size={26} color={theme.colors.primaryText} />
          </View>
          <ListItem.Content>
            <ListItemTitle title={STRINGS.larivaar_assist} style={styles.listItemTitle} />
          </ListItem.Content>
          <ThemedSwitch
            value={isLarivaarAssist}
            onValueChange={(value) => dispatch(toggleLarivaarAssist(value))}
          />
        </ListItem>
      )}
    </>
  );
};

export default LarivaarComponent;
