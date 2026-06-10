import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { PlayIcon, StopIcon } from "@common/icons";
import { CustomText } from "@common";
import { audioTrackDialogStyles } from "../style";
import { getLocalTrackPath } from "../utils/audioDownloader";

const ScrollViewComponent = ({
  tracks,
  selectedTrack = null,
  playingTrack = null,
  isPlaying = false,
  previewLoadingTrackId = null,
  handleSelectTrack,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(audioTrackDialogStyles);
  const downloadQueue = useSelector((s) => s.downloadQueue);
  return (
    <View style={styles.trackList}>
      {tracks.map((track) => (
        <Pressable
          key={track.id}
          style={[
            styles.trackItem,
            {
              backgroundColor: theme.colors.trackBackgroundColor,
              borderColor: theme.mode === "dark" ? theme.staticColors.NIGHT_BLACK : "transparent",
              borderWidth: 1,
            },
            selectedTrack && track.id === selectedTrack?.id && styles.selectedTrackItem,
          ]}
          onPress={() => handleSelectTrack(track)}
          activeOpacity={0.7}
        >
          <CustomText
            style={[
              styles.trackName,
              {
                color: theme.colors.audioTitleText,
              },
              selectedTrack && track.id === selectedTrack.id && styles.selectedTrackName,
            ]}
          >
            {track.displayName}
          </CustomText>

          {/* Show spinner while actively downloading/queued */}
          {track.audioUrl && (() => {
            const tk = getLocalTrackPath(track.audioUrl);
            if (downloadQueue[tk]?.status === 'downloading' || downloadQueue[tk]?.status === 'queued') {
              return (
                <ActivityIndicator
                  size="small"
                  color={
                    selectedTrack && selectedTrack.id === track.id
                      ? theme.staticColors.WHITE_COLOR
                      : theme.colors.primary
                  }
                  style={{ marginRight: 4 }}
                />
              );
            }
            return null;
          })()}

          {previewLoadingTrackId && previewLoadingTrackId === track.id ? (
            <ActivityIndicator
              size="small"
              color={
                selectedTrack && selectedTrack.id === track.id
                  ? theme.staticColors.WHITE_COLOR
                  : theme.colors.audioPlayer
              }
            />
          ) : playingTrack && playingTrack.id === track.id && isPlaying ? (
            <StopIcon
              size={30}
              color={
                selectedTrack && selectedTrack.id === track.id
                  ? theme.staticColors.WHITE_COLOR
                  : theme.colors.audioPlayer
              }
            />
          ) : (
            <PlayIcon
              size={30}
              color={
                selectedTrack && selectedTrack.id === track.id
                  ? theme.staticColors.WHITE_COLOR
                  : theme.colors.audioPlayer
              }
            />
          )}
        </Pressable>
      ))}
    </View>
  );
};

ScrollViewComponent.defaultProps = {
  selectedTrack: null,
  playingTrack: null,
  isPlaying: false,
  previewLoadingTrackId: null,
};

ScrollViewComponent.propTypes = {
  tracks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      displayName: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedTrack: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
  }),
  playingTrack: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
  }),
  isPlaying: PropTypes.bool,
  previewLoadingTrackId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleSelectTrack: PropTypes.func.isRequired,
};

export default ScrollViewComponent;
