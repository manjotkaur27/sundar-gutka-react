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

// A track is playable offline when it has a local copy. The authoritative source
// is the download registry (the same store the download button uses), keyed by
// the artist-relative path from the remote URL. The manifest's isLocallyDownloaded
// flag and an already-local audioUrl are accepted as fallbacks.
export const isOfflineAvailable = (track, downloadRegistry) => {
  const url = track?.remoteUrl || track?.audioUrl || "";
  const key = url ? getLocalTrackPath(url) : null;
  return Boolean(
    (key && downloadRegistry?.[key]) ||
      track?.isLocallyDownloaded ||
      (track?.audioUrl && !/^https?:\/\//i.test(track.audioUrl))
  );
};

const ScrollViewComponent = ({
  tracks,
  selectedTrack = null,
  playingTrack = null,
  isPlaying = false,
  previewLoadingTrackId = null,
  isOffline = false,
  handleSelectTrack,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(audioTrackDialogStyles);
  const downloadRegistry = useSelector((s) => s.downloadRegistry);
  return (
    <View style={styles.trackList}>
      {tracks.map((track) => {
        // Offline + not downloaded → greyed out and non-interactive.
        const unavailableOffline = isOffline && !isOfflineAvailable(track, downloadRegistry);
        return (
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
            unavailableOffline && styles.trackItemDisabled,
          ]}
          onPress={() => {
            if (!unavailableOffline) handleSelectTrack(track);
          }}
          disabled={unavailableOffline}
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
        );
      })}
    </View>
  );
};

ScrollViewComponent.defaultProps = {
  selectedTrack: null,
  playingTrack: null,
  isPlaying: false,
  previewLoadingTrackId: null,
  isOffline: false,
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
  isOffline: PropTypes.bool,
  handleSelectTrack: PropTypes.func.isRequired,
};

export default ScrollViewComponent;
