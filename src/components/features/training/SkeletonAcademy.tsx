/**
 * SkeletonAcademy — 훈련 아카데미 로딩 스켈레톤
 * TodayTrainingCard + 2열 CurriculumCard 그리드 구조 유지.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { spacing } from 'styles/tokens';

export function SkeletonAcademy() {
  return (
    <View style={styles.container}>
      {/* TodayTrainingCard placeholder */}
      <SkeletonBox width="100%" height={140} borderRadius={16} />

      {/* Section title placeholder */}
      <SkeletonBox width={120} height={18} borderRadius={4} style={styles.sectionGap} />

      {/* 2-column grid: CurriculumCard ×4 */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <SkeletonBox width="100%" height={180} borderRadius={16} />
        </View>
        <View style={styles.gridItem}>
          <SkeletonBox width="100%" height={180} borderRadius={16} />
        </View>
        <View style={styles.gridItem}>
          <SkeletonBox width="100%" height={180} borderRadius={16} />
        </View>
        <View style={styles.gridItem}>
          <SkeletonBox width="100%" height={180} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
  },
  sectionGap: {
    marginTop: spacing.sectionGap,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '50%',
  },
});
