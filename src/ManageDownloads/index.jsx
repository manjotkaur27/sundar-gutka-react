import React, { useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View,
  SectionList,
  Pressable,
  Alert,
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
} from '@common';
import { BackIconComponent } from '@common/components';
import useTheme from '@common/context';
import useThemedStyles from '@common/hooks/useThemedStyles';
import { removeDownloadEntries, removeDownloadQueueEntry } from '@common/actions';
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
          sizeMB: task.sizeMB ?? 0,
          isQueued: true,
          queueStatus: task.status,
          progress: task.progress ?? 0,
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
    Alert.alert(
      STRINGS.DELETE_CONFIRM_TITLE,
      STRINGS.DELETE_CONFIRM_MESSAGE.replace('{count}', String(keys.length)) + sizeStr,
      [
        { text: STRINGS.cancel, style: 'cancel' },
        {
          text: STRINGS.delete,
          style: 'destructive',
          onPress: async () => {
            for (const key of keys) {
              const base = `${AUDIO_DIRECTORY_PATH}/${key}`;
              // eslint-disable-next-line no-await-in-loop
              await unlink(base).catch(() => {});
              // eslint-disable-next-line no-await-in-loop
              await unlink(base.replace(/\.m4a$/, '.json')).catch(() => {});
            }
            dispatch(removeDownloadEntries(keys));
            setSelected(new Set());
          },
        },
      ]
    );
  }, [selected, downloadRegistry, dispatch]);

  const cancelQueueEntry = useCallback((trackKey, displayName) => {
    Alert.alert(
      STRINGS.CANCEL_DOWNLOAD_TITLE,
      STRINGS.CANCEL_DOWNLOAD_BODY.replace('{title}', displayName ?? ''),
      [
        { text: STRINGS.cancel, onPress: () => dispatch(removeDownloadQueueEntry(trackKey)) },
        { text: STRINGS.ok, style: 'cancel' },
      ]
    );
  }, [dispatch]);

  const queueStatusLabel = (queueStatus, progress) => {
    if (queueStatus === 'downloading') return `${progress ?? 0}%`;
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
      return (
        <Pressable
          style={[styles.trackRow, styles.inProgressRow]}
          onPress={() => cancelQueueEntry(item.relativePath, item.artistDisplayName)}
        >
          <View style={styles.trackInfo}>
            <CustomText style={styles.trackName}>{item.baniTitle}</CustomText>
            <CustomText style={styles.trackMeta}>
              {queueStatusLabel(item.queueStatus, item.progress)}
            </CustomText>
          </View>
          <ActivityIndicator size="small" color={theme.colors.primary} />
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
          <CustomText style={styles.trackName}>{item.baniTitle}</CustomText>
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
          {/* Back button — matches AppBar's left side width */}
          <View style={headerStyles.leftSlot}>
            <BackIconComponent size={30} color={theme.colors.primaryText} onPress={handleBack} />
          </View>

          {/* Title — left-aligned with flex:1 so it never collides with actions */}
          <CustomText
            style={[
              headerStyles.title,
              { color: theme.colors.primaryText, fontFamily: theme.typography.fonts.balooPaajiSemiBold },
            ]}
            numberOfLines={1}
          >
            {STRINGS.MANAGE_DOWNLOADS}
          </CustomText>

          {/* Action buttons — shrink as needed, never overflow */}
          <View style={headerStyles.actions}>
            {selectableKeys.length > 0 && (
              <Pressable
                onPress={toggleSelectAll}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <CustomText style={[headerStyles.actionText, { color: theme.colors.primary }]} numberOfLines={1}>
                  {allSelected ? STRINGS.DESELECT_ALL : STRINGS.SELECT_ALL}
                </CustomText>
              </Pressable>
            )}
            {selected.size > 0 && (
              <Pressable
                onPress={confirmDelete}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <CustomText style={[headerStyles.actionText, { color: '#D32F2F' }]} numberOfLines={1}>
                  {STRINGS.DELETE_SELECTED} ({selected.size})
                </CustomText>
              </Pressable>
            )}
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
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ManageDownloads;
