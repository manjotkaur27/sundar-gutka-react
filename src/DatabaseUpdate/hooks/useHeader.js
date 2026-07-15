import React, { useEffect } from "react";
import { BackIconComponent, AppBar } from "@common/components";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS } from "@common";
import createStyles from "../styles";

const useHeader = (navigation) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const AppBarComponent = (
    <AppBar
      title={STRINGS.databaseUpdate}
      backgroundColor={styles.headerStyle?.backgroundColor}
      titleColor={styles.headerTitleStyle?.color}
      titleStyle={{ fontFamily: theme.typography.fonts.balooPaajiSemiBold }}
      leftComponent={<BackIconComponent size={30} color={theme.staticColors.WHITE_COLOR} />}
    />
  );

  return AppBarComponent;
};

export default useHeader;
