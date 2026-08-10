import React from "react";
import { TextInput } from "react-native";
import PropTypes from "prop-types";
import useTokens from "../../hooks/useTokens";

// A text field that can hand itself over to the in-app Punjabi keyboard.
//
// The switch is NOT in here. One keyboard serves every field on a sheet, so
// one switch sits above them all (see GurmukhiKeyboardToggle) rather than a
// copy inside each field competing for the same keyboard. This field only says
// whether it is the one currently receiving keys, and reports focus so the
// switch knows which field to type into.
//
// While the in-app keyboard is up the OS keyboard is suppressed
// (`showSoftInputOnFocus`): two keyboards over one field is what buried the
// bani search box behind the system one.
const GurmukhiTextField = ({
  value,
  onChange,
  accessibilityLabel,
  gurmukhiOpen,
  receivingKeys,
  placeholder = undefined,
  onFocus = undefined,
  onSubmit = undefined,
  maxLength = undefined,
  returnKeyType = "done",
}) => {
  const { c, space, radii, layout, type } = useTokens();

  return (
    <TextInput
      value={value}
      onChangeText={(next) => onChange(maxLength ? next.slice(0, maxLength) : next)}
      placeholder={placeholder}
      placeholderTextColor={c.textDisabled}
      selectionColor={c.accent}
      accessibilityLabel={accessibilityLabel}
      onFocus={onFocus}
      onSubmitEditing={onSubmit}
      returnKeyType={returnKeyType}
      allowFontScaling
      maxFontSizeMultiplier={1.5}
      showSoftInputOnFocus={!gurmukhiOpen}
      style={{
        minHeight: layout.touchTarget,
        borderRadius: radii.sm,
        borderWidth: layout.borderWidth.hairline,
        // Reads as the live target while the in-app keys are up, so it is
        // obvious which field the keyboard at the bottom is typing into.
        borderColor: receivingKeys ? c.accent : c.borderStrong,
        paddingHorizontal: space.md,
        // Vertical padding rather than a fixed height, so a raised OS font
        // setting grows the field instead of clipping the text inside it.
        paddingVertical: space.md_12,
        color: c.textPrimary,
        backgroundColor: c.surface,
        // The body type ROLE, so the field tracks the type scale instead of
        // pinning a number the way the fields this replaced did.
        fontSize: type.body.fontSize,
      }}
    />
  );
};

GurmukhiTextField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  accessibilityLabel: PropTypes.string.isRequired,
  /** Whether the sheet's in-app keyboard is up at all (suppresses the OS one). */
  gurmukhiOpen: PropTypes.bool.isRequired,
  /** Whether THIS field is the one those keys are going into. */
  receivingKeys: PropTypes.bool.isRequired,
  placeholder: PropTypes.string,
  onFocus: PropTypes.func,
  onSubmit: PropTypes.func,
  maxLength: PropTypes.number,
  returnKeyType: PropTypes.string,
};

export default GurmukhiTextField;
