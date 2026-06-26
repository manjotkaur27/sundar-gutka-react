import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View,
  SectionList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Icon } from '@rneui/themed';
import { exists, unlink } from 'react-native-fs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SafeArea,
  StatusBarComponent,
  GradientDivider,
  useBackHandler,
  STRINGS,
  CustomText,
  showConfirm,
} from '@common';
import { BackIconComponent } from '@common/components';
import useTheme from '@common/context';
import useThemedStyles from '@common/hooks/useThemedStyles';
import { removeDownloadEntries, removeDownloadQueueEntry, retryDownload } from '@common/actions';
import { AUDIO_DIRECTORY_PATH } from '../ReaderScreen/components/AudioPlayer/utils/audioDownloader';
import createStyles from './styles';

const formatMB = (mb) => {
  if (!mb || mb <= 0) return '?';
  return mb >= 100 ? String(Math.round(mb)) : mb.toFixed(1);
};

const ManageDownloads = ({ navigation }) => {
  const { theme }  = useTheme();
  const styles     = useThemedStyles(createStyles);
  const dispatch   = useDispatch();

  const downloadRegistry = useSelector((s) => s.downloadRegistry);
  const downloadQueue    = useSelector((s) => s.downloadQueue);

  const [selected, setSelected]   = useState(new Set());
  const [validated, setValidated] = useState(false);

  // Tell the native stack to hide its own header — we render AppBar ourselves.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
    return true;
  }, [navigation]);

  useBackHandler(handleBack);

  // On mount: silently remove stale registry entries (file deleted externally).
  useEffect(() => {
    const validate = async () => {
      const stale = [];
      for (const key of Object.keys(downloadRegistry)) {
        const fullPath = `${AUDIO_DIRECTORY_PATH}/${key}`;
        // eslint-disable-next-line no-await-in-loop
        const fileExists = await exists(fullPath).catch(() => false);
        if (!fileExists) stale.push(key);
      }
      if (stale.length > 0) dispatch(removeDownloadEntries(stale));
      setValidated(true);
    };
    validate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SectionList data: completed entries grouped by artist, plus in-progress queue items.
  const sections = useMemo(() => {
    const byArtist = {};
    Object.entries(downloadRegistry).forEach(([relativePath, entry]) => {
      const artist = entry.artistDisplayName || 'Unknown';
      if (!byArtist[artist]) byArtist[artist] = [];
      byArtist[artist].push({ ...entry, relativePath, isQueued: false });
    });
    Object.entries(downloadQueue).forEach(([trackKey, task]) => {
      if (task.status === 'completed') return;
      const artist = task.displayName || 'Unknown';
      if (!byArtist[artist]) byArtist[artist] = [];
      if (!byArtist[artist].find((t) => t.relativePath === trackKey)) {
        byArtist[artist].push({
          relativePath: trackKey,
          artistDisplayName: artist,
          baniTitle: task.baniTitle || trackKey,
          baniNameUni: task.baniNameUni,
          sizeMB: task.sizeMB ?? 0,
          isQueued: true,
          queueStatus: task.status,
          progress: task.progress ?? 0,
          errorMessage: task.errorMessage ?? null,
        });
      }
    });
    return Object.entries(byArtist)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => (a.baniTitle ?? '').localeCompare(b.baniTitle ?? '')),
      }));
  }, [downloadRegistry, downloadQueue]);

  const totalTracks = Object.keys(downloadRegistry).length;
  const totalMB = Object.values(downloadRegistry).reduce((s, e) => s + (e.sizeMB ?? 0), 0);

  const selectableKeys = useMemo(() => {
    const keys = [];
    sections.forEach((sec) => sec.data.forEach((item) => { if (!item.isQueued) keys.push(item.relativePath); }));
    return keys;
  }, [sections]);

  const allSelected = selectableKeys.length > 0 && selectableKeys.every((k) => selected.has(k));

  const toggleSelectAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(selectableKeys));
  }, [allSelected, selectableKeys]);

  const toggleSelect = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const confirmDelete = useCallback(() => {
    const keys = [...selected];
    const deletedMB = keys.reduce((s, k) => s + (downloadRegistry[k]?.sizeMB ?? 0), 0);
    const sizeStr = deletedMB > 0 ? ` (${formatMB(deletedMB)} MB)` : '';
    showConfirm({
      title: STRINGS.DELETE_CONFIRM_TITLE,
      message: STRINGS.DELETE_CONFIRM_MESSAGE.replace('{count}', String(keys.length)) + sizeStr,
      cancelText: STRINGS.cancel,
      confirmText: STRINGS.delete,
      destructive: true,
      onConfirm: async () => {
        await Promise.all(keys.map(async (key) => {
          const base = `${AUDIO_DIRECTORY_PATH}/${key}`;
          await unlink(base).catch(() => {});
          await unlink(base.replace(/\.m4a$/, '.json')).catch(() => {});
        }));
        dispatch(removeDownloadEntries(keys));
        setSelected(new Set());
      },
    });
  }, [selected, downloadRegistry, dispatch]);

  const cancelQueueEntry = useCallback((trackKey, displayName) => {
    showConfirm({
      title: STRINGS.CANCEL_DOWNLOAD_TITLE,
      message: STRINGS.CANCEL_DOWNLOAD_BODY.replace('{title}', displayName ?? ''),
      cancelText: STRINGS.CANCEL_DOWNLOAD_KEEP,
      confirmText: STRINGS.CANCEL_DOWNLOAD_CONFIRM,
      destructive: true,
      onConfirm: () => dispatch(removeDownloadQueueEntry(trackKey)),
    });
  }, [dispatch]);

  // Tapping a failed row retries it (matching the player's DownloadButton). A
  // storage failure can't be retried away, so we explain that instead.
  const retryQueueEntry = useCallback((item) => {
    if (item.errorMessage === 'NOT_ENOUGH_STORAGE') {
      showConfirm({
        title: STRINGS.NOT_ENOUGH_STORAGE_TITLE,
        message: STRINGS.NOT_ENOUGH_STORAGE_BODY,
        confirmText: STRINGS.ok,
      });
      return;
    }
    dispatch(retryDownload(item.relativePath));
  }, [dispatch]);

  const queueStatusLabel = (queueStatus) => {
    if (queueStatus === 'downloading') return STRINGS.DOWNLOADING;
    if (queueStatus === 'paused_wifi_only') return STRINGS.DOWNLOAD_PAUSED_WIFI;
    if (queueStatus === 'paused_no_network') return STRINGS.DOWNLOAD_WAITING_NETWORK;
    if (queueStatus === 'failed') return STRINGS.DOWNLOAD_FAILED_RETRY;
    return STRINGS.DOWNLOAD_QUEUED;
  };

  const renderSectionHeader = useCallback(({ section }) => (
    <CustomText style={styles.sectionHeader}>{section.title.toUpperCase()}</CustomText>
  ), [styles]);

  const renderItem = useCallback(({ item }) => {
    if (item.isQueued) {
      const isFailed = item.queueStatus === 'failed';
      return (
        <Pressable
          style={[styles.trackRow, styles.inProgressRow]}
          onPress={() =>
            isFailed
              ? retryQueueEntry(item)
              : cancelQueueEntry(item.relativePath, item.artistDisplayName)
          }
        >
          <View style={styles.trackInfo}>
            {/* Prefer the Unicode name so it renders in Baloo regardless of the
                font selected when it was downloaded (legacy ASCII title would
                otherwise show as Latin gibberish in this list). */}
            <CustomText style={styles.trackName}>{item.baniNameUni || item.baniTitle}</CustomText>
            <CustomText style={styles.trackMeta}>
              {queueStatusLabel(item.queueStatus)}
            </CustomText>
          </View>
          {isFailed ? (
            <Icon name="error-outline" type="material" size={22} color="#D32F2F" />
          ) : (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}
        </Pressable>
      );
    }

    const isChecked = selected.has(item.relativePath);
    return (
      <Pressable
        style={[styles.trackRow, isChecked && styles.trackRowChecked]}
        onPress={() => toggleSelect(item.relativePath)}
      >
        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
          {isChecked && (
            <Icon name="check" type="material" size={14} color={theme.staticColors.WHITE_COLOR} />
          )}
        </View>
        <View style={styles.trackInfo}>
          <CustomText style={styles.trackName}>{item.baniNameUni || item.baniTitle}</CustomText>
        </View>
        {item.sizeMB > 0 && (
          <CustomText style={styles.trackSize}>{formatMB(item.sizeMB)} MB</CustomText>
        )}
      </Pressable>
    );
  }, [selected, toggleSelect, cancelQueueEntry, styles, theme]);

  const { top: safeTop } = useSafeAreaInsets();
  const isEmpty = sections.length === 0 && validated;

  return (
    <SafeArea backgroundColor={theme.colors.surface} edges={['left', 'right']}>
      <StatusBarComponent backgroundColor={theme.colors.surface} />

      {/* Custom header — same visual as AppBar but right side has flex space
          for the action buttons, avoiding AppBar's fixed 48px side constraint. */}
      <View
        style={[
          headerStyles.bar,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: safeTop,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 2,
          },
        ]}
      >
        <View style={headerStyles.row}>
          {/* Back button */}
          <View style={headerStyles.leftSlot}>
            <BackIconComponent size={30} color={theme.colors.primaryText} onPress={handleBack} />
          </View>

          {/* Spacer — pushes actions to the right */}
          <View style={{ flex: 1 }} />

          {/* Action buttons — compact icon buttons (not text labels) so their
              footprint stays small and fixed, leaving the absolutely-centered
              title room to breathe regardless of how many actions are shown. */}
          <View style={headerStyles.actions}>
            {selectableKeys.length > 0 && (
              <Pressable
                onPress={toggleSelectAll}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={allSelected ? STRINGS.DESELECT_ALL : STRINGS.SELECT_ALL}
              >
                <Icon
                  name={allSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  type="material-community"
                  size={24}
                  color={theme.colors.primary}
                />
              </Pressable>
            )}
            {selected.size > 0 && (
              <Pressable
                onPress={confirmDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`${STRINGS.delete} (${selected.size})`}
                style={headerStyles.deleteButton}
              >
                <Icon name="delete-outline" type="material-community" size={24} color="#D32F2F" />
                <View style={headerStyles.deleteBadge}>
                  <CustomText style={headerStyles.deleteBadgeText}>{selected.size}</CustomText>
                </View>
              </Pressable>
            )}
          </View>

          {/* Title — absolutely centered across the full bar width, z-above spacer */}
          <View style={headerStyles.titleWrap} pointerEvents="none">
            <CustomText
              style={[
                headerStyles.title,
                { color: theme.colors.primaryText, fontFamily: theme.typography.fonts.balooPaajiSemiBold },
              ]}
              numberOfLines={1}
            >
              {STRINGS.MANAGE_DOWNLOADS}
            </CustomText>
          </View>
        </View>
      </View>

      <GradientDivider />

      {totalTracks > 0 && (
        <CustomText style={styles.summaryText}>
          {STRINGS.TOTAL_DOWNLOADS_LABEL
            .replace('{count}', String(totalTracks))
            .replace('{size}', formatMB(totalMB))}
        </CustomText>
      )}

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="cloud-off"
            type="material"
            size={72}
            color={theme.colors.textDisabled}
          />
          <CustomText style={styles.emptyTitle}>{STRINGS.NO_DOWNLOADS}</CustomText>
          <CustomText style={styles.emptyHint}>{STRINGS.DOWNLOAD_OFFLINE_HINT}</CustomText>
        </View>
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={(item) => item.relativePath}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeArea>
  );
};

// Static styles for the custom header (don't need theme — colors passed inline).
const headerStyles = StyleSheet.create({
  bar: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 8,
  },
  leftSlot: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingRight: 4,
  },
  deleteButton: {
    position: 'relative',
  },
  deleteBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  deleteBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default ManageDownloads;
