import React from "react";
import { Pressable } from "react-native";
import PropTypes from "prop-types";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";

// The one switch for a sheet's in-app Punjabi keyboard, placed ABOVE the
// fields it serves.
//
// One switch, not one per field: there is a single keyboard on the sheet, so a
// copy inside every field would be several controls claiming the same thing.
//
// The SHAPE is identical on and off — same box, same height, same position —
// and only the chip fills. An earlier version swapped a bare text link for a
// filled button when it turned on, so one control looked like two different
// ones depending on its state, and the row it lived in changed height as it
// toggled.
const GurmukhiKeyboardToggle = ({ label, active, onToggle }) => {
  const { c, space, radii, layout } = useTokens();

  // Filled only when ON, so the off state is quiet and the switch is not
  // competing with the fields it serves.
  const fillFor = (pressed) => {
    if (active) return c.accentSubtle;
    return pressed ? c.surfaceSelected : "transparent";
  };

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      // Sized to its content and pushed to the trailing edge — NOT a full-width
      // block. A bordered row spanning the sheet read as a primary field, which
      // is the wrong weight for an optional input-method switch and made the
      // sheet look like it had three text boxes. `hitSlop` keeps the tap target
      // at the 44pt minimum while the chip itself stays small.
      hitSlop={layout.hitSlop}
      style={({ pressed }) => ({
        alignSelf: "flex-end",
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        paddingVertical: space.sm,
        paddingHorizontal: space.md,
        borderRadius: radii.pill,
        borderWidth: layout.borderWidth.hairline,
        borderColor: active ? c.accent : c.border,
        backgroundColor: fillFor(pressed),
      })}
    >
      {/* The Gurmukhi letter names the script it switches to, in that script,
          so it needs no translation of its own. */}
      <Text variant="body" color={active ? "accent" : "textSecondary"}>
        ਅ
      </Text>
      {/* No "ON"/"OFF" text: it would be a string to translate into six
          languages for what the fill, the accent and `accessibilityState`
          already say. */}
      <Text variant="caption" color={active ? "accent" : "textSecondary"}>
        {label}
      </Text>
    </Pressable>
  );
};

GurmukhiKeyboardToggle.propTypes = {
  /** Localised name for the control — this primitive holds no strings. */
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default GurmukhiKeyboardToggle;
