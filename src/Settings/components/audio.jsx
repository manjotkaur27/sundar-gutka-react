import React from "react";
import { View, LayoutAnimation, Platform } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { ListItem, Icon } from "@rneui/themed";
import {
  toggleAudioAutoPlay,
  toggleAutoDownload,
  toggleDownloadWifiOnly,
  toggleDownloadWarnMobileData,
} from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, ThemedSwitch, CustomText } from "@common";
import createStyles from "../styles";

const Audio = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dispatch   = useDispatch();
  const navigation = useNavigation();

  const isAudioAutoPlay        = useSelector((state) => state.isAudioAutoPlay);
  const autoDownloadOnStream   = useSelector((state) => state.autoDownloadOnStream);
  const downloadWifiOnly       = useSelector((state) => state.downloadWifiOnly);
  const downloadWarnMobileData = useSelector((state) => state.downloadWarnMobileData);

  const {
    AUDIO_AUTO_PLAY,
    MANAGE_DOWNLOADS,
    AUTO_DOWNLOAD_ON_STREAM,
    AUTO_DOWNLOAD_ON_STREAM_DESC,
    DOWNLOAD_WIFI_ONLY,
    DOWNLOAD_WIFI_ONLY_DESC,
    DOWNLOAD_WARN_MOBILE,
    DOWNLOAD_WARN_MOBILE_DESC,
  } = STRINGS;

  const handleToggleWifiOnly = (value) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    dispatch(toggleDownloadWifiOnly(value));
  };

  return (
    <View>
      {/* Existing: Audio Auto Play */}
      <ListItem
        bottomDivider
        containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
      >
        <View style={styles.iconContainerStyle}>
          <Icon color={theme.colors.primaryText} name="play-circle-outline" type="material" size={26} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={AUDIO_AUTO_PLAY} style={styles.listItemTitle} />
        </ListItem.Content>
        <ThemedSwitch
          value={isAudioAutoPlay}
          onValueChange={(value) => dispatch(toggleAudioAutoPlay(value))}
        />
      </ListItem>

      {/* Auto-download while streaming */}
      <ListItem
        bottomDivider
        containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
      >
        <View style={styles.iconContainerStyle}>
          <Icon color={theme.colors.primaryText} name="save-alt" type="material" size={26} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={AUTO_DOWNLOAD_ON_STREAM} style={styles.listItemTitle} />
          <CustomText style={styles.listItemSubtitle}>{AUTO_DOWNLOAD_ON_STREAM_DESC}</CustomText>
        </ListItem.Content>
        <ThemedSwitch
          value={autoDownloadOnStream}
          onValueChange={(value) => dispatch(toggleAutoDownload(value))}
        />
      </ListItem>

      {/* Manage Downloads → */}
      <ListItem
        bottomDivider
        containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
        onPress={() => navigation.navigate('ManageDownloads')}
      >
        <View style={styles.iconContainerStyle}>
          <Icon color={theme.colors.primaryText} name="file-download" type="material" size={26} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={MANAGE_DOWNLOADS} style={styles.listItemTitle} />
        </ListItem.Content>
        <ListItem.Chevron color={theme.colors.primaryText} />
      </ListItem>

      {/* Download over Wi-Fi only */}
      <ListItem
        bottomDivider
        containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
      >
        <View style={styles.iconContainerStyle}>
          <Icon color={theme.colors.primaryText} name="wifi" type="material" size={26} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={DOWNLOAD_WIFI_ONLY} style={styles.listItemTitle} />
          <CustomText style={styles.listItemSubtitle}>{DOWNLOAD_WIFI_ONLY_DESC}</CustomText>
        </ListItem.Content>
        <ThemedSwitch
          value={downloadWifiOnly}
          onValueChange={handleToggleWifiOnly}
        />
      </ListItem>

      {/* Warn when using mobile data — only shown when Wi-Fi only is OFF */}
      {!downloadWifiOnly && (
        <ListItem
          bottomDivider
          containerStyle={{ backgroundColor: theme.colors.surfaceGrey }}
        >
          <View style={styles.iconContainerStyle}>
            <Icon color={theme.colors.primaryText} name="data-usage" type="material" size={26} />
          </View>
          <ListItem.Content>
            <ListItemTitle title={DOWNLOAD_WARN_MOBILE} style={styles.listItemTitle} />
            <CustomText style={styles.listItemSubtitle}>{DOWNLOAD_WARN_MOBILE_DESC}</CustomText>
          </ListItem.Content>
          <ThemedSwitch
            value={downloadWarnMobileData}
            onValueChange={(v) => dispatch(toggleDownloadWarnMobileData(v))}
          />
        </ListItem>
      )}
    </View>
  );
};

export default Audio;
