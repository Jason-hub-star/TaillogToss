/**
 * DashboardCoachingSummaryCard — 기록탭 상단 AI 행동진단 재노출 카드
 * Parity: AI-001, UIUX-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useLatestCoaching } from 'lib/hooks/useCoaching';
import { ICONS } from 'lib/data/iconSources';
import { colors, typography, spacing } from 'styles/tokens';

const TREND_LABEL: Record<string, string> = {
  improving: '개선 흐름',
  stable: '안정 흐름',
  worsening: '주의 필요',
};

interface DashboardCoachingSummaryCardProps {
  dogId: string | undefined;
  logCount: number;
  onNavigateToCoaching: () => void;
  onNavigateToTraining: () => void;
}

export function DashboardCoachingSummaryCard({
  dogId,
  logCount,
  onNavigateToCoaching,
  onNavigateToTraining,
}: DashboardCoachingSummaryCardProps) {
  const { data: coaching, isLoading } = useLatestCoaching(dogId);

  if (isLoading) return null;

  if (!coaching) {
    const readyForCoaching = logCount >= 5;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onNavigateToCoaching}
        activeOpacity={0.78}
      >
        <View style={styles.headerRow}>
          <Image source={{ uri: ICONS['ic-coaching'] }} style={styles.icon} />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>AI 추천 준비</Text>
            <Text style={styles.title}>
              {readyForCoaching ? 'AI 행동진단을 받아보세요' : '기록 5개부터 추천이 더 정확해져요'}
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
        <Text style={styles.description}>
          {readyForCoaching
            ? '최근 기록을 바탕으로 맞춤 훈련과 7일 계획을 정리해요.'
            : `지금 ${logCount}개 기록이 있어요. 조금 더 쌓이면 패턴을 더 잘 볼 수 있어요.`}
        </Text>
        <Text style={styles.primaryCta}>AI 행동진단 받기</Text>
      </TouchableOpacity>
    );
  }

  const insight = coaching.blocks?.insight;
  const trend = insight?.trend ?? 'stable';
  const actionItems = coaching.blocks?.action_plan?.items ?? [];
  const completedCount = actionItems.filter((item) => item.is_completed).length;
  const createdAt = formatDate(coaching.created_at);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Image source={{ uri: ICONS['ic-analysis'] }} style={styles.icon} />
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>최근 AI 행동진단</Text>
          <Text style={styles.title} numberOfLines={2}>
            {insight?.title ?? '맞춤 행동진단'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{createdAt}</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{TREND_LABEL[trend] ?? '안정 흐름'}</Text>
        </View>
        {actionItems.length > 0 && (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>
              완료 {completedCount}/{actionItems.length}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaButton, styles.secondaryButton]}
          onPress={onNavigateToCoaching}
          activeOpacity={0.75}
        >
          <Text style={[styles.ctaButtonText, styles.secondaryButtonText]}>지난 진단 보기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onNavigateToTraining}
          activeOpacity={0.75}
        >
          <Text style={styles.ctaButtonText}>추천 훈련 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근 생성';
  return `${date.getMonth() + 1}월 ${date.getDate()}일 생성`;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 32,
    height: 32,
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
    marginBottom: 2,
  },
  title: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: 20,
  },
  arrow: {
    ...typography.subtitle,
    color: colors.grey400,
    marginLeft: spacing.sm,
  },
  description: {
    ...typography.detail,
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  primaryCta: {
    ...typography.bodySmall,
    color: colors.primaryBlue,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaPill: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ctaButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.primaryBlueLight,
  },
  ctaButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: colors.primaryBlue,
  },
});
