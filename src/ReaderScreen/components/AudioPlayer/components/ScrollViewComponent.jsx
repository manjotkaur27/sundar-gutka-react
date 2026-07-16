import React, { useMemo } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSelector } from "react-redux";
import { Icon } from "@rneui/themed";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { PlayIcon, StopIcon } from "@common/icons";
import { CustomText, STRINGS } from "@common";
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

const byDisplayNameAlpha = (a, b) =>
  (a.displayName || "").localeCompare(b.displayName || "");

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

  // Downloaded tracks first (alphabetical), then non-downloaded (alphabetical) —
  // so offline-playable reciters are always easiest to find at the top.
  const { downloadedTracks, nonDownloadedTracks } = useMemo(() => {
    const downloaded = [];
    const nonDownloaded = [];
    tracks.forEach((track) => {
      if (isOfflineAvailable(track, downloadRegistry)) downloaded.push(track);
      else nonDownloaded.push(track);
    });
    downloaded.sort(byDisplayNameAlpha);
    nonDownloaded.sort(byDisplayNameAlpha);
    return { downloadedTracks: downloaded, nonDownloadedTracks: nonDownloaded };
  }, [tracks, downloadRegistry]);

  const renderTrack = (track) => {
    const downloaded = isOfflineAvailable(track, downloadRegistry);
    // Offline + not downloaded → greyed out and non-interactive.
    const unavailableOffline = isOffline && !downloaded;
    const isSelected = selectedTrack && track.id === selectedTrack.id;
    const rightIconColor = isSelected ? theme.staticColors.WHITE_COLOR : theme.colors.audioPlayer;
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

        <View style={styles.trackItemRight}>
          {/* Offline tick: shown for already-downloaded tracks, sitting between
            the artist name and the play control. */}
          {downloaded && (
            <Icon
              name="offline-pin"
              type="material"
              size={20}
              color={isSelected ? theme.staticColors.WHITE_COLOR : theme.colors.primary}
            />
          )}
          {previewLoadingTrackId && previewLoadingTrackId === track.id ? (
            <ActivityIndicator size="small" color={rightIconColor} />
          ) : playingTrack && playingTrack.id === track.id && isPlaying ? (
            <StopIcon size={30} color={rightIconColor} />
          ) : (
            <PlayIcon size={30} color={rightIconColor} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.trackList}
      contentContainerStyle={styles.trackListContent}
      showsVerticalScrollIndicator
      indicatorStyle={theme.mode === "dark" ? "white" : "black"}
      nestedScrollEnabled
    >
      {downloadedTracks.length > 0 && (
        <>
          <CustomText style={styles.trackSectionHeader}>{STRINGS.DOWNLOADED}</CustomText>
          {downloadedTracks.map(renderTrack)}
        </>
      )}
      {nonDownloadedTracks.length > 0 && (
        <>
          <CustomText style={styles.trackSectionHeader}>{STRINGS.NOT_DOWNLOADED}</CustomText>
          {nonDownloadedTracks.map(renderTrack)}
        </>
      )}
    </ScrollView>
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
