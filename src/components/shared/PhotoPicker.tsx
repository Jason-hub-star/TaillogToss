/**
 * PhotoPicker — AIT album picker wrapper for local image preview flows.
 * Parity: APP-001, B2B-001
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import { fetchAlbumPhotos, FetchAlbumPhotosPermissionError } from '@apps-in-toss/framework';
import { colors, typography } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';

interface PhotoPickerProps {
  uri?: string;
  onSelect: (uri: string) => void;
  hint?: string;
  loadingHint?: string;
  permissionTitle?: string;
  permissionMessage?: string;
  devFallbackTitle?: string;
  devFallbackMessage?: string;
  fallbackUri?: string;
  placeholderUri?: string;
  size?: number;
  borderRadius?: number;
}

function isPermissionLikeError(error: unknown): boolean {
  if (error instanceof FetchAlbumPhotosPermissionError) return true;

  const message = error instanceof Error ? error.message : String(error);
  return /permission|denied|osPermissionDenied|READ_MEDIA|READ_EXTERNAL|SecurityException/i.test(message);
}

function toPreviewUri(dataUri: string, base64: boolean): string {
  if (!base64 || dataUri.startsWith('data:')) return dataUri;
  return `data:image/jpeg;base64,${dataUri}`;
}

async function promptPhotoPermissionIfNeeded(): Promise<void> {
  const current = await fetchAlbumPhotos.getPermission();
  if (current === 'allowed') return;

  if (String(current) === 'osPermissionDenied') {
    throw new FetchAlbumPhotosPermissionError();
  }

  await fetchAlbumPhotos.openPermissionDialog();
}

async function fetchFirstPhoto(): Promise<string | null> {
  const attempts = [
    { base64: true, maxCount: 2, maxWidth: 720 },
    { base64: false, maxCount: 2, maxWidth: 1024 },
    { base64: true, maxWidth: 720 },
  ];
  let lastError: unknown;

  for (const options of attempts) {
    try {
      const images = await fetchAlbumPhotos(options);
      const first = images[0];
      if (first?.dataUri) return toPreviewUri(first.dataUri, options.base64);
      return null;
    } catch (error) {
      if (isPermissionLikeError(error)) throw error;
      lastError = error;
      if (__DEV__) console.warn('[PhotoPicker] fetchAlbumPhotos attempt failed:', options, error);
    }
  }

  throw lastError;
}

export function PhotoPicker({
  uri,
  onSelect,
  hint = '사진을 등록해주세요',
  loadingHint = '사진을 불러오고 있어요',
  permissionTitle = '사진 접근 권한 필요',
  permissionMessage = '사진을 선택하려면 Toss 앱의 사진 접근 권한이 필요해요.\n허용한 뒤 다시 시도해주세요.',
  devFallbackTitle = '개발용 사진 선택 제한',
  devFallbackMessage = '개발용 Toss 앱은 앨범 권한이 없어 실제 사진 선택이 막혀요.\n업로드 흐름은 테스트 사진으로 계속 확인할 수 있어요.',
  fallbackUri = ICONS['ic-dog'] ?? '',
  placeholderUri = ICONS['ic-dog'] ?? '',
  size = 100,
  borderRadius = size / 2,
}: PhotoPickerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);

      await promptPhotoPermissionIfNeeded();
      const selectedUri = await fetchFirstPhoto();
      if (selectedUri != null) {
        onSelect(selectedUri);
        return;
      }

      if (__DEV__) {
        if (__DEV__) console.info('[PhotoPicker] photo selection cancelled or empty');
      }
    } catch (error) {
      if (isPermissionLikeError(error)) {
        if (__DEV__) console.warn('[PhotoPicker] photo permission unavailable:', error);
        if (__DEV__ && fallbackUri) {
          Alert.alert(
            devFallbackTitle,
            devFallbackMessage,
            [
              { text: '취소', style: 'cancel' },
              { text: '테스트 사진 사용', onPress: () => onSelect(fallbackUri) },
            ],
          );
        } else {
          Alert.alert(permissionTitle, permissionMessage);
        }
      } else {
        if (__DEV__) console.error('[PhotoPicker] fetchAlbumPhotos error:', error);
        Alert.alert('사진을 선택하지 못했어요', '다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          { width: size, height: size, borderRadius },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color={colors.primaryBlue} />
          </View>
        ) : uri ? (
          <Image source={{ uri }} style={[styles.image, { borderRadius }]} />
        ) : (
          <View style={styles.placeholder}>
            <Image source={{ uri: placeholderUri }} style={styles.placeholderIcon} resizeMode="contain" />
          </View>
        )}
        {!isLoading && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>+</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.hint}>
        {isLoading ? loadingHint : hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  picker: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 42,
    height: 42,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 18,
  },
  hint: {
    marginTop: 12,
    ...typography.detail,
    color: colors.textSecondary,
  },
});
