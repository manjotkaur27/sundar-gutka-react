import React, { useEffect, useState } from "react";
import { View, Image, Linking, Pressable } from "react-native";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import useThemedStyles from "@common/hooks/useThemedStyles";
import useTokens from "@common/hooks/useTokens";
import {
  constant,
  actions,
  checkForBaniDBUpdate,
  logError,
  StatusBarComponent,
  SafeArea,
  GradientDivider,
  CustomText,
  STRINGS,
} from "@common";
import { ScreenHeader } from "../common/components/ui";
import BaniDBAbout from "./components/baniDBAbout";
import CheckUpdatesAnimation from "./components/checkUpdate";
import DownloadComponent from "./components/Download";
import createStyles from "./styles";

const DatabaseUpdateScreen = ({ navigation }) => {
  const { c } = useTokens();
  const styles = useThemedStyles(createStyles);
  const baniDBLogoFull = require("../../images/banidblogo.png");
  const [isLoading, setIsLoading] = useState(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const dispatch = useDispatch();

  const checkForUpdates = async () => {
    try {
      setIsLoading(true);
      const needUpdate = await checkForBaniDBUpdate();
      setIsUpdateAvailable(needUpdate);
      setIsLoading(false);
      dispatch(actions.toggleDatabaseUpdateAvailable(needUpdate));
    } catch (error) {
      dispatch(actions.toggleDatabaseUpdateAvailable(false));
      logError(error);
      setIsLoading(false);
    }
  };
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <SafeArea backgroundColor={c.background} edges={["bottom"]}>
      <StatusBarComponent backgroundColor={c.background} />
      <ScreenHeader
        title={STRINGS.databaseUpdate}
        onBack={() => navigation.goBack()}
        backAccessibilityLabel={STRINGS.GO_BACK}
        showBorder={false}
      />
      <GradientDivider />
      <View style={styles.mainWrapper}>
        <CheckUpdatesAnimation isLoading={isLoading} isUpdateAvailable={isUpdateAvailable} />
        {!isLoading && isUpdateAvailable && <DownloadComponent />}
        <Pressable onPress={() => Linking.openURL(constant.BANI_DB_URL)}>
          <View style={styles.baniDBContainer}>
            <Image source={baniDBLogoFull} style={styles.baniDBImage} />
            <CustomText style={styles.baniDBText}>{STRINGS.BANI_DB}</CustomText>
          </View>
        </Pressable>
        <BaniDBAbout />
      </View>
    </SafeArea>
  );
};

DatabaseUpdateScreen.propTypes = { navigation: PropTypes.shape().isRequired };

export default DatabaseUpdateScreen;
