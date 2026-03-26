import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon, Switch } from "@rneui/themed";
import {
  toggleAudio,
  toggleAudioAutoPlay,
  toggleAutoScroll,
  toggleAudioFeatureEnabled,
} from "@common/actions";
import { stopTrack, resetPlayer } from "@common/TrackPlayerUtils";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle } from "@common";
import createStyles from "../styles";

const Audio = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAudio = useSelector((state) => state.isAudio);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const isAudioAutoPlay = useSelector((state) => state.isAudioAutoPlay);
  const isAutoScroll = useSelector((state) => state.isAutoScroll);
  const dispatch = useDispatch();
  const { AUDIO, AUDIO_AUTO_PLAY } = STRINGS;
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;

  // Audio settings configuration
  const audioSettings = [
    {
      id: "main",
      title: AUDIO,
      icon: "music-note",
      value: isAudioFeatureOn,
      action: toggleAudioFeatureEnabled,
      showAlways: true,
    },
    {
      id: "autoPlay",
      title: AUDIO_AUTO_PLAY,
      icon: "play-circle-outline",
      value: isAudioAutoPlay,
      action: toggleAudioAutoPlay,
      showAlways: false,
    },
  ];

  const renderAudioSetting = (setting) => {
    const shouldShow = setting.showAlways || isAudioFeatureOn;

    if (!shouldShow) return null;

    return (
      <ListItem
        key={setting.id}
        bottomDivider
        containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
      >
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name={setting.icon} type="material" size={26} />
      </View>
        <ListItem.Content>
          <ListItemTitle title={setting.title} style={styles.listItemTitle} />
        </ListItem.Content>
        <Switch
          value={setting.value}
          onValueChange={async (value) => {
            if (isAutoScroll) {
              dispatch(toggleAutoScroll(false));
            }
            if (setting.id === "main" && !value) {
              await stopTrack();
              await resetPlayer();
              dispatch(toggleAudio(false));
            }
            dispatch(setting.action(value));
          }}
        />
      </ListItem>
    );
  };

  return <>{audioSettings.map(renderAudioSetting)}</>;
};

export default Audio;
