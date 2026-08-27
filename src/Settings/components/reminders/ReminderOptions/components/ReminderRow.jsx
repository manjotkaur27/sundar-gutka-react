import React from "react";
import { Pressable, View } from "react-native";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { constant, CustomText, ThemedSwitch } from "@common";
import { isCustomTitle } from "../utils";

// One reminder. Replaces the accordion.
//
// The old screen collapsed each reminder open and shut to reveal its actions,
// which meant the list changed height as you browsed it and the actions arrived
// as a coloured slab wedged between rows. Every alarm UI worth copying — iOS
// Clock, Google Clock — uses a flat list instead: the time reads first, the
// name sits under it, the switch is on the right, and tapping the row opens the
// detail. That is what this is.
const ReminderRow = ({ section, onPress, onToggle }) => {
  const { c, space, layout, type } = useTokens();
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const { enabled, translit, gurmukhi, time, title } = section;
  // A title the user wrote is what the notification will say, so the row says
  // it too — a rename that only showed inside the edit sheet read as a rename
  // that had not saved. Until then the bani's name is the better label.
  const showsTitle = isCustomTitle(section);
  let name = isTransliteration ? translit : gurmukhi;
  if (showsTitle) name = title;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${time}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: layout.screenGutter,
        paddingVertical: space.md,
        minHeight: layout.row.minHeightTwoLine,
        backgroundColor: pressed ? c.surfaceSelected : "transparent",
      })}
    >
      <View style={{ flex: 1, gap: space.xxs }}>
        {/* Time leads. A disabled reminder keeps its time visible but muted,
            so the row still reads at a glance. */}
        <CustomText style={[type.display, { color: enabled ? c.textPrimary : c.textDisabled }]}>
          {time}
        </CustomText>
        <CustomText
          style={[
            type.bodySmall,
            // The Gurbani face only for a bani name in its legacy encoding — a
            // typed title is plain text, and would render as gibberish in it.
            !isTransliteration && !showsTitle && { fontFamily: constant.GURBANI_AKHAR_TRUE },
            { color: enabled ? c.textSecondary : c.textDisabled },
          ]}
        >
          {name}
        </CustomText>
      </View>
      <ThemedSwitch value={enabled} onValueChange={onToggle} />
    </Pressable>
  );
};

ReminderRow.propTypes = {
  section: PropTypes.shape({
    enabled: PropTypes.bool.isRequired,
    translit: PropTypes.string.isRequired,
    gurmukhi: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
    title: PropTypes.string,
    titleCustom: PropTypes.bool,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ReminderRow;
