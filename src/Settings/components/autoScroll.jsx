import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon, Switch } from "@rneui/themed";
import { toggleScreenAwake, toggleAutoScroll, toggleAudioFeatureEnabled } from "@common/actions";
import { stopTrack, resetPlayer } from "@common/TrackPlayerUtils";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, showInfoToast } from "@common";
import createStyles from "../styles";

const AutoScroll = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
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
        onValueChange={async (value) => {
          /* The screen should remain active whenever Auto Scroll is enabled. */
          dispatch(toggleScreenAwake(value));
          if (value) {
            // Warn user that audio will be disabled
            if (isAudioFeatureEnabled) {
              showInfoToast(STRINGS.AUTO_SCROLL_DISABLES_AUDIO || "Audio Player has been disabled");
            }
            // Stop any active audio playback before enabling auto-scroll
            // The reducer mutex handles toggling isAudio & isAudioFeatureEnabled off
            try {
              await stopTrack();
              await resetPlayer();
            } catch (_) {
              // Best effort cleanup
            }
          } else {
            // See-saw: turning AutoScroll OFF → Audio Player automatically ON
            dispatch(toggleAudioFeatureEnabled(true));
            dispatch(toggleScreenAwake(false));
          }
          dispatch(toggleAutoScroll(value));
        }}
      />
    </ListItem>
  );
};
export default AutoScroll;
