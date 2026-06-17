import React from "react";
import { StatusBar, Animated, View } from "react-native";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import {
  STRINGS,
  StatusBarComponent,
  SafeArea,
  CustomText,
  GradientDivider,
  useCustomScrollbar,
  useBackHandler,
  BottomNavigation,
  constant,
} from "@common";
import Audio from "./components/audio";
import AutoScroll from "./components/autoScroll";
import BaniFontFaceComponent from "./components/baniFontFace";
import BaniLengthComponent from "./components/baniLength";
import CollectStatistics from "./components/collectStatistics";
import ListItemWithIcon from "./components/comon/ListitemWithIcon";
import DatabaseUpdateBanner from "./components/databaseUpdate";
import Donate from "./components/donate";
import EditBaniOrder from "./components/editBaniOrder";
import FontFaceComponent from "./components/fontFace";
import FontSizeComponent from "./components/fontSize";
import KeepAwake from "./components/keepAwake";
import LanguageComponent from "./components/language";
import LarivaarComponent from "./components/larivaar";
import PadchedSettingsComponent from "./components/padched";
import ParagraphMode from "./components/paragraphMode";
import RemindersComponent from "./components/reminders/reminders";
import HideStatusBar from "./components/statusBar";
import ThemeComponent from "./components/theme";
import TranslationComponent from "./components/translation";
import TransliterationComponent from "./components/transliteration";
import VishraamComponent from "./components/vishraam";
import useHeader from "./hooks/useHeader";
import createStyles from "./styles";

const Settings = ({ navigation, route }) => {
  const fromReader = route?.params?.fromReader === true;
  // Settings is reachable several ways: pushed onto the root stack (from the
  // Reader OR a Folder) where goBack() pops correctly, OR as a bottom tab from
  // Home where there is no back stack. canGoBack() distinguishes them reliably
  // for every entry path — only the tab case (no stack to pop) falls back to the
  // Home tab. (The old fromReader-only check left the Folder→Settings push stuck,
  // since navigate("Home") can't resolve the tab from the root stack.)
  const handleBackPress = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
    return true;
  }, [navigation]);
  const appBar = useHeader(navigation, handleBackPress);
  useBackHandler(handleBackPress);
  const isDatabaseUpdateAvailable = useSelector((state) => state.isDatabaseUpdateAvailable);

  const { navigate } = navigation;
  const { theme } = useTheme();
  const { scrollViewProps, Indicator } = useCustomScrollbar();
  const styles = useThemedStyles(createStyles);
  const { displayOptionsText, end } = styles;
  const { DISPLAY_OPTIONS, BANI_OPTIONS, OTHER_OPTIONS, AUDIO } = STRINGS;
  const language = useSelector((state) => state.language);
  const { about, databaseUpdate } = STRINGS;

  return (
    <SafeArea backgroundColor={theme.colors.surface} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor={theme.colors.surface} />
      {appBar}
      <GradientDivider />
      {isDatabaseUpdateAvailable && <DatabaseUpdateBanner navigate={navigate} />}
      <View style={{ flex: 1 }}>
      <Animated.ScrollView {...scrollViewProps}>
        <CustomText style={displayOptionsText}>{DISPLAY_OPTIONS}</CustomText>
        <FontSizeComponent />
        <FontFaceComponent />
        <LanguageComponent language={language} />
        <TransliterationComponent />
        <TranslationComponent />
        <ThemeComponent />
        <StatusBar />
        <HideStatusBar />
        <AutoScroll />
        <KeepAwake />
        {/* Audio Player */}
        <CustomText style={displayOptionsText}>{AUDIO}</CustomText>
        <Audio />
        {/* Bani Options */}
        <CustomText style={displayOptionsText}>{BANI_OPTIONS}</CustomText>
        <EditBaniOrder navigate={navigate} />
        <BaniFontFaceComponent />
        <BaniLengthComponent />
        <LarivaarComponent />
        <ParagraphMode />
        <PadchedSettingsComponent />
        <VishraamComponent />
        <RemindersComponent navigation={navigation} />
        <CustomText style={displayOptionsText}>{OTHER_OPTIONS}</CustomText>
        <CollectStatistics />
        <Donate />
        <ListItemWithIcon
          iconName="info"
          title={about}
          navigate={navigate}
          navigationTarget="About"
        />
        <ListItemWithIcon
          iconName="update"
          title={databaseUpdate}
          navigate={navigate}
          navigationTarget="DatabaseUpdate"
        />
        <CustomText style={end} />
      </Animated.ScrollView>
      {Indicator}
      </View>
      {fromReader && (
        <BottomNavigation
          activeKey={constant.SETTINGS}
          context="reader"
          visible={true}
        />
      )}
    </SafeArea>
  );
};

Settings.propTypes = {
  navigation: PropTypes.shape({ navigate: PropTypes.func, setOptions: PropTypes.func }).isRequired,
  route: PropTypes.shape({ params: PropTypes.shape({ fromReader: PropTypes.bool }) }),
};

export default Settings;
