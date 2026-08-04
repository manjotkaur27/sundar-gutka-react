import React from "react";
import { Pressable, View } from "react-native";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { constant, CustomText, ThemedSwitch } from "@common";

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
  const { enabled, translit, gurmukhi, time } = section;
  const name = isTransliteration ? translit : gurmukhi;

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
            !isTransliteration && { fontFamily: constant.GURBANI_AKHAR_TRUE },
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
  }).isRequired,
  onPress: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ReminderRow;
