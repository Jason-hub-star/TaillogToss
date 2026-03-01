/**
 * SkeletonAcademy — 훈련 아카데미 로딩 스켈레톤
 * Lottie(jackie) + Hero + TodayTrainingCard + 세로 타임라인 JourneyMap 구조 미러링.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { colors, typography, spacing } from 'styles/tokens';

export function SkeletonAcademy() {
  return (
    <View style={styles.container}>
      <View style={styles.lottieHeader}>
        <LottieAnimation asset="jackie" size={72} />
        <Text style={styles.loadingText}>커리큘럼 준비 중...</Text>
      </View>

      {/* AIPersonalizedHero placeholder */}
      <SkeletonBox width="100%" height={120} borderRadius={16} />

      {/* TodayTrainingCard placeholder */}
      <SkeletonBox width="100%" height={140} borderRadius={16} style={styles.sectionGap} />

      {/* Section title placeholder */}
      <SkeletonBox width={140} height={18} borderRadius={4} style={styles.sectionGap} />

      {/* Journey Map timeline: 4 cards */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.timelineRow}>
          <View style={styles.timelineNode}>
            <SkeletonBox width={28} height={28} borderRadius={14} />
            {i < 4 && <View style={styles.timelineConnector} />}
          </View>
          <View style={styles.timelineCard}>
            <SkeletonBox width="100%" height={180} borderRadius={16} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  sectionGap: {
    marginTop: spacing.sectionGap,
  },
  timelineRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  timelineNode: {
    width: 40,
    alignItems: 'center',
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: colors.grey200,
    marginTop: spacing.xs,
  },
  timelineCard: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});
