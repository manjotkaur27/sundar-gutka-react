import React, { useEffect } from "react";
import { BackIconComponent, AppBar } from "@common/components";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS } from "@common";
import createStyles from "../styles";

const useHeader = (navigation) => {
  const { theme } = useTheme();
  const { headerTitleStyle, headerStyle } = useThemedStyles(createStyles);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const AppBarComponent = (
    <AppBar
      title={STRINGS.about}
      backgroundColor={headerStyle?.backgroundColor}
      titleColor={headerTitleStyle?.color}
      titleStyle={{ fontFamily: headerTitleStyle?.fontFamily }}
      leftComponent={
        <BackIconComponent size={30} color={theme.staticColors.WHITE_COLOR} />
      }
    />
  );

  return AppBarComponent;
};

export default useHeader;
