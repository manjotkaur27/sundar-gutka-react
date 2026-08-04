import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import {
  actions,
  BaniList,
  BottomNavigation,
  constant,
  GradientDivider,
  SafeArea,
  StatusBarComponent,
  STRINGS,
} from "@common";
import { ScreenHeader } from "../common/components/ui";

// The bottom nav's home items navigate to the tab routes.
const TAB_ROUTES = ["Home", constant.DASHBOARD, constant.SEVA, constant.SETTINGS];

// Migrated onto the design system. The separate `header.js` and `styles.js` are
// deleted: the header is now the shared `ScreenHeader`, which centres its title
// exactly as this screen's own header did.
//
// Two defects went with them. The old header positioned the back arrow
// absolutely over the title and compensated with 48pt of padding plus
// `numberOfLines={1}`, so a long Gurmukhi folder title truncated; the shared
// header lays out in columns that cannot collide, so the title wraps instead.
// And the status bar was painted `colors.primary` (navy) while the header
// underneath it was `colors.surface` (white) — a mismatched strip in light
// mode.

const FolderScreen = ({ navigation, route }) => {
  const { c } = useTokens();
  const dispatch = useDispatch();
  const { navigate } = navigation;
  const { data, title } = route.params.params;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // FolderScreen is pushed on the root stack, so the tab routes live inside the
  // nested MainTabs navigator and a plain navigate("Home") can't resolve them.
  // Wrap navigate() to target the nested tab, leaving every other route as-is —
  // this keeps the home bottom nav visible AND functional in the folders section.
  const navWithTabs = useMemo(
    () => ({
      ...navigation,
      navigate: (name, params) =>
        TAB_ROUTES.includes(name)
          ? navigation.navigate("MainTabs", { screen: name })
          : navigation.navigate(name, params),
    }),
    [navigation]
  );

  const onPress = (row) => {
    const { item } = row;
    const { id, gurmukhi, gurmukhiUni } = item;
    dispatch(actions.toggleAudio(false));
    navigate(constant.READER, {
      key: `Reader-${id}`,
      // Pass titleUni too (like HomeScreen) so the Reader header renders proper
      // Gurmukhi under the Unicode font instead of raw ASCII GurbaniAkhar text.
      params: { id, title: gurmukhi, titleUni: gurmukhiUni },
    });
  };

  return (
    <SafeArea backgroundColor={c.background} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor={c.background} />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScreenHeader
          title={title}
          titleVariant="baniTitle"
          showBorder={false}
          onBack={() => navigation.goBack()}
          backAccessibilityLabel={STRINGS.GO_BACK}
        />
        <GradientDivider />
        <BaniList data={data} isFolderScreen onPress={onPress} />
      </View>
      <BottomNavigation activeKey="Home" context="home" visible navigation={navWithTabs} />
    </SafeArea>
  );
};

FolderScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    setOptions: PropTypes.func,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      params: PropTypes.shape({
        data: PropTypes.arrayOf(PropTypes.shape()),
        title: PropTypes.string,
      }),
    }),
  }).isRequired,
};

export default FolderScreen;
