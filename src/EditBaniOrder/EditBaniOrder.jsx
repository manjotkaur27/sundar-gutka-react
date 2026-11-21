import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import DraggableFlatList, {
  ShadowDecorator,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSelector, useDispatch, batch } from "react-redux";
import useBaniTitle from "@common/hooks/useBaniTitle";
import useTokens from "@common/hooks/useTokens";
import useTokenStyles from "@common/hooks/useTokenStyles";
import {
  defaultBaniOrder,
  actions,
  constant,
  logMessage,
  SafeArea,
  StatusBarComponent,
  CustomText,
} from "@common";
import Header from "./components/Header";
import { activeColor, createStyles } from "./styles";

const EditBaniOrder = () => {
  logMessage(constant.EDIT_BANI_ORDER);
  const { c } = useTokens();
  const styles = useTokenStyles(createStyles);
  // Named, sized and set in the same face as on the home bani list, so turning
  // transliteration on shows the same script on both screens.
  const { titleFor, titleFontFamily, titleSize } = useBaniTitle();
  const baniList = useSelector((state) => state.baniList);
  const baniOrder = useSelector((state) => state.baniOrder);
  const [isReset, setReset] = useState(false);

  const [baniListData, setBaniListData] = useState(
    baniList.filter((item) => item.id !== undefined)
  );

  const [folders] = useState(baniList.filter((item) => item.id === undefined));
  const [folderOrderIds] = useState(baniOrder.baniOrder.filter((item) => item.id === undefined));
  const [orderData, setOrderData] = useState(
    baniOrder.baniOrder.filter((item) => item.id !== undefined)
  );

  const { rowItem, text } = styles;
  const titleStyle = useMemo(
    () => [text, { fontFamily: titleFontFamily, fontSize: titleSize }],
    [text, titleFontFamily, titleSize]
  );
  const dispatch = useDispatch();

  // Inset hairline between rows, same as the bani list. Never after the last
  // row, so the list ends on whitespace. Defined with useCallback so the list
  // is not handed a brand-new component type on every render.
  const Separator = useCallback(() => <View style={styles.separator} />, [styles]);

  const renderItem = useCallback(
    ({ item, drag, isActive }) => {
      const activeStyle = activeColor(isActive, item.backgroundColor, c);
      return (
        <ShadowDecorator>
          <ScaleDecorator>
            <Pressable activeOpacity={1} onLongPress={drag} disabled={isActive} style={activeStyle}>
              <View key={item.id} style={rowItem}>
                <CustomText style={titleStyle}>{titleFor(item)}</CustomText>
              </View>
            </Pressable>
          </ScaleDecorator>
        </ShadowDecorator>
      );
    },
    [rowItem, titleStyle, titleFor, c]
  );

  useEffect(() => {
    if (!isReset) {
      return;
    }
    dispatch(actions.setBaniOrder({ baniOrder: defaultBaniOrder.baniOrder }));
    const banis = [];
    if (defaultBaniOrder?.baniOrder?.length > 0) {
      defaultBaniOrder.baniOrder.forEach((element) => {
        if (element.id) {
          const baniItem = baniList.find((item) => item.id === element.id);
          if (baniItem) {
            banis.push({
              id: baniItem.id,
              gurmukhi: baniItem.gurmukhi,
              translit: baniItem.translit,
            });
          }
        }
      });
      setOrderData(defaultBaniOrder.baniOrder.filter((item) => item.id !== undefined));
    }

    setBaniListData(banis.filter((item) => item.id !== undefined));
    setReset(false);
  }, [isReset]);

  useEffect(() => {
    if (baniListData.length > 0) {
      const newData = [...baniListData, ...folders];
      const newIds = [...orderData, ...folderOrderIds];
      batch(() => {
        dispatch(actions.setBaniList(newData));
        dispatch(actions.setBaniOrder({ baniOrder: newIds }));
      });
    }
  }, [baniListData, orderData]);

  const handleDragEnd = ({ data }) => {
    const ids = data.map((item) => {
      return { id: item.id };
    });
    setBaniListData(data);
    setOrderData(ids);
  };
  return (
    <SafeArea backgroundColor={c.background} edges={["bottom"]}>
      <StatusBarComponent backgroundColor={c.background} />
      <Header setReset={setReset} />
      <GestureHandlerRootView style={styles.gestureHandlerRootView}>
        <DraggableFlatList
          data={baniListData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          onDragEnd={handleDragEnd}
        />
      </GestureHandlerRootView>
    </SafeArea>
  );
};

export default EditBaniOrder;
