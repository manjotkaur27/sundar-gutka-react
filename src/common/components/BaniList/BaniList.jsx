import React, { useCallback } from "react";
import {
  FlatList,
  Animated,
  View,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import constant from "@common/constant";
import useTokens from "@common/hooks/useTokens";
import { FolderIcon } from "@common/icons";
import { convertToUnicode, baseFontSize, ListItemTitle, useCustomScrollbar } from "@common";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const BaniList = React.memo(({ data, onPress, isFolderScreen = false }) => {
  const { c, space, layout } = useTokens();
  const { scrollViewProps, Indicator } = useCustomScrollbar();
  const fontSize = useSelector((state) => state.fontSize);
  const fontFace = useSelector((state) => state.fontFace);
  const isTransliteration = useSelector((state) => state.isTransliteration);
  // `useWindowDimensions` re-renders on rotation, split-screen and foldable
  // unfold on its own. This replaced a `Dimensions.get` snapshot plus a manual
  // change listener and a piece of state that duplicated what the hook gives.
  const { width, height } = useWindowDimensions();
  const isPotrait = height >= width;
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
      const itemTextColor = c.textPrimary;
      const displayFont = !isTransliteration ? fontFace : null;

      // Rows are separated by a faint INSET hairline (see ItemSeparator below),
      // which is Apple's spec for a list: a light grey at low opacity starting
      // at the text margin, not a full-bleed rule. The original looked like
      // ruled paper because it drew a line edge-to-edge under every row AND
      // packed the rows tightly; the fix is both — inset the line and give the
      // rows room to breathe.
      const listItem = (
        <Pressable
          onPress={() => onPress(row)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            // The press tint is the only fill this row ever has, and only while
            // the finger is down.
            backgroundColor: pressed ? c.surfaceSelected : "transparent",
            paddingHorizontal: layout.screenGutter,
            paddingVertical: space.lg,
            // A minimum, so a long name or a raised font setting makes the row
            // taller rather than clipping it.
            minHeight: layout.row.minHeight,
          })}
        >
          {row.item.folder && <FolderIcon size={22} color={c.textSecondary} />}
          <View style={{ flex: 1, gap: space.xxs }}>
            <ListItemTitle
              title={getBaniTuk(row)}
              style={[
                { color: itemTextColor },
                {
                  fontSize: baseFontSize(fontSize, isTransliteration),
                  fontFamily: displayFont,
                },
              ]}
              // Wraps to a second line rather than shrinking. Shrink-to-fit
              // sized each name by its own string length, so the list rendered
              // at a dozen different sizes — and it silently overrode the
              // user's own font-size setting, which is the one thing this row
              // is supposed to honour.
              numberOfLines={2}
            />
            {row.item.tukGurmukhi && (
              <ListItemTitle
                title={row.item.tukGurmukhi}
                style={[{ color: c.textSecondary }, { fontFamily: displayFont }, { fontSize: 15 }]}
                numberOfLines={2}
              />
            )}
          </View>
        </Pressable>
      );

      return listItem;
    },
    [c, space, layout, fontSize, fontFace, isTransliteration]
  );

  // Drawn BETWEEN rows only — a FlatList separator never renders after the
  // last item, so the list ends on whitespace instead of a stray line.
  //
  // Inset by the SAME gutter on both sides, so it lines up with the row's text
  // on the left and stops short of the screen edge on the right. iOS insets
  // only the leading edge, which leaves the line running into the right edge
  // and reads as lopsided here. `layout.screenGutter` comes from the token
  // layer, so this tracks the row padding and scales with the device width
  // rather than being a fixed number.
  const ItemSeparator = useCallback(
    () => (
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: c.border,
          marginHorizontal: layout.screenGutter,
        }}
      />
    ),
    [c, layout]
  );

  return (
    // One flat ground, the same one the header sits on, so the list reads as a
    // continuation of the screen rather than a panel dropped onto it. It fills
    // the viewport so a short folder (e.g. Sawaiye) shows no seam.
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AnimatedFlatList
        style={!isPotrait && Platform.OS === "ios" && { marginLeft: 30 }}
        contentContainerStyle={{ paddingTop: space.sm, paddingBottom: space.xxl }}
        data={data}
        renderItem={renderBanis}
        ItemSeparatorComponent={ItemSeparator}
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
  // Defaulted in the signature; the lint rule cannot see through React.memo.
  // eslint-disable-next-line react/require-default-props
  isFolderScreen: PropTypes.bool,
};

export default BaniList;
