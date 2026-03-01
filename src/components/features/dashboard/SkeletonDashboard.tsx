/**
 * SkeletonDashboard — 대시보드 로딩 스켈레톤
 * DogCard + StreakBanner + LogCard×3 구조 유지.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { spacing } from 'styles/tokens';

export function SkeletonDashboard() {
  return (
    <View style={styles.container}>
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
  gap: {
    marginTop: spacing.md,
  },
  sectionGap: {
    marginTop: spacing.sectionGap,
  },
});
