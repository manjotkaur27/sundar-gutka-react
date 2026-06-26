import React from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import { ListItem, Icon } from "@rneui/themed";
import { setOnboardingVisible } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle } from "@common";
import createStyles from "../styles";

// "Revisit Tutorial" row (Other Options) — reopens the onboarding carousel
// (the text + screenshot guide) regardless of whether it's been seen before.
// The carousel is a root-level overlay (see app.js / OnboardingCarousel), so it
// appears on top of Settings and returns here when finished.
const RevisitTutorial = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch = useDispatch();

  const handlePress = () => {
    dispatch(setOnboardingVisible(true));
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
