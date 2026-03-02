/**
 * SkeletonLoader — Lottie 기반 고급 로딩 컴포넌트
 * 데이터 로딩(isLoading) 상태에서 보여줄 토스 스타일 UI
 * Parity: UIUX-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LottieAnimation, type LottieAssetKey } from './LottieAnimation';
import { colors, typography } from 'styles/tokens';

interface Props {
  /** 표시할 메시지 (기본: '불러오는 중...') */
  message?: string;
  /** Lottie 에셋 키 (기본: 'cute-doggie') */
  asset?: LottieAssetKey;
  /** 애니메이션 크기 (기본: 160) */
  size?: number;
}

export function SkeletonLoader({
  message = '불러오는 중...',
  asset = 'cute-doggie',
  size = 160,
}: Props) {
  return (
    <View style={styles.container}>
      <LottieAnimation asset={asset} size={size} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingBottom: 80, // 하단 탭바 고려 중앙 정렬
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
});
