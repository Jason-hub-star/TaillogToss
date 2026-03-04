/**
 * TrainingEffectCard — 훈련 효과 비교 카드 (before/after 변화율 표시)
 * 훈련 데이터 없으면 null 반환 (숨김)
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TrainingEffect } from 'lib/charts/filters';
import { colors, typography, spacing } from 'styles/tokens';

interface TrainingEffectCardProps {
  effects: TrainingEffect[];
  hasTrainingData: boolean;
}

export function TrainingEffectCard({ effects, hasTrainingData }: TrainingEffectCardProps) {
  if (!hasTrainingData) return null;

  if (effects.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>훈련 효과</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            훈련을 시작하면 행동 변화를 추적할 수 있어요
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>훈련 효과</Text>
      {effects.map((effect, index) => {
        const isImproved = effect.changePercent <= 0;
        return (
          <View key={index} style={styles.effectRow}>
            <View style={styles.effectContent}>
              <Text style={styles.effectTitle} numberOfLines={2}>
                {effect.curriculumTitle} 시작 후{'\n'}
                {effect.behaviorLabel} 행동
              </Text>
              <Text style={styles.effectDetail}>
                {effect.beforeCount}회 → {effect.afterCount}회
              </Text>
            </View>
            <View style={[styles.badge, isImproved ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={[styles.badgeText, isImproved ? styles.badgeTextGreen : styles.badgeTextRed]}>
                {Math.abs(effect.changePercent)}% {isImproved ? '감소 ↓' : '증가 ↑'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.detail,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  effectContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  effectTitle: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  effectDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  badgeGreen: {
    backgroundColor: colors.badgeGreenBg,
  },
  badgeRed: {
    backgroundColor: colors.badgeRedBg,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  badgeTextGreen: {
    color: colors.badgeGreen,
  },
  badgeTextRed: {
    color: colors.badgeRed,
  },
});
