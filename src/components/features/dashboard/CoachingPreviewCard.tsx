/**
 * CoachingPreviewCard — 대시보드 분석 탭의 코칭 프리뷰 카드
 * 최신 코칭 트렌드 표시 or "AI 코칭 받기" CTA
 * Parity: AI-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLatestCoaching } from 'lib/hooks/useCoaching';
import { colors, typography, spacing } from 'styles/tokens';

const TREND_ICON: Record<string, string> = {
  improving: '📈',
  stable: '➡️',
  worsening: '📉',
};

const TREND_LABEL: Record<string, string> = {
  improving: '개선 중',
  stable: '유지 중',
  worsening: '주의 필요',
};

interface CoachingPreviewCardProps {
  dogId: string | undefined;
  onNavigateToCoaching: () => void;
  dailyUsed?: number;
  dailyLimit?: number;
}

export function CoachingPreviewCard({ dogId, onNavigateToCoaching, dailyUsed, dailyLimit }: CoachingPreviewCardProps) {
  const { data: coaching, isLoading } = useLatestCoaching(dogId);

  if (isLoading) return null;

  const usageBadge =
    dailyUsed !== undefined && dailyLimit !== undefined ? (
      <View style={[styles.usageBadge, dailyUsed >= dailyLimit && styles.usageBadgeExhausted]}>
        <Text style={styles.usageBadgeText}>
          {dailyUsed}/{dailyLimit}회
        </Text>
      </View>
    ) : null;

  if (!coaching) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onNavigateToCoaching}
        activeOpacity={0.7}
      >
        <Text style={styles.ctaIcon}>🤖</Text>
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>AI 맞춤 코칭 받기</Text>
          <Text style={styles.ctaDesc}>행동 기록을 분석해 맞춤 코칭을 제공해요</Text>
        </View>
        {usageBadge}
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }

  const trend = coaching.blocks?.insight?.trend ?? 'stable';
  const title = coaching.blocks?.insight?.title ?? 'AI 코칭';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onNavigateToCoaching}
      activeOpacity={0.7}
    >
      <Text style={styles.ctaIcon}>{TREND_ICON[trend]}</Text>
      <View style={styles.ctaContent}>
        <Text style={styles.previewTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.previewTrend}>{TREND_LABEL[trend]} · 상세 보기</Text>
      </View>
      {usageBadge}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: spacing.lg,
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
  },
  ctaIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  ctaDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  previewTrend: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  arrow: {
    ...typography.body,
    color: colors.grey400,
    marginLeft: spacing.sm,
  },
  usageBadge: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: spacing.xs,
  },
  usageBadgeExhausted: {
    backgroundColor: colors.grey300,
  },
  usageBadgeText: {
    ...typography.badge,
    color: colors.white,
    fontWeight: '600',
  },
});
