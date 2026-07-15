import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon } from "@rneui/themed";
import { toggleAudioAutoPlay } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, ThemedSwitch } from "@common";
import createStyles from "../styles";

const Audio = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isAudioAutoPlay = useSelector((state) => state.isAudioAutoPlay);
  const dispatch = useDispatch();
  const { AUDIO_AUTO_PLAY } = STRINGS;

  return (
    <ListItem
      bottomDivider
      containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
    >
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="play-circle-outline" type="material" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={AUDIO_AUTO_PLAY} style={styles.listItemTitle} />
      </ListItem.Content>
      <ThemedSwitch
        value={isAudioAutoPlay}
        onValueChange={(value) => dispatch(toggleAudioAutoPlay(value))}
      />
    </ListItem>
  );
};

export default Audio;
