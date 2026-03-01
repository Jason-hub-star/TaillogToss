/**
 * 훈련 아카데미 — AI 맞춤 문제행동 해결 솔루션 플랫폼
 * Hero + TodayTrainingCard + InsightSummaryBar + CurriculumJourneyMap + ProUpgradeBanner
 * ListLayout (패턴A) — "훈련 아카데미"
 * Parity: UI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ListLayout } from 'components/shared/layouts/ListLayout';
import { AIPersonalizedHero } from 'components/features/training/AIPersonalizedHero';
import { CurriculumJourneyMap } from 'components/features/training/CurriculumJourneyMap';
import { InsightSummaryBar } from 'components/features/training/InsightSummaryBar';
import { ProUpgradeBanner } from 'components/features/training/ProUpgradeBanner';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { getRecommendations } from 'lib/data/recommendation/engine';
import { useTrainingProgress, useStepFeedback } from 'lib/hooks/useTraining';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import { useSurvey } from 'stores/SurveyContext';
import type { Curriculum, CurriculumId, TrainingProgress } from 'types/training';
import { SkeletonAcademy } from 'components/features/training/SkeletonAcademy';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/training/academy', {
  component: TrainingAcademyPage,
});

function TrainingAcademyPage() {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const { surveyData } = useSurvey();
  const { data: progressList, isLoading, isError, refetch } = useTrainingProgress(activeDog?.id);
  const { data: feedbackList } = useStepFeedback(activeDog?.id);
  const { isReady } = usePageGuard({ currentPath: '/training/academy' });

  // 진행 상태 맵: curriculumId → TrainingProgress
  const progressMap = useMemo(() => {
    const map = new Map<CurriculumId, TrainingProgress>();
    if (Array.isArray(progressList)) {
      for (const p of progressList) {
        map.set(p.curriculum_id, p);
      }
    }
    return map;
  }, [progressList]);

  // 완료 커리큘럼 목록
  const completedIds = useMemo(() => {
    if (!Array.isArray(progressList)) return [];
    return progressList
      .filter((p: TrainingProgress) => p.status === 'completed')
      .map((p: TrainingProgress) => p.curriculum_id);
  }, [progressList]);

  // AI 맞춤 추천 (설문 행동 데이터 기반)
  const recommendation = useMemo(() => {
    const behaviors = surveyData?.step3_behavior.primary_behaviors ?? ['other'];
    return getRecommendations(behaviors, completedIds);
  }, [surveyData, completedIds]);

  // 현재 진행 중인 커리큘럼
  const activeProgress = useMemo(() => {
    if (!Array.isArray(progressList)) return null;
    return progressList.find((p: TrainingProgress) => p.status === 'in_progress') ?? null;
  }, [progressList]);

  // 강아지 행동 텍스트 (설문 기반)
  const behaviorText = useMemo(() => {
    const behaviors = surveyData?.step3_behavior.primary_behaviors ?? [];
    if (behaviors.length === 0) return '문제';
    const BEHAVIOR_LABEL: Record<string, string> = {
      barking: '짖음', biting: '무는', jumping: '점프',
      pulling: '당김', anxiety: '불안', aggression: '공격',
      fear: '두려움', destruction: '파괴', toilet: '배변',
      other: '기타',
    };
    return behaviors.slice(0, 2).map((b: string) => BEHAVIOR_LABEL[b] ?? b).join('·');
  }, [surveyData]);

  const navigation = useNavigation();

  const handleCardPress = useCallback((curriculum: Curriculum) => {
    navigation.navigate('/training/detail', { curriculum_id: curriculum.id });
  }, [navigation]);

  const handleProCTA = useCallback(() => {
    navigation.navigate('/settings/subscription');
  }, [navigation]);

  if (!isReady) return null;

  if (isError) {
    return (
      <ListLayout title="훈련 아카데미" onBack={() => navigation.goBack()} footer={<BottomNavBar activeTab="training" />}>
        <ErrorState
          title="훈련 정보를 불러올 수 없어요"
          onRetry={() => void refetch()}
        />
      </ListLayout>
    );
  }

  return (
    <ListLayout title="훈련 아카데미" onBack={() => navigation.goBack()} footer={<BottomNavBar activeTab="training" />}>
      {isLoading ? (
        <SkeletonAcademy />
      ) : CURRICULUMS.length === 0 ? (
        <EmptyState
          title="준비 중인 커리큘럼이에요"
          description="곧 새로운 훈련 과정이 열려요"
        />
      ) : (
        <>
          {/* AI Personalized Hero */}
          <AIPersonalizedHero
            dogName={activeDog?.name ?? '강아지'}
            behaviorText={behaviorText}
          />

          {/* 오늘의 훈련 카드 (현재 진행 중 커리큘럼 하이라이트) */}
          {activeProgress && (
            <TodayTrainingCard
              progress={activeProgress}
              onPress={() => {
                const c = CURRICULUMS.find((cur) => cur.id === activeProgress.curriculum_id);
                if (c) handleCardPress(c);
              }}
            />
          )}

          {/* 인사이트 요약 바 (피드백 있을 때만) */}
          {feedbackList && feedbackList.length > 0 && (
            <InsightSummaryBar feedbackList={feedbackList} />
          )}

          {/* 커리큘럼 Journey Map */}
          <Text style={styles.sectionTitle}>전체 커리큘럼 ({CURRICULUMS.length})</Text>
          <CurriculumJourneyMap
            curriculums={CURRICULUMS}
            progressMap={progressMap}
            feedbackList={feedbackList ?? []}
            isPro={isPro ?? false}
            recommendedId={recommendation.primary}
            onCardPress={handleCardPress}
            onProCTA={handleProCTA}
          />

          {/* PRO 구독 배너 */}
          {!isPro && <ProUpgradeBanner />}
        </>
      )}
    </ListLayout>
  );
}

// ──────────────────────────────────────
// 오늘의 훈련 카드 (기존 유지)
// ──────────────────────────────────────

function TodayTrainingCard({
  progress,
  onPress,
}: {
  progress: TrainingProgress;
  onPress: () => void;
}) {
  const curriculum = CURRICULUMS.find((c) => c.id === progress.curriculum_id);
  if (!curriculum) return null;

  const totalSteps = curriculum.days.reduce((sum, d) => sum + d.steps.length, 0);
  const completedSteps = progress.completed_steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <View style={styles.todayCard}>
      <View style={styles.todayHeader}>
        <Text style={styles.todayLabel}>오늘의 훈련</Text>
        <Text style={styles.todayDay}>Day {progress.current_day}</Text>
      </View>
      <Text style={styles.todayTitle}>{curriculum.title}</Text>
      <View style={styles.todayProgress}>
        <View style={styles.todayProgressTrack}>
          <View style={[styles.todayProgressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.todayProgressText}>{progressPercent}%</Text>
      </View>
      <TouchableOpacity style={styles.todayCTA} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.todayCTAText}>이어서 하기 →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sectionGap,
    marginBottom: spacing.md,
  },
  // Today card
  todayCard: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: spacing.sm,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: `${colors.white}99`,
  },
  todayDay: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: `${colors.white}33`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  todayTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  todayProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: `${colors.white}33`,
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  todayProgressFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  todayProgressText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  todayCTA: {
    alignItems: 'flex-end',
    minHeight: 44,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  todayCTAText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.white,
  },
});
