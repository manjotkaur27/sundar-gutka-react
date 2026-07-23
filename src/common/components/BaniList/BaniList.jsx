import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Animated, View, Dimensions, Platform, StyleSheet } from "react-native";
import { useSelector } from "react-redux";
import { ListItem } from "@rneui/themed";
import PropTypes from "prop-types";
import constant from "@common/constant";
import useTheme from "@common/context";
import { FolderIcon } from "@common/icons";
import { convertToUnicode, baseFontSize, ListItemTitle, useCustomScrollbar } from "@common";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const BaniList = React.memo(({ data, onPress, isFolderScreen }) => {
  const { theme } = useTheme();
  const isDarkMode = theme.mode === "dark";
  const { scrollViewProps, Indicator } = useCustomScrollbar();
  const fontSize = useSelector((state) => state.fontSize);
  const fontFace = useSelector((state) => state.fontFace);
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const [isPotrait, toggleIsPotrait] = useState(true);

  const checkPotrait = () => {
    const dim = Dimensions.get("screen");
    return dim.height >= dim.width;
  };
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", () => {
      toggleIsPotrait(checkPotrait());
    });
    return () => subscription.remove();
  }, []);
  const isUnicode = fontFace === constant.BALOO_PAAJI;

  const getBaniTuk = (row) => {
    if (!row || !row.item) {
      return "";
    }
    if (isTransliteration) {
      return row.item.translit;
    }
    if (isUnicode) {
      if (row?.item?.gurmukhiUni) {
        return row.item.gurmukhiUni;
      }
      return convertToUnicode(row.item.gurmukhi);
    }
    return row.item.gurmukhi;
  };

  const renderBanis = useCallback(
    (row) => {
      const itemTextColor = isDarkMode ? theme.staticColors.WHITE_COLOR : theme.colors.primary;
      const displayFont = !isTransliteration ? fontFace : null;

      const listItem = (
        <ListItem
          bottomDivider={false}
          containerStyle={{
            // Folder rows match the home bani-list exactly (same dark navy in
            // dark mode), so the folders section feels like part of home.
            backgroundColor: isDarkMode ? "#041126" : theme.colors.surface,
            // Default vertical padding (no override) keeps rows at the roomier
            // height, with a sleek per-theme hairline divider between them.
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.separator,
          }}
          onPress={() => onPress(row)}
        >
          {row.item.folder && <FolderIcon size={26} color={theme.colors.primaryText} />}
          <ListItem.Content>
            <ListItemTitle
              title={getBaniTuk(row)}
              style={[
                { color: itemTextColor },
                {
                  fontSize: baseFontSize(fontSize, isTransliteration),
                  fontFamily: displayFont,
                },
              ]}
            />
            {row.item.tukGurmukhi && (
              <ListItemTitle
                title={row.item.tukGurmukhi}
                style={[
                  { color: isDarkMode ? theme.colors.textDisabled : theme.colors.primaryText },
                  { fontFamily: displayFont },
                  { fontSize: 17 },
                ]}
              />
            )}
          </ListItem.Content>
        </ListItem>
      );

      return listItem;
    },
    [theme, isDarkMode, fontSize, fontFace, isTransliteration]
  );

  return (
    // Each row paints its own navy background ("#041126" below) to match the
    // home bani-list. Without this, the FlatList's own background stays
    // theme.colors.surface (near-black, not navy) and shows through as a
    // jarring black seam wherever content is shorter than the screen (e.g.
    // the Sawaiye folder's few entries) — this keeps the whole area navy
    // regardless of how many rows there are.
    <View style={{ flex: 1, backgroundColor: isDarkMode ? "#041126" : theme.colors.surface }}>
      <AnimatedFlatList
        style={!isPotrait && Platform.OS === "ios" && { marginLeft: 30 }}
        data={data}
        renderItem={renderBanis}
        keyExtractor={(item) => item.gurmukhi}
        {...scrollViewProps}
      />
      {Indicator}
    </View>
  );
});

BaniList.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      item: PropTypes.shape({
        id: PropTypes.number.isRequired,
        gurmukhi: PropTypes.string.isRequired,
        translit: PropTypes.string.isRequired,
      }),
    })
  ).isRequired,
  onPress: PropTypes.func.isRequired,
  isFolderScreen: PropTypes.bool,
};

BaniList.defaultProps = {
  isFolderScreen: false,
};

export default BaniList;
