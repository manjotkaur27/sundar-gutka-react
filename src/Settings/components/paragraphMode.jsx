import React from "react";
import { View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Icon } from "@rneui/themed";
import { toggleParagraphMode } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, ThemedSwitch } from "@common";
import createStyles from "../styles";

const ParagraphMode = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isParagraphMode = useSelector((state) => state.isParagraphMode);

  const dispatch = useDispatch();
  const { PARAGRAPH_MODE } = STRINGS;
  return (
    <ListItem bottomDivider containerStyle={styles.containerNightStyles}>
      <View style={styles.iconContainerStyle}>
        <Icon color={theme.colors.primaryText} name="view-headline" size={26} />
      </View>
      <ListItem.Content>
        <ListItemTitle title={PARAGRAPH_MODE} style={styles.listItemTitle} />
      </ListItem.Content>
      <ThemedSwitch
        value={isParagraphMode}
        onValueChange={(value) => dispatch(toggleParagraphMode(value))}
      />
    </ListItem>
  );
};
export default ParagraphMode;
