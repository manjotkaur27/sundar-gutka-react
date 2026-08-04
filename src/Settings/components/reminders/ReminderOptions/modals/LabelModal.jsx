import React, { useState } from "react";
import { Modal, TextInput, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { setReminderBanis } from "@common/actions";
import useTokens from "@common/hooks/useTokens";
import { scheduleReminders, STRINGS } from "@common";
import { Button, Text } from "../../../../../common/components/ui";

// Renames the text a reminder's notification shows.
//
// Was a bare Modal with a hardcoded white card (`staticColors.WHITE_COLOR` —
// white in BOTH themes, so black-on-white in dark mode), a `width: "90%"` box,
// an input outlined in `underlayColor` (#009bff, the same blue that failed
// contrast elsewhere), and two untitled `TouchableOpacity` labels with a
// `marginRight: 30` gap. It now uses the same shape as the `Dialog` primitive:
// scrim, elevated surface, dialog padding, and real Buttons that wrap rather
// than truncate when a translation runs long.
const LabelModal = ({ section, onHide }) => {
  const { c, space, layout, radii, elevation } = useTokens();
  const { title } = section;
  const [reminderTitle, setReminderTitle] = useState(title);
  const reminderBanis = useSelector((state) => state.reminderBanis);
  const isReminders = useSelector((state) => state.isReminders);
  const reminderSound = useSelector((state) => state.reminderSound);
  const dispatch = useDispatch();

  const confirmReminderLabel = () => {
    const array = JSON.parse(reminderBanis);
    const index = array.findIndex((item) => item.key === section.key);
    if (index !== -1) array[index].title = reminderTitle;
    dispatch(setReminderBanis(JSON.stringify(array)));
    scheduleReminders(isReminders, reminderSound, JSON.stringify(array));
    onHide();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onHide}>
      <View
        style={{
          flex: 1,
          backgroundColor: c.scrim,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: layout.dialog.marginHorizontal,
        }}
      >
        <View
          accessibilityViewIsModal
          style={[
            {
              width: "100%",
              maxWidth: layout.dialog.maxWidth,
              backgroundColor: c.surfaceElevated,
              borderRadius: radii.xl,
              padding: layout.dialog.padding,
              gap: layout.dialog.gap,
            },
            elevation.overlay,
          ]}
        >
          <Text variant="subheading">{STRINGS.notification_text}</Text>

          <TextInput
            value={reminderTitle}
            onChangeText={setReminderTitle}
            autoFocus
            selectTextOnFocus
            selectionColor={c.accent}
            placeholderTextColor={c.textDisabled}
            style={{
              minHeight: layout.touchTarget,
              borderRadius: radii.sm,
              borderWidth: layout.borderWidth.hairline,
              borderColor: c.borderStrong,
              paddingHorizontal: space.md,
              color: c.textPrimary,
              backgroundColor: c.surface,
              fontSize: 16,
            }}
          />

          {/* Wraps onto separate lines when a translation is too wide to share
              one — same rule as the Dialog primitive. */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: space.sm,
            }}
          >
            <Button
              title={STRINGS.cancel}
              onPress={onHide}
              variant="ghost"
              style={{ flexGrow: 1, flexBasis: "auto" }}
            />
            <Button
              title={STRINGS.ok}
              onPress={confirmReminderLabel}
              style={{ flexGrow: 1, flexBasis: "auto" }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

LabelModal.propTypes = {
  section: PropTypes.shape({ key: PropTypes.number.isRequired, title: PropTypes.string.isRequired })
    .isRequired,
  onHide: PropTypes.func.isRequired,
};

export default LabelModal;
