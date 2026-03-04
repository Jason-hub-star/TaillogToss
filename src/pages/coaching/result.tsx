/**
 * AI 코칭 결과 화면 — 최신/기록 탭 + 6블록 인터랙티브 + 생성 파이프라인
 * DetailLayout (패턴B) — BackButton + "AI 행동 진단"
 * Parity: AI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { CoachingBlockList } from 'components/features/coaching/CoachingBlockList';
import { CoachingHistoryList } from 'components/features/coaching/CoachingHistoryList';
import { CoachingGenerationLoader } from 'components/features/coaching/CoachingGenerationLoader';
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
import type { CoachingResult } from 'types/coaching';

export const Route = createRoute('/coaching/result', {
  component: CoachingResultPage,
});

type TabKey = 'latest' | 'history';

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

  const [activeTab, setActiveTab] = useState<TabKey>('latest');
  const [selectedHistoryCoaching, setSelectedHistoryCoaching] = useState<CoachingResult | null>(null);
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const trackedRequestRef = useRef(false);
  const trackedCoachingIdRef = useRef<string | null>(null);

  // 표시할 코칭 데이터 (히스토리에서 선택하면 그것, 아니면 최신)
  const displayCoaching = activeTab === 'history' && selectedHistoryCoaching
    ? selectedHistoryCoaching
    : coaching;

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
    setActiveTab('latest');
    setSelectedHistoryCoaching(null);
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
      if (!displayCoaching || !activeDog?.id) return;
      const item = displayCoaching.blocks.action_plan.items.find((i) => i.id === actionItemId);
      if (!item) return;
      toggleAction.mutate({
        coachingId: displayCoaching.id,
        actionItemId,
        isCompleted: !item.is_completed,
        dogId: activeDog.id,
      });
    },
    [displayCoaching, activeDog?.id, toggleAction],
  );

  const handleSelectHistoryCoaching = useCallback((c: CoachingResult) => {
    setSelectedHistoryCoaching(c);
  }, []);

  const handleNavigateToAcademy = useCallback(() => {
    navigation.navigate('/training/academy');
  }, [navigation]);

  const handleNavigateToAnalysis = useCallback(() => {
    navigation.navigate('/dashboard/analysis');
  }, [navigation]);

  const handleBack = useCallback(() => {
    // 히스토리 상세 보기 중이면 리스트로 돌아감
    if (selectedHistoryCoaching) {
      setSelectedHistoryCoaching(null);
      return;
    }
    navigation.goBack();
  }, [navigation, selectedHistoryCoaching]);

  const handleStarPress = useCallback(
    (score: 1 | 2 | 3 | 4 | 5) => {
      if (!displayCoaching) return;
      setSelectedScore(score);
      submitFeedback.mutate({ coachingId: displayCoaching.id, score });
    },
    [displayCoaching, submitFeedback],
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

  // ── 코칭 생성 중 ──
  if (generateCoaching.isPending) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <CoachingGenerationLoader />
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
            style={[styles.generateButton, remaining === 0 && styles.generateButtonDisabled]}
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
          {generateError && <Text style={styles.errorText}>{generateError}</Text>}
        </View>
      </DetailLayout>
    );
  }

  // ── 탭 구조: 최신 / 기록 ──
  return (
    <DetailLayout
      title="AI 행동 진단"
      onBack={handleBack}
      bottomCTA={
        activeTab === 'latest' && !selectedHistoryCoaching
          ? { label: '훈련 시작하기', onPress: handleNavigateToAcademy }
          : undefined
      }
    >
      {/* 탭 헤더 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'latest' && styles.tabActive]}
          onPress={() => { setActiveTab('latest'); setSelectedHistoryCoaching(null); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'latest' && styles.tabTextActive]}>
            최신
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            기록
          </Text>
        </TouchableOpacity>
      </View>

      {/* 히스토리 탭 — 리스트 또는 선택한 코칭 상세 */}
      {activeTab === 'history' && !selectedHistoryCoaching && (
        <CoachingHistoryList
          dogId={activeDog?.id}
          onSelectCoaching={handleSelectHistoryCoaching}
        />
      )}

      {/* 코칭 상세 (최신 탭 or 히스토리에서 선택) */}
      {(activeTab === 'latest' || selectedHistoryCoaching) && displayCoaching && (
        <CoachingDetailContent
          coaching={displayCoaching}
          isPro={isPro ?? false}
          activeDog={activeDog}
          onToggleActionItem={handleToggleActionItem}
          onNavigateToAnalysis={handleNavigateToAnalysis}
          onStarPress={handleStarPress}
          selectedScore={selectedScore}
          isSubmittingFeedback={submitFeedback.isPending}
          onGenerate={handleGenerate}
          isGenerating={generateCoaching.isPending}
          usage={usage}
        />
      )}
    </DetailLayout>
  );
}

