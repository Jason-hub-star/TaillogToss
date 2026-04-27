/**
 * 훈련 상세 화면 — Day 탭 + 스텝 체크리스트 + Plan A/B/C 전환 + 미션 완료
 * DetailLayout (패턴B) — 커리큘럼 제목
 * Parity: UI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { MissionChecklist } from 'components/features/training/MissionChecklist';
import { VariantSelector } from 'components/features/training/VariantSelector';
import { PlanSelector } from 'components/features/coaching/PlanSelector';
import { StepCompletionSheet } from 'components/features/training/StepCompletionSheet';
import { DaySummarySheet } from 'components/features/training/DaySummarySheet';
import { CurriculumHeroCard } from 'components/features/training/CurriculumHeroCard';
import { DayProgressIndicator } from 'components/features/training/DayProgressIndicator';
import { DayTabBar } from 'components/features/training/DayTabBar';
import { CelebrationModal } from 'components/features/training/CelebrationModal';
import { AttemptHistorySheet } from 'components/features/training/AttemptHistorySheet';
import { useProUpgradeSheet } from 'lib/hooks/useProUpgradeSheet';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { Toast } from 'components/tds-ext/Toast';
import { getCurriculumById } from 'lib/data/published/runtime';
import { useTrainingProgress, useCompleteStep, useUncompleteStep, useStartTraining, useStepFeedback, useSubmitStepFeedback, useSubmitStepAttempt, useStepAttempts } from 'lib/hooks/useTraining';
import { useDogEnv } from 'lib/hooks/useDogs';
import { recommendPlan } from 'lib/data/recommendation/engine';
import { ReactionTrendBar } from 'components/features/training/ReactionTrendBar';
import { StreakBadge } from 'components/features/training/StreakBadge';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { tracker } from 'lib/analytics/tracker';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import type { CurriculumId, PlanVariant, TrainingProgress, DogReaction } from 'types/training';
import { colors, typography, spacing } from 'styles/tokens';

export const Route = createRoute('/training/detail', {
  validateParams: (params) => params as { curriculum_id: CurriculumId },
  component: TrainingDetailPage,
  screenOptions: { headerShown: false },
});

function TrainingDetailPage() {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/training/detail' });
  const { data: progressList, isLoading, isError, refetch } = useTrainingProgress(activeDog?.id);
  const { data: dogEnv } = useDogEnv(activeDog?.id);

  const { curriculum_id: curriculumId } = Route.useParams();
  const [showCelebration, setShowCelebration] = useState(false);

  const curriculum = useMemo(() => getCurriculumById(curriculumId), [curriculumId]);

  const progress = useMemo<TrainingProgress | null>(() => {
    if (!Array.isArray(progressList)) return null;
    return progressList.find((p: TrainingProgress) => p.curriculum_id === curriculumId) ?? null;
  }, [progressList, curriculumId]);

  const [selectedDay, setSelectedDay] = useState(1);
  const [variant, setVariant] = useState<PlanVariant>('A');
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [hasSyncedProgress, setHasSyncedProgress] = useState(false);

  useEffect(() => {
    if (hasSyncedProgress) return;
    if (progress) {
      setSelectedDay(progress.current_day);
      const syncedVariant = progress.current_variant;
      setVariant(!isPro && syncedVariant !== 'A' ? 'A' : syncedVariant);
      setHasSyncedProgress(true);
      return;
    }
    // 훈련 첫 시작 — dogEnv 로드 완료 후 Plan 자동 추천
    if (!isLoading && dogEnv !== undefined) {
      const env = dogEnv as any;
      const recommended = recommendPlan({
        birthDate: activeDog?.birth_date,
        weightKg: activeDog?.weight_kg,
        hasPain: env?.health_meta?.physical_stats?.has_pain,
        energyScore: env?.activity_meta?.energy_score,
        playReward: env?.activity_meta?.rewards_meta?.play,
        noiseSensitivity: env?.household_info?.noise_sensitivity,
        behaviors: env?.health_meta?.chronic_issues,
      });
      setVariant(!isPro && recommended !== 'A' ? 'A' : recommended);
      setHasSyncedProgress(true);
    }
  }, [progress, hasSyncedProgress, isLoading, activeDog, dogEnv, isPro]);

  const [feedbackStepId, setFeedbackStepId] = useState<string | null>(null);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [dayReactions, setDayReactions] = useState<DogReaction[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAttemptHistory, setShowAttemptHistory] = useState(false);
  const { show: showProUpgrade, SheetNode: ProUpgradeSheetNode } = useProUpgradeSheet();

  const startTraining = useStartTraining();
  const completeStep = useCompleteStep();
  const uncompleteStep = useUncompleteStep();
  const submitFeedback = useSubmitStepFeedback();
  const submitStepAttempt = useSubmitStepAttempt();
  const { data: stepFeedbackList } = useStepFeedback(activeDog?.id, curriculumId);
  const [attemptStepId, setAttemptStepId] = useState<string | undefined>(undefined);
  const { data: stepAttempts } = useStepAttempts(activeDog?.id, attemptStepId);

  const streakDays = useMemo(() => (progress ? Math.max(0, progress.current_day - 1) : 0), [progress]);

  const recentReactions = useMemo(
    () => stepFeedbackList?.map((f) => f.reaction).filter((r): r is DogReaction => !!r) ?? [],
    [stepFeedbackList],
  );

  const currentDay = useMemo(
    () => curriculum?.days.find((d) => d.day_number === selectedDay) ?? null,
    [curriculum, selectedDay],
  );

  const completedStepIds = useMemo(() => {
    if (!progress) return [];
    return progress.completed_steps.filter((id) => id.includes(`_d${selectedDay}_`));
  }, [progress, selectedDay]);

  const allDayStepsCompleted = useMemo(() => {
    if (!currentDay) return false;
    return currentDay.steps.every((s) => completedStepIds.includes(s.id));
  }, [currentDay, completedStepIds]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleToggleStep = useCallback(
    (stepId: string) => {
      if (!activeDog?.id) return;
      if (startTraining.isPending || completeStep.isPending || uncompleteStep.isPending) return;

      if (!progress) {
        setFeedbackStepId(stepId);
        startTraining.mutate(
          { dogId: activeDog.id, curriculumId, variant },
          {
            onSuccess: (newProgress) => {
              completeStep.mutate({
                progressId: newProgress.id,
                stepId,
                currentSteps: [],
                dogId: activeDog.id,
              }, {
                onSuccess: () => tracker.trainingStepCompleted(curriculumId, stepId),
              });
            },
            onError: () => setFeedbackStepId(null),
          },
        );
        return;
      }

      const isAlreadyCompleted = progress.completed_steps.includes(stepId);
      if (isAlreadyCompleted) {
        uncompleteStep.mutate({ stepId, dogId: activeDog.id }, {
          onSuccess: () => setToastMessage('체크 해제됨'),
        });
        return;
      }

      setFeedbackStepId(stepId);
      tracker.trainingStepCompleted(curriculumId, stepId);
      completeStep.mutate({
        progressId: progress.id,
        stepId,
        currentSteps: progress.completed_steps,
        dogId: activeDog.id,
      });
    },
    [progress, activeDog?.id, curriculumId, variant, startTraining, completeStep, uncompleteStep],
  );

  const handleFeedbackSubmit = useCallback(
    (
      reaction: DogReaction,
      memo: string | null,
      detailData?: { situationTags: string[]; whatWorked: string; whatDidntWork: string },
    ) => {
      if (!feedbackStepId || !activeDog?.id) return;
      submitFeedback.mutate({ dogId: activeDog.id, stepId: feedbackStepId, reaction, memo });
      if (detailData) {
        submitStepAttempt.mutate({
          dogId: activeDog.id,
          data: {
            step_id: feedbackStepId,
            curriculum_id: curriculumId,
            day_number: selectedDay,
            reaction,
            situation_tags: detailData.situationTags.length > 0 ? detailData.situationTags : undefined,
            what_worked: detailData.whatWorked || undefined,
            what_didnt_work: detailData.whatDidntWork || undefined,
          },
        });
      }
      setDayReactions((prev) => [...prev, reaction]);
    },
    [feedbackStepId, activeDog?.id, submitFeedback, submitStepAttempt, curriculumId, selectedDay],
  );

  const handleFeedbackSaved = useCallback(() => {
    const closingStepId = feedbackStepId;
    setFeedbackStepId(null);
    if (currentDay && closingStepId) {
      const updatedCompleted = [...completedStepIds, closingStepId];
      if (currentDay.steps.every((s) => updatedCompleted.includes(s.id))) {
        setShowDaySummary(true);
      }
    }
  }, [feedbackStepId, currentDay, completedStepIds]);

  const handleFeedbackSkip = useCallback(() => {
    const skippedStepId = feedbackStepId;
    setFeedbackStepId(null);
    setToastMessage('훈련 완료');
    if (currentDay && skippedStepId) {
      const updatedCompleted = [...completedStepIds, skippedStepId];
      if (currentDay.steps.every((s) => updatedCompleted.includes(s.id))) {
        setShowDaySummary(true);
      }
    }
  }, [feedbackStepId, currentDay, completedStepIds]);

  const handleVariantChange = useCallback((v: PlanVariant) => {
    setVariant(v);
    setShowPlanSelector(false);
  }, []);

  const handleMissionComplete = useCallback(() => {
    if (!curriculum) return;
    const nextDay = selectedDay + 1;
    if (nextDay <= curriculum.total_days) {
      setSelectedDay(nextDay);
    } else {
      setShowCelebration(true);
    }
  }, [curriculum, selectedDay]);

  const handleDaySummaryNext = useCallback(() => {
    setShowDaySummary(false);
    setDayReactions([]);
    handleMissionComplete();
  }, [handleMissionComplete]);

  if (!isReady) return null;

  if (!curriculum) {
    return (
      <DetailLayout title="훈련" onBack={handleBack}>
        <EmptyState title="커리큘럼을 찾을 수 없어요" icon="📚" />
      </DetailLayout>
    );
  }

  if (isLoading) {
    return (
      <DetailLayout title={curriculum.title} onBack={handleBack}>
        <View style={styles.loadingContainer}>
          <View style={styles.lottieHeader}>
            <LottieAnimation asset="cute-doggie" size={64} />
            <Text style={styles.loadingText}>훈련 정보 로딩 중...</Text>
          </View>
          <SkeletonBox width="60%" height={16} borderRadius={4} />
          <SkeletonBox width="100%" height={4} borderRadius={2} style={{ marginTop: 12 }} />
          <View style={styles.loadingSkeleton}>
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} width="100%" height={80} borderRadius={12} style={{ marginBottom: 8 }} />
            ))}
          </View>
        </View>
      </DetailLayout>
    );
  }

  if (isError) {
    return (
      <DetailLayout title={curriculum.title} onBack={handleBack}>
        <ErrorState onRetry={() => void refetch()} />
      </DetailLayout>
    );
  }

  return (
    <DetailLayout
      title={curriculum.title}
      onBack={handleBack}
      bottomCTA={
        allDayStepsCompleted
          ? {
              label: selectedDay < curriculum.total_days ? '다음 Day로' : '미션 완료!',
              onPress: handleMissionComplete,
            }
          : undefined
      }
    >
      <CurriculumHeroCard
        curriculumId={curriculumId}
        title={curriculum.title}
        difficulty={curriculum.difficulty}
      />

      <StreakBadge streakDays={streakDays} />

      <DayProgressIndicator selectedDay={selectedDay} totalDays={curriculum.total_days} />

      <DayTabBar
        days={curriculum.days}
        selectedDay={selectedDay}
        onSelect={setSelectedDay}
      />

      {currentDay && (
        <>
          <Text style={styles.dayTitle}>{currentDay.title}</Text>
          <Text style={styles.dayDescription}>{currentDay.description}</Text>

          <VariantSelector
            current={variant}
            onChange={setVariant}
            isPro={isPro ?? false}
            planMeta={curriculum?.planMeta}
            onProCTA={showProUpgrade}
          />

          <MissionChecklist
            steps={currentDay.steps}
            completedStepIds={completedStepIds}
            currentVariant={variant}
            onToggleStep={handleToggleStep}
          />

          {recentReactions.length > 0 && (
            <ReactionTrendBar reactions={recentReactions} isPro={isPro ?? false} />
          )}

          <TouchableOpacity
            style={styles.difficultyLink}
            onPress={() => setShowPlanSelector(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.difficultyLinkText}>어려워요? 다른 방법 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => {
              if (!isPro) {
                showProUpgrade();
                return;
              }
              setAttemptStepId(feedbackStepId ?? undefined);
              setShowAttemptHistory(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.historyLinkText}>시도 이력 보기</Text>
          </TouchableOpacity>

          <PlanSelector
            visible={showPlanSelector}
            currentVariant={variant}
            variantNotes={currentDay.variant_notes}
            onSelect={handleVariantChange}
            onClose={() => setShowPlanSelector(false)}
          />
        </>
      )}

      <StepCompletionSheet
        visible={!!feedbackStepId}
        dogName={activeDog?.name ?? '강아지'}
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
        onSaved={handleFeedbackSaved}
      />

      <DaySummarySheet
        visible={showDaySummary}
        dayNumber={selectedDay}
        reactions={dayReactions}
        isLastDay={selectedDay >= (curriculum?.total_days ?? 1)}
        onNext={handleDaySummaryNext}
      />

      <Toast
        message={toastMessage ?? ''}
        visible={!!toastMessage}
        onDismiss={() => setToastMessage(null)}
      />

      <AttemptHistorySheet
        visible={showAttemptHistory}
        attempts={stepAttempts ?? []}
        onClose={() => setShowAttemptHistory(false)}
      />

      {ProUpgradeSheetNode}

      <CelebrationModal
        visible={showCelebration}
        curriculumTitle={curriculum.title}
        onClose={() => {
          setShowCelebration(false);
          navigation.navigate('/training/academy');
        }}
        onCoaching={() => {
          setShowCelebration(false);
          navigation.navigate('/coaching/result');
        }}
      />
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 20,
  },
  lottieHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  loadingSkeleton: {
    marginTop: 20,
    gap: 8,
  },
  dayTitle: {
    ...typography.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dayDescription: {
    ...typography.bodySmall,
    color: colors.grey700,
    marginBottom: 20,
  },
  difficultyLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  difficultyLinkText: {
    ...typography.detail,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  historyLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  historyLinkText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
