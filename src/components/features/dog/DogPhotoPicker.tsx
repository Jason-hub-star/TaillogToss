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

interface Props {
  uri?: string;
  onSelect: (uri: string) => void;
}

export function DogPhotoPicker({ uri, onSelect }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);

      // 1단계: 권한 확인 — notDetermined(최초)도 포함해서 다이얼로그 호출
      let permission = await fetchAlbumPhotos.getPermission();

      if (permission !== 'allowed') {
        permission = await fetchAlbumPhotos.openPermissionDialog();
      }

      if (permission !== 'allowed') {
        Alert.alert(
          '갤러리 접근 필요',
          '반려견 사진을 선택하려면 갤러리 접근 권한이 필요해요.\n설정에서 허용해주세요.',
          [{ text: '확인', style: 'cancel' }]
        );
        return;
      }

      // 2단계: 사진 선택 (1장, 로컬 file:// URI 반환)
      const images = await fetchAlbumPhotos({
        base64: false,
        maxCount: 1,
        maxWidth: 1024,
      });

      const first = images[0];
      if (first != null) {
        onSelect(first.dataUri);
      }
    } catch (error) {
      if (error instanceof FetchAlbumPhotosPermissionError) {
        Alert.alert('권한 필요', '갤러리 접근 권한을 허용해주세요.');
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
            <Text style={styles.emoji}>{'\uD83D\uDCF7'}</Text>
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
  emoji: {
    fontSize: 32,
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
