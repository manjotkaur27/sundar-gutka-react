import React, { useEffect } from "react";
import { View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { actions, BaniList, GradientDivider, SafeArea, StatusBarComponent, STRINGS } from "@common";
import { ScreenHeader } from "../common/components/ui";
import constant from "../common/constant";
import useBookmarks from "./hooks/useBookmarks";

// Migrated onto the design system. This screen hardcoded `#041126` five times
// and repeated the same `theme.mode === "dark" ? … : …` ternary alongside each
// one — the surface colour, the status bar, the app bar, the title and the
// content wrapper each deciding the theme for themselves. All of it is now
// `c.background`, which also drops the navy dark ground in favour of the
// neutral one.
//
// `styles.js` had no consumers at all and `hooks/useHeader.js` only set
// `headerShown: false`; both are deleted.

const Bookmarks = ({ navigation, route }) => {
  const { c } = useTokens();
  const { bookmarksData } = useBookmarks(route);
  const dispatch = useDispatch();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const fontFace = useSelector((state) => state.fontFace);
  const isBaloo = fontFace === constant.BALOO_PAAJI;

  const onPress = (item) => {
    dispatch(actions.setBookmarkPosition(item.item.shabadID));
    navigation.goBack();
  };

  const formattedData = bookmarksData?.map((item, index) => {
    const { gurmukhi, gurmukhiUni, tukGurmukhi, tukGurmukhiUni, translit, shabadID } = item;
    const title = isBaloo && gurmukhiUni ? gurmukhiUni : gurmukhi;
    const subtitle = isBaloo && tukGurmukhiUni ? tukGurmukhiUni : tukGurmukhi || translit || "";

    return {
      ...item,
      key: (shabadID ?? index).toString(),
      gurmukhi: title,
      tukGurmukhi: subtitle,
    };
  });

  return (
    <SafeArea backgroundColor={c.background}>
      <StatusBarComponent backgroundColor={c.background} />
      <ScreenHeader
        title={STRINGS.bookmarks}
        onBack={() => navigation.goBack()}
        backAccessibilityLabel={STRINGS.GO_BACK}
        // The GradientDivider below IS this header's rule. Without this the
        // header also drew its own hairline, stacking two lines.
        showBorder={false}
      />
      <GradientDivider />
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <BaniList data={formattedData} onPress={onPress} isFolderScreen />
      </View>
    </SafeArea>
  );
};

Bookmarks.propTypes = {
  navigation: PropTypes.shape().isRequired,
  route: PropTypes.shape().isRequired,
};

export default Bookmarks;
