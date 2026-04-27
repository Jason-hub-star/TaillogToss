/**
 * AI 코칭 결과 화면 — 최신/기록 탭 + 6블록 인터랙티브 + 생성 파이프라인
 * DetailLayout (패턴B) — BackButton + "AI 행동 진단"
 * Parity: AI-001, UIUX-005
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { CoachingHistoryList } from 'components/features/coaching/CoachingHistoryList';
import { CoachingGenerationLoader } from 'components/features/coaching/CoachingGenerationLoader';
import { SkeletonCoaching } from 'components/features/coaching/SkeletonCoaching';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { AnalysisBadge } from 'components/features/coaching/AnalysisBadge';
import { CoachingDetailContent } from './CoachingDetailContent';
import {
  useLatestCoaching,
  useSubmitFeedback,
  useGenerateCoaching,
  useToggleActionItem,
  useDailyUsage,
} from 'lib/hooks/useCoaching';
import { parseCoachingError } from 'lib/api/coaching';
import { buildCoachingShareText } from 'lib/charts/filters';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { tracker } from 'lib/analytics/tracker';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import type { CoachingResult } from 'types/coaching';

export const Route = createRoute('/coaching/result', {
  component: CoachingResultPage,
  screenOptions: { headerShown: false },
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
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const trackedRequestRef = useRef(false);
  const trackedCoachingIdRef = useRef<string | null>(null);

  const displayCoaching = activeTab === 'history' && selectedHistoryCoaching
    ? selectedHistoryCoaching
    : coaching;

  useEffect(() => {
    setSelectedScore(0);
    setFeedbackSubmitted(false);
  }, [displayCoaching?.id]);

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

  const handleNavigateToSubscription = useCallback(() => {
    navigation.navigate('/settings/subscription');
  }, [navigation]);

  const handleBack = useCallback(() => {
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
      setFeedbackSubmitted(true);
      tracker.coachingFeedbackSubmitted(score);
      submitFeedback.mutate({ coachingId: displayCoaching.id, score });
    },
    [displayCoaching, submitFeedback],
  );

  const handleShare = useCallback(() => {
    if (!displayCoaching) return;
    const message = buildCoachingShareText({
      dogName: activeDog?.name ?? '우리 강아지',
      trend: displayCoaching.blocks.insight.trend,
      reportType: displayCoaching.report_type,
      keyPatterns: displayCoaching.blocks.insight.key_patterns,
      completedCount: displayCoaching.blocks.action_plan.items.filter((i) => i.is_completed).length,
      totalCount: displayCoaching.blocks.action_plan.items.length,
    });
    tracker.coachingShared(displayCoaching.report_type);
    void Share.share({ message });
  }, [displayCoaching, activeDog?.name]);

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

  if (generateCoaching.isPending) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <CoachingGenerationLoader />
      </DetailLayout>
    );
  }

  if (!coaching && generateError) {
    return (
      <DetailLayout title="AI 행동 진단" onBack={handleBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😥</Text>
          <Text style={styles.errorTitle}>{generateError}</Text>
          <Text style={styles.errorDesc}>잠시 후 다시 시도해 주세요</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleGenerate}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>다시 시도하기</Text>
          </TouchableOpacity>
        </View>
      </DetailLayout>
    );
  }

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
          </Text>
        </View>
      </DetailLayout>
    );
  }

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
      <View style={styles.topBar}>
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
        {displayCoaching && (
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.shareIcon}>{'\u{1F4E4}'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'history' && !selectedHistoryCoaching && (
        <CoachingHistoryList
          dogId={activeDog?.id}
          onSelectCoaching={handleSelectHistoryCoaching}
        />
      )}

      {(activeTab === 'latest' || selectedHistoryCoaching) && displayCoaching && (
        <>
          {displayCoaching.analytics_metadata && (
            <AnalysisBadge
              logCount={displayCoaching.analytics_metadata.log_count}
              analysisDays={displayCoaching.analytics_metadata.analysis_days}
              topBehavior={displayCoaching.analytics_metadata.top_behavior}
            />
          )}
          <CoachingDetailContent
            coaching={displayCoaching}
            isPro={isPro ?? false}
            activeDog={activeDog}
            onToggleActionItem={handleToggleActionItem}
            onNavigateToTraining={handleNavigateToAcademy}
            onNavigateToAnalysis={handleNavigateToAnalysis}
            onNavigateToSubscription={handleNavigateToSubscription}
            onStarPress={handleStarPress}
            selectedScore={selectedScore}
            feedbackSubmitted={feedbackSubmitted}
            isSubmittingFeedback={submitFeedback.isPending}
            onGenerate={handleGenerate}
            isGenerating={generateCoaching.isPending}
            generateError={generateError}
            usage={usage}
          />
        </>
      )}
    </DetailLayout>
  );
}

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
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  errorEmoji: {
    ...typography.emoji,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  retryButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
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
  shareIcon: {
    ...typography.sectionTitle,
  },
});
