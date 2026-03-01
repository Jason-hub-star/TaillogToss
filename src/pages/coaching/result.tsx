/**
 * AI 코칭 결과 화면 — 6블록 Card Stack + PRO 잠금 + R3 광고 터치포인트
 * DetailLayout (패턴B) — BackButton + "AI 행동 진단"
 * Parity: AI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { CoachingBlockList } from 'components/features/coaching/CoachingBlockList';
import { SkeletonCoaching } from 'components/features/coaching/SkeletonCoaching';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { useLatestCoaching, useSubmitFeedback } from 'lib/hooks/useCoaching';
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
  const [selectedScore, setSelectedScore] = useState<number>(0);
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

  const handleNavigateToAcademy = useCallback(() => {
    navigation.navigate('/training/academy');
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

  if (!coaching) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <EmptyState
          title="아직 코칭 결과가 없어요"
          description="행동 기록을 쌓으면 AI가 맞춤 코칭을 제공합니다"
          icon="🐾"
        />
      </DetailLayout>
    );
  }

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

      {/* 6블록 렌더링 */}
      <CoachingBlockList
        blocks={coaching.blocks}
        isPro={isPro ?? false}
      />

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    ...typography.detail,
    color: colors.textSecondary,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateLabel: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.primaryBlue,
    backgroundColor: `${colors.primaryBlue}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  feedbackSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  feedbackTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 12,
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    ...typography.heroTitle,
    color: colors.grey300,
  },
  starSelected: {
    color: colors.orange500,
  },
});
