import React, { useMemo } from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import {
  BaniList,
  constant,
  StatusBarComponent,
  SafeArea,
  actions,
  BottomNavigation,
} from "@common";
import Header from "./header";

// The bottom nav's home items navigate to the tab routes.
const TAB_ROUTES = ["Home", constant.DASHBOARD, constant.SEVA, constant.SETTINGS];

const FolderScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { navigate } = navigation;
  const { data, title } = route.params.params;

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
    <SafeArea backgroundColor={theme.colors.surface} edges={["left", "right"]}>
      <StatusBarComponent backgroundColor={theme.colors.primary} />
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <Header navigation={navigation} title={title} />
        <BaniList data={data} isFolderScreen onPress={onPress} />
      </View>
      <BottomNavigation
        activeKey="Home"
        context="home"
        visible
        navigation={navWithTabs}
      />
    </SafeArea>
  );
};

FolderScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
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
