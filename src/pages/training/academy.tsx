/**
 * 훈련 아카데미 목록 화면 — 커리큘럼 2열 그리드 + PRO 잠금 + 추천 하이라이트
 * ListLayout (패턴A) — "훈련 아카데미"
 * Parity: UI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ListLayout } from 'components/shared/layouts/ListLayout';
import { CurriculumCard } from 'components/features/training/CurriculumCard';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { CURRICULUMS } from 'lib/data/curriculum';
import { getRecommendations } from 'lib/data/recommendCurriculum';
import { useTrainingProgress } from 'lib/hooks/useTraining';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import { useSurvey } from 'stores/SurveyContext';
import type { Curriculum, CurriculumId, CurriculumStatus, TrainingProgress } from 'types/training';
import { SkeletonAcademy } from 'components/features/training/SkeletonAcademy';
import { RecommendationCard } from 'components/features/training/RecommendationCard';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/training/academy', {
  component: TrainingAcademyPage,
});

function TrainingAcademyPage() {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const { surveyData } = useSurvey();
  const { data: progressList, isLoading, isError, refetch } = useTrainingProgress(activeDog?.id);
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

  const recommendedId = recommendation.primary;

  // 현재 진행 중인 커리큘럼
  const activeProgress = useMemo(() => {
    if (!Array.isArray(progressList)) return null;
    return progressList.find((p: TrainingProgress) => p.status === 'in_progress') ?? null;
  }, [progressList]);

  const navigation = useNavigation();

  const handleCardPress = useCallback((curriculum: Curriculum) => {
    navigation.navigate('/training/detail', { curriculum_id: curriculum.id });
  }, [navigation]);

  if (!isReady) return null;

  if (isError) {
    return (
      <ListLayout title="훈련 아카데미" onBack={() => navigation.goBack()}>
        <ErrorState
          title="훈련 정보를 불러올 수 없어요"
          onRetry={() => void refetch()}
        />
      </ListLayout>
    );
  }

  return (
    <ListLayout title="훈련 아카데미" onBack={() => navigation.goBack()}>
      {isLoading ? (
        <SkeletonAcademy />
      ) : CURRICULUMS.length === 0 ? (
        <EmptyState
          title="준비 중인 커리큘럼이에요"
          description="곧 새로운 훈련 과정이 열려요"
        />
      ) : (
        <>
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

          {/* AI 맞춤 추천 카드 */}
          {!activeProgress && (
            <RecommendationCard
              curriculumId={recommendation.primary}
              reasoning={recommendation.reasoning}
              onPress={() => {
                const c = CURRICULUMS.find((cur) => cur.id === recommendation.primary);
                if (c) handleCardPress(c);
              }}
            />
          )}

          {/* 커리큘럼 2열 그리드 */}
          <Text style={styles.sectionTitle}>전체 커리큘럼 ({CURRICULUMS.length})</Text>
          <View style={styles.grid}>
            {CURRICULUMS.map((curriculum) => {
              const progress = progressMap.get(curriculum.id);
              const status: CurriculumStatus = progress?.status ?? 'not_started';
              const isLocked = curriculum.access === 'pro' && !isPro;
              const isRecommended = curriculum.id === recommendedId && status === 'not_started';

              // 총 스텝 수 계산
              const totalSteps = curriculum.days.reduce((sum, d) => sum + d.steps.length, 0);
              const completedSteps = progress?.completed_steps?.length ?? 0;

              return (
                <View key={curriculum.id} style={styles.gridItem}>
                  <CurriculumCard
                    curriculum={curriculum}
                    status={status}
                    completedSteps={completedSteps}
                    totalSteps={totalSteps}
                    isRecommended={isRecommended}
                    isLocked={isLocked}
                    onPress={() => handleCardPress(curriculum)}
                  />
                </View>
              );
            })}
            {/* 홀수개일 때 마지막 열에 빈 공간 추가 */}
            {CURRICULUMS.length % 2 !== 0 && <View style={styles.gridItem} />}
          </View>

          {/* PRO 안내 */}
          {!isPro && (
            <View style={styles.proHint}>
              <Text style={styles.proHintIcon}>{'✨'}</Text>
              <Text style={styles.proHintText}>
                PRO 구독으로 모든 커리큘럼 + Plan C를 이용하세요
              </Text>
            </View>
          )}
        </>
      )}
    </ListLayout>
  );
}

// ──────────────────────────────────────
// 오늘의 훈련 카드
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
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '50%',
  },
  proHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  proHintIcon: {
    ...typography.sectionTitle,
    marginRight: 10,
  },
  proHintText: {
    flex: 1,
    ...typography.detail,
    color: colors.grey600,
  },
  // Today card
  todayCard: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
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
