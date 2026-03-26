import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon, Switch } from "@rneui/themed";
import { toggleStatusBar } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle } from "@common";
import createStyles from "../styles";

const StatusBar = () => {
  const isStatusBar = useSelector((state) => state.isStatusBar);
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useDispatch();
  const { HIDE_STATUS_BAR } = STRINGS;

  return (
    <ListItem bottomDivider containerStyle={styles.containerNightStyles}>
      <View style={styles.iconContainerStyle}>
        {!isStatusBar && (
          <Icon color={theme.colors.primaryText} name="visibility-off" type="material" size={26} />
        )}
        {isStatusBar && <Icon color={theme.colors.primaryText} name="visibility" type="material" size={26} />}
      </View>
      <ListItem.Content>
        <ListItemTitle title={HIDE_STATUS_BAR} style={styles.listItemTitle} />
      </ListItem.Content>
      <Switch value={isStatusBar} onValueChange={(value) => dispatch(toggleStatusBar(value))} />
    </ListItem>
  );
};

export default StatusBar;
