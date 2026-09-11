import React from "react";
import { View } from "react-native";
import PropTypes from "prop-types";
import { CloseIcon } from "@common/icons";
import useTokens from "../../hooks/useTokens";
import IconAction from "./IconAction";

// A sheet's cancel and confirm, for its title row.
//
// They used to be a pair of buttons under the body, which is fine until the
// body is a list or a keyboard is up. Then they sit behind everything — reaching
// Create meant scrolling past every bani — and either keyboard covers them
// outright. Pinning them above the keys was worse: the sheet is capped at a
// share of the display and the keys take up to 55% of it, so a pinned row left
// the list with no rows at all at a raised text size.
//
// The title row is the one part of a sheet that no keyboard can cover and
// nothing can scroll away, and its height does not follow the text setting, so
// the body pays nothing for them.
//
// Cancel is always the cross. What confirming MEANS differs — save the rename,
// create the pothi, go to the next step — so its icon and its label come from
// the caller. Both take the header foreground, the same colour the Dashboard's
// and Seva's crosses are drawn in, so a sheet's controls read as the app's own
// rather than as a pair this screen invented. Disabled is the only difference
// either of them shows.
const SheetActions = ({
  onCancel,
  cancelLabel,
  confirmIcon,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
}) => {
  const { space } = useTokens();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <IconAction icon={CloseIcon} label={cancelLabel} onPress={onCancel} />
      <IconAction
        icon={confirmIcon}
        label={confirmLabel}
        onPress={onConfirm}
        disabled={confirmDisabled}
      />
    </View>
  );
};

SheetActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  /** Localised name for the cancelling action. */
  cancelLabel: PropTypes.string.isRequired,
  /** An icon component from `@common/icons` — what confirming does here. */
  confirmIcon: PropTypes.elementType.isRequired,
  /** Localised name for the confirming action — "Save", "Create", "Next". */
  confirmLabel: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  confirmDisabled: PropTypes.bool,
};

export default SheetActions;
