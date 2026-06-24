import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { CustomText, STRINGS, useThemedStyles } from "@common";
import { getLanguages } from "@settings/components/comon/strings";
import { setLanguage, setHasChosenLanguage } from "../../actions";
import createStyles from "./style";

// First-run language picker — shown before BaniLengthSelector and before the
// onboarding tour so new users see everything else in their own language,
// rather than silently defaulting to English/device-locale.
const LanguageSelector = () => {
  const styles = useThemedStyles(createStyles);
  const dispatch = useDispatch();
  // Drop the "Default" entry — on this first-run picker the user should choose a
  // concrete language, not defer to the device locale — and present them in a
  // fixed, intentional order: Punjabi, English, Hindi, Italiano, Español,
  // Français (Gurmukhi/Devanagari first, then the Latin-script locales).
  const FIRST_RUN_ORDER = ["pa", "en-US", "hi", "it", "es", "fr"];
  const byKey = getLanguages(STRINGS).reduce((acc, lang) => {
    acc[lang.key] = lang;
    return acc;
  }, {});
  const languages = FIRST_RUN_ORDER.map((key) => byKey[key]).filter(Boolean);

  const handleSelect = (key) => {
    dispatch(setLanguage(key));
    dispatch(setHasChosenLanguage(true));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.viewWrapper}>
            {/* Same Gurmukhi app-name heading as the first-run Bani-length page.
                Unicode Gurmukhi (not the legacy ASCII-mapped STRINGS.khalsa_sundar_gutka)
                so it renders correctly in Baloo Paaji 2. */}
            <CustomText style={styles.heading}>ਖਾਲਸਾ ਸੁੰਦਰ ਗੁਟਕਾ</CustomText>
            <CustomText style={styles.subheading}>{STRINGS.SELECT_LANGUAGE_BODY}</CustomText>
            {languages.map(({ key, title }) => (
              <Pressable key={key} onPress={() => handleSelect(key)}>
                <CustomText style={styles.button}>{title}</CustomText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default LanguageSelector;
