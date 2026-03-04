/**
 * AI 코칭 결과 화면 — 6블록 Card Stack + PRO 잠금 + R3 광고 터치포인트
 * DetailLayout (패턴B) — BackButton + "AI 행동 진단"
 * Parity: AI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { CoachingBlockList } from 'components/features/coaching/CoachingBlockList';
import { SkeletonCoaching } from 'components/features/coaching/SkeletonCoaching';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import {
  useLatestCoaching,
  useSubmitFeedback,
  useGenerateCoaching,
  useToggleActionItem,
  useDailyUsage,
} from 'lib/hooks/useCoaching';
import { parseCoachingError } from 'lib/api/coaching';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { tracker } from 'lib/analytics/tracker';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';

export const Route = createRoute('/coaching/result', {
  component: CoachingResultPage,
});

function CoachingResultPage() {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/coaching/result' });
  const { data: coaching, isLoading, isError, refetch } = useLatestCoaching(activeDog?.id);
  const submitFeedback = useSubmitFeedback();
  const generateCoaching = useGenerateCoaching();
  const toggleAction = useToggleActionItem();
  const { data: usage } = useDailyUsage(user?.id);
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const trackedRequestRef = useRef(false);
  const trackedCoachingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isReady && !trackedRequestRef.current) {
      trackedRequestRef.current = true;
      tracker.aiCoachRequested();
    }
  }, [isReady]);

  useEffect(() => {
    if (coaching && trackedCoachingIdRef.current !== coaching.id) {
      trackedCoachingIdRef.current = coaching.id;
      tracker.aiCoachCompleted('ai');
    }
  }, [coaching]);

  const handleGenerate = useCallback(() => {
    if (!activeDog?.id || generateCoaching.isPending) return;
    setGenerateError(null);
    generateCoaching.mutate(
      { dogId: activeDog.id },
      {
        onError: (err) => {
          const parsed = parseCoachingError(err);
          setGenerateError(parsed.message);
        },
      },
    );
  }, [activeDog?.id, generateCoaching]);

  const handleToggleActionItem = useCallback(
    (actionItemId: string) => {
      if (!coaching || !activeDog?.id) return;
      const item = coaching.blocks.action_plan.items.find((i) => i.id === actionItemId);
      if (!item) return;
      toggleAction.mutate({
        coachingId: coaching.id,
        actionItemId,
        isCompleted: !item.is_completed,
        dogId: activeDog.id,
      });
    },
    [coaching, activeDog?.id, toggleAction],
  );

  const handleNavigateToAcademy = useCallback(() => {
    navigation.navigate('/training/academy');
  }, [navigation]);

  const handleNavigateToAnalysis = useCallback(() => {
    navigation.navigate('/dashboard/analysis');
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleStarPress = useCallback(
    (score: 1 | 2 | 3 | 4 | 5) => {
      if (!coaching) return;
      setSelectedScore(score);
      submitFeedback.mutate({ coachingId: coaching.id, score });
    },
    [coaching, submitFeedback],
  );

  if (!isReady) return null;

  if (isLoading) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <SkeletonCoaching />
      </DetailLayout>
    );
  }

  if (isError) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <ErrorState
          title="코칭 결과를 불러올 수 없어요"
          description="네트워크를 확인하고 다시 시도해 주세요"
          onRetry={() => void refetch()}
        />
      </DetailLayout>
    );
  }

  // ── 코칭 생성 중 로딩 상태 ──
  if (generateCoaching.isPending) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <View style={styles.generatingContainer}>
          <Text style={styles.generatingEmoji}>🐾</Text>
          <ActivityIndicator size="large" color={colors.primaryBlue} style={styles.generatingSpinner} />
          <Text style={styles.generatingTitle}>AI가 행동 패턴을 분석하고 있어요</Text>
          <Text style={styles.generatingSubtitle}>잠시만 기다려 주세요...</Text>
        </View>
      </DetailLayout>
    );
  }

  // ── 빈 상태: 코칭 생성 CTA ──
  if (!coaching) {
    const dailyLimit = isPro ? 10 : 3;
    const dailyUsed = usage?.used ?? 0;
    const remaining = Math.max(0, dailyLimit - dailyUsed);

    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <View style={styles.emptyContainer}>
          <EmptyState
            title="아직 코칭 결과가 없어요"
            description="행동 기록을 기반으로 AI가 맞춤 코칭을 제공합니다"
            icon="🐾"
          />

          <TouchableOpacity
            style={[
              styles.generateButton,
              remaining === 0 && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            activeOpacity={0.7}
            disabled={remaining === 0}
          >
            <Text style={styles.generateButtonText}>AI 코칭 받기</Text>
          </TouchableOpacity>

          <Text style={styles.usageText}>
            오늘 {dailyUsed}/{dailyLimit}회 사용
            {!isPro && remaining === 0 && ' · PRO로 업그레이드하면 더 많이 받을 수 있어요'}
          </Text>

          {generateError && (
            <Text style={styles.errorText}>{generateError}</Text>
          )}
        </View>
      </DetailLayout>
    );
  }

  // ── 코칭 데이터 표시 ──
  const completedCount = coaching.blocks.action_plan.items.filter((i) => i.is_completed).length;
  const totalCount = coaching.blocks.action_plan.items.length;

  return (
    <DetailLayout
      title="AI 행동 진단"
      onBack={handleBack}
      bottomCTA={{ label: '훈련 시작하기', onPress: handleNavigateToAcademy }}
    >
      {/* 코칭 날짜 헤더 */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateLabel}>
          {formatReportType(coaching.report_type)} 코칭
        </Text>
        <Text style={styles.dateText}>
          {formatDate(coaching.created_at)}
        </Text>
      </View>

      {/* 진행률 표시 (액션 아이템) */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedCount / totalCount) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} 완료
          </Text>
        </View>
      )}

      {/* 6블록 렌더링 */}
      <CoachingBlockList
        blocks={coaching.blocks}
        isPro={isPro ?? false}
        onToggleActionItem={handleToggleActionItem}
        dogName={activeDog?.name}
        dogImageUrl={activeDog?.profile_image_url}
      />

      {/* 분석 페이지 역방향 링크 */}
      <TouchableOpacity
        style={styles.analysisLink}
        onPress={handleNavigateToAnalysis}
        activeOpacity={0.7}
      >
        <Text style={styles.analysisLinkText}>📊 분석 자세히 보기</Text>
      </TouchableOpacity>

      {/* 피드백 섹션 */}
      {coaching.feedback_score === null && selectedScore === 0 && (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>이 코칭이 도움이 되었나요?</Text>
          <View style={styles.feedbackStars}>
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleStarPress(star)}
                activeOpacity={0.7}
                disabled={submitFeedback.isPending}
              >
                <Text style={[styles.star, star <= selectedScore && styles.starSelected]}>
                  {star <= selectedScore ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 새 코칭 생성 버튼 */}
      <View style={styles.regenerateSection}>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={handleGenerate}
          activeOpacity={0.7}
          disabled={generateCoaching.isPending}
        >
          <Text style={styles.regenerateButtonText}>새 코칭 받기</Text>
        </TouchableOpacity>
        {usage && (
          <Text style={styles.usageTextSmall}>
            오늘 {usage.used}/{usage.limit}회 사용
          </Text>
        )}
      </View>
    </DetailLayout>
  );
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function formatReportType(type: string): string {
  const labels: Record<string, string> = {
    DAILY: '일간',
    WEEKLY: '주간',
    INSIGHT: '인사이트',
  };
  return labels[type] ?? type;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

// ──────────────────────────────────────
// Styles
// ──────────────────────────────────────

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  generatingEmoji: {
    ...typography.emoji,
    marginBottom: spacing.lg,
  },
  generatingSpinner: {
    marginBottom: spacing.lg,
  },
  generatingTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  generatingSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  generateButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: spacing.xl,
  },
  generateButtonDisabled: {
    backgroundColor: colors.grey300,
  },
  generateButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  usageText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.red500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dateLabel: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.primaryBlue,
    backgroundColor: colors.primaryBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.grey100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green500,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 55,
    textAlign: 'right',
  },
  analysisLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  analysisLinkText: {
    ...typography.bodySmall,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  feedbackSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  feedbackTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  star: {
    ...typography.heroTitle,
    color: colors.grey300,
  },
  starSelected: {
    color: colors.orange500,
  },
  regenerateSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  regenerateButton: {
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  regenerateButtonText: {
    ...typography.bodySmall,
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  usageTextSmall: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
