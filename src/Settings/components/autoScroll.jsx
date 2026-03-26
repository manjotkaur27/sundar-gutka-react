import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon, Switch } from "@rneui/themed";
import { toggleScreenAwake, toggleAutoScroll } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle } from "@common";
import createStyles from "../styles";

const AutoScroll = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudio = useSelector((state) => state.isAudio);
  const dispatch = useDispatch();
  const { AUTO_SCROLL } = STRINGS;
  return (
    <ListItem bottomDivider containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}>
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="auto-fix-high" type="material" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={AUTO_SCROLL} style={{ color: theme.colors.primaryText }} />
      </ListItem.Content>
      <Switch
        value={isAutoScroll}
        disabled={isAudio}
        onValueChange={(value) => {
          /* The screen should remain active whenever Auto Scroll is enabled. */
          dispatch(toggleScreenAwake(value));
          dispatch(toggleAutoScroll(value));
        }}
      />
    </ListItem>
  );
};
export default AutoScroll;
