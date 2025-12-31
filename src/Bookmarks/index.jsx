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

  const onPress = (item) => {
    dispatch(actions.setBookmarkPosition(item.item.shabadID));
    navigation.goBack();
  };

  const formattedData = bookmarksData?.map((item, index) => {
    const isBaloo = fontFace === constant.BALOO_PAAJI;
    
    // 1. TITLE LOGIC
    // If Baloo is active AND we have Unicode data, use it. Else fallback to ASCII.
    const title = (isBaloo && item.gurmukhiUni) ? item.gurmukhiUni : item.gurmukhi;

    // 2. TUK Logic
    // We try to find the line text using the tukGurmukhiUni
    // We fallback to 'translit' if the line text is missing.
    const lineAscii = item.tukGurmukhi || item.translit;
    const lineUni = item.tukGurmukhiUni;

    
    const subtitle = (isBaloo && lineUni) ? lineUni : lineAscii;

    return {
      ...item,
      // Ensure we have a unique string key to prevent the "Duplicate Key" crash
      key: item.shabadID ? item.shabadID.toString() : index.toString(),
      
      // Map the calculated title/subtitle
      gurmukhi: title,
      tukGurmukhi: subtitle || "" 
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
