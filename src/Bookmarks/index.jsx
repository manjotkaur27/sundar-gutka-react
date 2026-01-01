import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { BaniList, actions, StatusBarComponent, SafeArea, useTheme } from "@common";
import useBookmarks from "./hooks/useBookmarks";
import useHeader from "./hooks/useHeader";
import constant from "../common/constant";

const Bookmarks = ({ navigation, route }) => {
  useHeader(navigation);
  const { theme } = useTheme();
  const { bookmarksData } = useBookmarks(route);
  const dispatch = useDispatch();

  const fontFace = useSelector((state) => state.fontFace);
  const isBaloo = fontFace === constant.BALOO_PAAJI;

  const onPress = (item) => {
    dispatch(actions.setBookmarkPosition(item.item.shabadID));
    navigation.goBack();
  };

  const formattedData = bookmarksData?.map((item, index) => {
    const {
      gurmukhi,
      gurmukhiUni,
      tukGurmukhi,
      tukGurmukhiUni,
      translit,
      shabadID,
    } = item;

    const title = isBaloo && gurmukhiUni ? gurmukhiUni : gurmukhi;

    const subtitle =
      isBaloo && tukGurmukhiUni
        ? tukGurmukhiUni
        : tukGurmukhi || translit || "";

    return {
      ...item,
      key: (shabadID ?? index).toString(),
      gurmukhi: title,
      tukGurmukhi: subtitle,
    };
  });

  return (
    <SafeArea backgroundColor={theme.colors.surface}>
      <StatusBarComponent backgroundColor={theme.colors.surface} />
      <BaniList data={formattedData} onPress={onPress} isFolderScreen />
    </SafeArea>
  );
};

Bookmarks.propTypes = {
  navigation: PropTypes.shape().isRequired,
  route: PropTypes.shape().isRequired,
};
export default Bookmarks;