// ──────────────────────────────────────
// 코칭 상세 콘텐츠 (최신/히스토리 공용)
// ──────────────────────────────────────

interface CoachingDetailContentProps {
  coaching: CoachingResult;
  isPro: boolean;
  activeDog: { id: string; name: string; profile_image_url?: string | null } | null;
  onToggleActionItem: (itemId: string) => void;
  onNavigateToAnalysis: () => void;
  onStarPress: (score: 1 | 2 | 3 | 4 | 5) => void;
  selectedScore: number;
  isSubmittingFeedback: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  usage?: { used: number; limit: number } | null;
}

function CoachingDetailContent({
  coaching,
  isPro,
  activeDog,
  onToggleActionItem,
  onNavigateToAnalysis,
  onStarPress,
  selectedScore,
  isSubmittingFeedback,
  onGenerate,
  isGenerating,
  usage,
}: CoachingDetailContentProps) {
  const completedCount = coaching.blocks.action_plan.items.filter((i) => i.is_completed).length;
  const totalCount = coaching.blocks.action_plan.items.length;

  return (
    <>
      {/* 코칭 날짜 헤더 */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateLabel}>
          {formatReportType(coaching.report_type)} 코칭
        </Text>
        <Text style={styles.dateText}>{formatDate(coaching.created_at)}</Text>
      </View>

      {/* 진행률 */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${(completedCount / totalCount) * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{completedCount}/{totalCount} 완료</Text>
        </View>
      )}

      {/* 6블록 */}
      <CoachingBlockList
        blocks={coaching.blocks}
        isPro={isPro}
        onToggleActionItem={onToggleActionItem}
        dogName={activeDog?.name}
        dogImageUrl={activeDog?.profile_image_url}
      />

      {/* 분석 링크 */}
      <TouchableOpacity
        style={styles.analysisLink}
        onPress={onNavigateToAnalysis}
        activeOpacity={0.7}
      >
        <Text style={styles.analysisLinkText}>📊 분석 자세히 보기</Text>
      </TouchableOpacity>

      {/* 피드백 */}
      {coaching.feedback_score === null && selectedScore === 0 && (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>이 코칭이 도움이 되었나요?</Text>
          <View style={styles.feedbackStars}>
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onStarPress(star)}
                activeOpacity={0.7}
                disabled={isSubmittingFeedback}
              >
                <Text style={[styles.star, star <= selectedScore && styles.starSelected]}>
                  {star <= selectedScore ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 새 코칭 생성 */}
      <View style={styles.regenerateSection}>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={onGenerate}
          activeOpacity={0.7}
          disabled={isGenerating}
        >
          <Text style={styles.regenerateButtonText}>새 코칭 받기</Text>
        </TouchableOpacity>
        {usage && (
          <Text style={styles.usageTextSmall}>
            오늘 {usage.used}/{usage.limit}회 사용
          </Text>
        )}
      </View>
    </>
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
  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderRadius: 10,
    backgroundColor: colors.grey100,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  // Date header
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
