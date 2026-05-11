/**
 * DogPhotoPicker — 반려견 사진 선택 컴포넌트
 * @apps-in-toss/native-modules fetchAlbumPhotos 실 SDK 연동
 * onSelect(localFileUri) → profile.tsx handleSave → uploadDogProfileImage → Supabase Storage
 */
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { FetchAlbumPhotosPermissionError } from '@apps-in-toss/types';
import { colors, typography } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';

interface Props {
  uri?: string;
  onSelect: (uri: string) => void;
}

const DEV_FALLBACK_PHOTO_URI = ICONS['ic-dog'] ?? '';

function isPermissionLikeError(error: unknown): boolean {
  if (error instanceof FetchAlbumPhotosPermissionError) return true;

  const message = error instanceof Error ? error.message : String(error);
  return /permission|denied|READ_MEDIA|READ_EXTERNAL|SecurityException/i.test(message);
}

export function DogPhotoPicker({ uri, onSelect }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);

      // fetchAlbumPhotos 내부에서 권한 확인과 요청을 한 번만 처리한다.
      const images = await fetchAlbumPhotos({
        base64: false,
        maxCount: 1,
        maxWidth: 1024,
      });

      const first = images[0];
      if (first != null) {
        onSelect(first.dataUri);
        return;
      }

      if (__DEV__) {
        console.info('[DogPhotoPicker] photo selection cancelled or empty');
      }
    } catch (error) {
      if (isPermissionLikeError(error)) {
        if (__DEV__) console.warn('[DogPhotoPicker] photo permission unavailable:', error);
        if (__DEV__) {
          Alert.alert(
            '개발용 사진 선택 제한',
            '개발용 Toss 앱은 앨범 권한이 없어 실제 사진 선택이 막혀요.\n업로드 흐름은 테스트 사진으로 계속 확인할 수 있어요.',
            [
              { text: '취소', style: 'cancel' },
              { text: '테스트 사진 사용', onPress: () => onSelect(DEV_FALLBACK_PHOTO_URI) },
            ],
          );
        } else {
          Alert.alert(
            '사진 접근 권한 필요',
            '사진을 선택하려면 Toss 앱의 사진 접근 권한이 필요해요.\n허용 후 다시 시도해주세요.',
          );
        }
      } else {
        console.error('[DogPhotoPicker] fetchAlbumPhotos error:', error);
        Alert.alert('사진 선택 실패', '다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.picker}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color={colors.primaryBlue} />
          </View>
        ) : uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Image source={{ uri: ICONS['ic-dog'] }} style={styles.placeholderIcon} resizeMode="contain" />
          </View>
        )}
        {!isLoading && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>+</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.hint}>
        {isLoading ? '사진 불러오는 중...' : '반려견 사진을 등록해주세요'}
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
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
