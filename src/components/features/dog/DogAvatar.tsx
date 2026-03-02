/**
 * DogAvatar — 반려견 프로필 아바타 컴포넌트
 * 사진이 있으면 사진을, 없으면 이모지/로티 폴백 표시
 */
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { LottieAnimation } from '../../shared/LottieAnimation';

interface Props {
  /** 프로필 이미지 URL */
  uri?: string | null;
  /** 표시 크기 (기본: 40) */
  size?: number;
  /** 사진 없을 때 보여줄 폴백 유형 (기본: 'emoji') */
  fallback?: 'emoji' | 'lottie';
}

export function DogAvatar({ uri, size = 40, fallback = 'emoji' }: Props) {
  const borderRadius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, { width: size, height: size, borderRadius }]}
      />
    );
  }

  return (
    <View style={[styles.base, styles.fallback, { width: size, height: size, borderRadius }]}>
      {fallback === 'emoji' ? (
        <Text style={{ fontSize: size * 0.5 }}>{'\uD83D\uDC36'}</Text>
      ) : (
        <LottieAnimation asset="cute-doggie" size={size * 0.8} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.divider,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
