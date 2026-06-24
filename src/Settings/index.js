import React, { useRef, useEffect } from "react";
import { StatusBar, Animated, View } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useIsFocused } from "@react-navigation/native";
import PropTypes from "prop-types";
import { setGuideStep } from "@common/actions";
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
  Coachmark,
  SETTINGS_MANAGE_STEPS,
  COACH,
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
import RevisitTutorial from "./components/revisitTutorial";
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

  // "Explore your downloads" guide: when the user picks "Show me" in the player,
  // we land here with guideStep === "manage". Scroll the Audio section (which
  // holds the Manage Downloads row) into view, then the Coachmark below spotlights
  // that row.
  const guideStep = useSelector((state) => state.guideStep);
  const dispatch = useDispatch();
  // Settings is registered in TWO navigators (the Home tab AND the root stack).
  // guideStep is global, so without this gate every mounted Settings instance
  // would start the Manage-Downloads spotlight into the shared overlay portal —
  // and dismissing the focused one would leave the background tab's copy still
  // showing ("it comes up again"). Only the focused instance runs the coachmark.
  const isFocused = useIsFocused();
  const scrollRef = useRef(null);
  const audioSectionY = useRef(0);

  useEffect(() => {
    if (guideStep !== "manage") return undefined;
    const timer = setTimeout(() => {
      const sv = scrollRef.current;
      const node = sv && (sv.scrollTo ? sv : sv.getNode && sv.getNode());
      node?.scrollTo?.({ y: Math.max(0, audioSectionY.current - 40), animated: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [guideStep]);

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
      <Coachmark
        coachKey={COACH.MANAGE_SETTINGS}
        steps={SETTINGS_MANAGE_STEPS}
        active={guideStep === "manage" && isFocused}
        startDelay={1100}
        placement="top"
        // Clear the transient guide step once dismissed so no other mounted
        // Settings instance (or a later remount) can re-trigger the spotlight.
        onStop={() => dispatch(setGuideStep(null))}
      >
      <Animated.ScrollView ref={scrollRef} {...scrollViewProps}>
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
        {/* Measure where the Audio section starts in the scroll content so the
            "Show me" guide can scroll its Manage Downloads row into view. This
            View is a direct ScrollView child, so layout.y is the content offset. */}
        <View onLayout={(e) => { audioSectionY.current = e.nativeEvent.layout.y; }}>
          <Audio />
        </View>
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
        <RevisitTutorial />
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
      </Coachmark>
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
