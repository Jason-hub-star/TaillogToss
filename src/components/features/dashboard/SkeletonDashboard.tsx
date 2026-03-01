/**
 * SkeletonDashboard — 대시보드 로딩 스켈레톤
 * Lottie(jackie) + DogCard + StreakBanner + LogCard×3 구조 유지.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { colors, typography, spacing } from 'styles/tokens';

export function SkeletonDashboard() {
  return (
    <View style={styles.container}>
      <View style={styles.lottieHeader}>
        <LottieAnimation asset="jackie" size={80} />
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>

      {/* DogCard placeholder */}
      <SkeletonBox width="100%" height={80} borderRadius={16} />

      {/* StreakBanner placeholder */}
      <SkeletonBox width="100%" height={48} borderRadius={12} style={styles.gap} />

      {/* "최근 기록" header */}
      <SkeletonBox width={80} height={16} borderRadius={4} style={styles.sectionGap} />

      {/* LogCard placeholders ×3 */}
      <SkeletonBox width="100%" height={72} borderRadius={12} style={styles.gap} />
      <SkeletonBox width="100%" height={72} borderRadius={12} style={styles.gap} />
      <SkeletonBox width="100%" height={72} borderRadius={12} style={styles.gap} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  lottieHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  gap: {
    marginTop: spacing.md,
  },
  sectionGap: {
    marginTop: spacing.sectionGap,
  },
});
