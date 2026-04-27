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
import { useProUpgradeSheet } from 'lib/hooks/useProUpgradeSheet';
import { RecommendedCurriculumCard } from 'components/features/training/RecommendedCurriculumCard';
import { RelatedCurriculumCarousel } from 'components/features/training/RelatedCurriculumCarousel';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ICONS } from 'lib/data/iconSources';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { getRecommendations, getRecommendationsV2 } from 'lib/data/recommendation/engine';
import { useTrainingProgress, useStepFeedback, useBehaviorAnalytics } from 'lib/hooks/useTraining';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import { useSurvey } from 'stores/SurveyContext';
import { useDogEnv } from 'lib/hooks/useDogs';
import { BEHAVIOR_TO_CURRICULUM, normalizeTopBehaviors } from 'lib/data/mappings/behaviorToCurriculum';
import type { Curriculum, CurriculumId, TrainingProgress } from 'types/training';
import type { BehaviorType } from 'types/dog';
import type { CurriculumRecommendationV2 } from 'lib/data/recommendation/engine';
import { SkeletonAcademy } from 'components/features/training/SkeletonAcademy';
import { BottomNavBar } from 'components/shared/BottomNavBar';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/training/academy', {
  component: TrainingAcademyPage,
  screenOptions: { headerShown: false },
});

function TrainingAcademyPage() {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const { surveyData } = useSurvey();
  const { data: dogEnv } = useDogEnv(activeDog?.id);
  const { data: progressList, isLoading, isError, refetch } = useTrainingProgress(activeDog?.id);
  const { data: feedbackList } = useStepFeedback(activeDog?.id);
  const { data: behaviorAnalytics } = useBehaviorAnalytics(activeDog?.id);
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

  // AI 맞춤 추천 (cold start fallback 포함)
  const recommendation = useMemo(() => {
    // 행동 문제 소스 우선순위:
    // 1) 설문 컨텍스트 (앱 실행 중 유지)
    // 2) dog_env.chronic_issues.top_issues (DB 영구 저장, 앱 재시작 후 복원)
    // 3) fallback ['other']
    const coldStartBehaviors: BehaviorType[] =
      surveyData?.step3_behavior.primary_behaviors ??
      dogEnv?.chronic_issues?.top_issues?.filter(
        (b): b is BehaviorType => b in BEHAVIOR_TO_CURRICULUM,
      ) ??
      ['other'];

    if (!behaviorAnalytics || behaviorAnalytics.total_logs < 5) {
      return getRecommendations(coldStartBehaviors, completedIds);
    }

    // warm-start: 실제 로그 top_behaviors를 BehaviorType으로 정규화 후 우선 사용
    const warmBehaviors = normalizeTopBehaviors(behaviorAnalytics.top_behaviors ?? []);
    const behaviors = warmBehaviors.length > 0 ? warmBehaviors : coldStartBehaviors;
    return getRecommendationsV2(behaviors, completedIds, behaviorAnalytics);
  }, [surveyData, dogEnv, completedIds, behaviorAnalytics]);

  // 현재 진행 중인 커리큘럼
  const activeProgress = useMemo(() => {
    if (!Array.isArray(progressList)) return null;
    return progressList.find((p: TrainingProgress) => p.status === 'in_progress') ?? null;
  }, [progressList]);

  // 강아지 행동 텍스트 (설문 → DB 순 복원)
  const behaviorText = useMemo(() => {
    const behaviors: string[] =
      surveyData?.step3_behavior.primary_behaviors ??
      dogEnv?.chronic_issues?.top_issues ??
      [];
    if (behaviors.length === 0) return '문제';
    const BEHAVIOR_LABEL: Record<string, string> = {
      barking: '짖음', biting: '무는', jumping: '점프',
      pulling: '당김', anxiety: '불안', aggression: '공격',
      fear: '두려움', destruction: '파괴', toilet: '배변',
      leash_pulling: '산책 당김', reactivity: '반응성', separation: '분리불안',
      resource_guarding: '자원 보호', destructive: '파괴', other: '기타',
    };
    return behaviors.slice(0, 2).map((b: string) => BEHAVIOR_LABEL[b] ?? b).join('·');
  }, [surveyData, dogEnv]);

  const navigation = useNavigation();
  const { show: showProUpgrade, SheetNode: ProUpgradeSheetNode } = useProUpgradeSheet();

  const handleCardPress = useCallback((curriculum: Curriculum) => {
    navigation.navigate('/training/detail', { curriculum_id: curriculum.id });
  }, [navigation]);

  const handleProCTA = useCallback(() => {
    showProUpgrade();
  }, [showProUpgrade]);

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
          iconSource={ICONS['illust-empty-training']!}
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

          {/* 섹션 1: AI 맞춤 추천 */}
          <Text style={styles.sectionTitle}>AI 맞춤 추천</Text>
          <RecommendedCurriculumCard
            curriculumId={recommendation.primary}
            reasoning={recommendation.reasoning}
            scoreBand={'scoreBand' in recommendation ? (recommendation as CurriculumRecommendationV2).scoreBand : undefined}
            logCount={behaviorAnalytics?.total_logs ?? 0}
            isPro={isPro ?? false}
            onPress={() => {
              const c = CURRICULUMS.find((cur) => cur.id === recommendation.primary);
              if (c) handleCardPress(c);
            }}
          />

          {/* 섹션 2: 관련 훈련 (secondary 있을 때만) */}
          {recommendation.secondary && (
            <>
              <Text style={styles.sectionTitle}>관련 훈련</Text>
              <RelatedCurriculumCarousel
                curriculumIds={[recommendation.secondary, ...CURRICULUMS.filter(c => c.id !== recommendation.primary && c.id !== recommendation.secondary).slice(0, 3).map(c => c.id)]}
                onPress={handleCardPress}
              />
            </>
          )}

          {/* 섹션 3: 전체 커리큘럼 */}
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
      {ProUpgradeSheetNode}
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
