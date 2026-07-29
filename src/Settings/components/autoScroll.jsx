import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon } from "@rneui/themed";
import { toggleScreenAwake, toggleAutoScroll } from "@common/actions";
import { stopTrack, resetPlayer } from "@common/TrackPlayerUtils";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, showInfoToast, ThemedSwitch } from "@common";
import createStyles from "../styles";

const AutoScroll = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const dispatch = useDispatch();
  const { AUTO_SCROLL } = STRINGS;
  return (
    <ListItem bottomDivider containerStyle={styles.containerNightStyles}>
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="auto-fix-high" type="material" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={AUTO_SCROLL} style={styles.listItemTitle} />
      </ListItem.Content>
      <ThemedSwitch
        value={isAutoScroll}
        onValueChange={(value) => {
          /* The screen should remain active whenever Auto Scroll is enabled. */
          dispatch(toggleScreenAwake(value));
          dispatch(toggleAutoScroll(value));
          if (value) {
            // Fire-and-forget native cleanup; reducer mutex already flipped audio state.
            (async () => {
              try {
                await stopTrack();
                await resetPlayer();
              } catch (_) {
                // Best effort cleanup
              }
            })();
          }
        }}
      />
    </ListItem>
  );
};
export default AutoScroll;
