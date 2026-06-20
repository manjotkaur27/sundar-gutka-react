import React, { useState, useEffect } from "react";
import { View, Modal, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { CustomText, STRINGS, actions } from "@common";
import useDashboardTheme from "./dashboardTheme";

// Local editable profile name (no SSO yet). Persisted via redux-persist.
const EditNameModal = ({ visible, onClose }) => {
  const { card, isDark, accentBlue, primaryText, mutedText, separator } = useDashboardTheme();
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.userProfile);
  const [name, setName] = useState(profile?.name ?? "");

  useEffect(() => {
    if (visible) setName(profile?.name ?? "");
  }, [visible, profile]);

  const save = () => {
    dispatch(actions.setUserProfile({ name: name.trim() }));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
          <Pressable style={[card, styles.sheet]} onPress={() => {}}>
            <CustomText style={[styles.title, { color: primaryText }]}>{STRINGS.EDIT_NAME}</CustomText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={STRINGS.ENTER_NAME}
              placeholderTextColor={mutedText}
              style={[styles.input, { color: primaryText, borderColor: separator, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f5f7fb" }]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={save}
              maxLength={40}
            />
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.btn} hitSlop={6}>
                <CustomText style={[styles.btnText, { color: mutedText }]}>{STRINGS.CANCEL}</CustomText>
              </Pressable>
              <Pressable onPress={save} style={styles.btn} hitSlop={6}>
                <CustomText style={[styles.btnText, { color: accentBlue, fontWeight: "700" }]}>{STRINGS.SAVE}</CustomText>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

EditNameModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  sheet: { padding: 22 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 20, marginTop: 18 },
  btn: { paddingVertical: 6, paddingHorizontal: 8 },
  btnText: { fontSize: 15 },
});

export default EditNameModal;
