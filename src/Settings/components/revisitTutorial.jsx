import React from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import { ListItem, Icon } from "@rneui/themed";
import { resetTour, toggleAudio, setDefaultAudio, clearAudioProgress } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, constant, navigate } from "@common";
import createStyles from "../styles";

// Japji Sahib — the Bani the tour replays on (id 2 in the bundled DB).
const JAPJI_ID = 2;

// "Revisit Tutorial" row (Other Options). Clears every onboarding "seen" flag,
// opts the user back in, then opens Japji Sahib in the reader so the tour
// replays from its first hint (the audio button) exactly like a fresh install.
// Audio mode is reset off because the audio hint only shows in read mode.
const RevisitTutorial = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useDispatch();

  const handlePress = () => {
    dispatch(resetTour());
    dispatch(toggleAudio(false));
    // If the user already has a saved session for Japji, opening it would skip
    // the artist-picker (so the Preview coachmark never shows) and auto-resume
    // (remounting the player, which fires the Player coachmark twice). Clearing
    // Japji's saved default artist + progress makes AudioPlayer open at the
    // track-selection modal, so the tour walks the full picker → player flow
    // once, exactly like a first run.
    dispatch(setDefaultAudio(null, JAPJI_ID));
    dispatch(clearAudioProgress(JAPJI_ID));
    navigate(constant.READER, {
      key: `Reader-${JAPJI_ID}`,
      params: {
        id: JAPJI_ID,
        title: "jpujI swihb",
        titleUni: "ਜਪੁਜੀ ਸਾਹਿਬ",
      },
    });
  };

  return (
    <ListItem
      bottomDivider
      containerStyle={styles.containerNightStyles}
      onPress={handlePress}
    >
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="help-outline" type="material" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={STRINGS.REVISIT_TUTORIAL} style={styles.listItemTitle} />
      </ListItem.Content>
      <ListItem.Chevron color={theme.colors.primaryText} />
    </ListItem>
  );
};

export default RevisitTutorial;
