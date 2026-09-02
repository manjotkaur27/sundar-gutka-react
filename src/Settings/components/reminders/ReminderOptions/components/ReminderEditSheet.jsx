import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Icon } from "@rneui/themed";
import PropTypes from "prop-types";
import { setReminderBanis } from "@common/actions";
import useTokens from "@common/hooks/useTokens";
import {
  ConfirmDialogHost,
  constant,
  showConfirm,
  STRINGS,
  trackReminderEvent,
  scheduleReminders,
} from "@common";
import { Row, Sheet, TimePickerSheet } from "../../../../../common/components/ui";
import LabelModal from "../modals/LabelModal";

// Everything you can do to one reminder, in the app's own sheet: change its
// time, rename its notification, delete it.
//
// ── The time picker and the label prompt are rendered INSIDE the sheet ──────
//
// Not beside it. Both are Modals, and so is the sheet, and on iOS a Modal is a
// real UIViewController presented by whichever view controller React resolves
// for the view that hosts it:
//
//   [[modalHostView reactViewController] presentViewController:...]
//                                     (RCTModalHostViewManager.m)
//
// `reactViewController` walks up the react superview chain. As SIBLINGS of the
// sheet these two resolved to the ROOT controller — which is already presenting
// the sheet — and UIKit refuses to present twice from the same controller
// ("Attempt to present ... which is already presenting"). The tap did nothing,
// the completion never ran, and the screen sat there looking frozen. Android
// never had the bug: a Modal is a Dialog there, and dialogs simply stack.
//
// As children the chain ends at the sheet's own RCTModalHostViewController, so
// the picker is presented BY the sheet, which is what iOS requires.
//
// The same trap catches anything else opened from in here, which is why the
// Delete row's confirm gets a `ConfirmDialogHost` of its own at the bottom of
// the sheet — the app-root host it would otherwise reach is presented by the
// root controller and could not open over this sheet.
//
// This replaces the accordion's expanded panel — two untitled icon rows on a
// navy slab. A sheet is the right shape for it: the list stays a stable height,
// the actions are named rather than guessed from an icon, and it matches every
// other chooser in Settings.
const ReminderEditSheet = ({ section = null, visible, onClose }) => {
  const { c, layout } = useTokens();
  const dispatch = useDispatch();
  const reminderBanis = useSelector((state) => state.reminderBanis);
  const isReminders = useSelector((state) => state.isReminders);
  const reminderSound = useSelector((state) => state.reminderSound);

  const [isTimePicker, toggleTimePicker] = useState(false);
  const [isLabelModal, toggleLabelModal] = useState(false);

  if (!section) return null;
  const { key, time, title } = section;

  const handleTimePicked = (formattedTime) => {
    const array = JSON.parse(reminderBanis);
    const targetIndex = array.findIndex((item) => item.key === Number(key));
    if (targetIndex !== -1) {
      array[targetIndex] = {
        ...array[targetIndex],
        enabled: true,
        time: formattedTime,
      };
    }
    dispatch(setReminderBanis(JSON.stringify(array)));
    toggleTimePicker(false);
    scheduleReminders(isReminders, reminderSound, JSON.stringify(array));
    trackReminderEvent(constant.UPDATE_REMINDER, array[targetIndex]);
    onClose();
  };

  const handleDelete = () =>
    showConfirm({
      title: STRINGS.delete,
      message: title,
      cancelText: STRINGS.cancel,
      confirmText: STRINGS.delete,
      destructive: true,
      onConfirm: () => {
        const arr = JSON.parse(reminderBanis).filter((obj) => obj.key !== key);
        dispatch(setReminderBanis(JSON.stringify(arr)));
        // Rewrite the OS schedule too. Without this the reminder vanished from
        // the list but its notification stayed registered and kept firing —
        // deleting it only ever changed the app's own copy.
        scheduleReminders(isReminders, reminderSound, JSON.stringify(arr));
        onClose();
      },
    });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      closeAccessibilityLabel={STRINGS.cancel}
    >
      <Row
        title={STRINGS.REMINDER_TIME}
        value={time}
        onPress={() => toggleTimePicker(true)}
        showDivider
        leading={<Icon name="schedule" color={c.textSecondary} size={layout.icon.sm} />}
      />
      <Row
        title={STRINGS.notification_text}
        onPress={() => toggleLabelModal(true)}
        showDivider
        leading={<Icon name="turned-in-not" color={c.textSecondary} size={layout.icon.sm} />}
      />
      <Row
        title={STRINGS.delete}
        onPress={handleDelete}
        titleStyle={{ color: c.error }}
        leading={<Icon name="delete-outline" color={c.error} size={layout.icon.sm} />}
      />

      {/* INSIDE the sheet, not beside it, and that placement is the whole fix
          for the iOS freeze — see the note above the component.

          Neither adds anything to the layout: React Native's Modal renders its
          inline view `position: "absolute"` (Modal.js, `styles.modal`), so it is
          out of flow and does not even take a `gap` slot in the sheet's body. */}
      <TimePickerSheet
        visible={isTimePicker}
        value={time}
        title={STRINGS.REMINDER_TIME}
        confirmLabel={STRINGS.ok}
        cancelLabel={STRINGS.cancel}
        hourLabel={STRINGS.HOUR}
        minuteLabel={STRINGS.MINUTE}
        editHint={STRINGS.TIME_EDIT_HINT}
        onConfirm={handleTimePicked}
        onClose={() => toggleTimePicker(false)}
      />

      {isLabelModal && <LabelModal section={section} onHide={() => toggleLabelModal(false)} />}

      {/* Confirms raised from in here are presented BY this sheet.
          `showConfirm`'s host is normally the one at the app root, which on iOS
          is presented by the root controller — and that controller is already
          presenting this sheet, so the dialog never appeared and the screen sat
          frozen. A host mounted here registers as the innermost and takes over
          for as long as the sheet is open. See ConfirmDialog. */}
      <ConfirmDialogHost />
    </Sheet>
  );
};

ReminderEditSheet.propTypes = {
  section: PropTypes.shape({
    key: PropTypes.number.isRequired,
    time: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ReminderEditSheet;
