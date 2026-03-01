/**
 * 훈련 상세 화면 — Day 탭 + 스텝 체크리스트 + Plan A/B/C 전환 + 미션 완료
 * DetailLayout (패턴B) — 커리큘럼 제목
 * Parity: UI-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { MissionChecklist } from 'components/features/training/MissionChecklist';
import { VariantSelector } from 'components/features/training/VariantSelector';
import { PlanSelector } from 'components/features/coaching/PlanSelector';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { getCurriculumById } from 'lib/data/curriculum';
import { useTrainingProgress, useCompleteStep, useStartTraining } from 'lib/hooks/useTraining';
import { useIsPro } from 'lib/hooks/useSubscription';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { tracker } from 'lib/analytics/tracker';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useAuth } from 'stores/AuthContext';
import type { CurriculumId, PlanVariant, TrainingProgress } from 'types/training';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/training/detail', {
  validateParams: (params) => params as { curriculum_id: CurriculumId },
  component: TrainingDetailPage,
});

function TrainingDetailPage() {
  const { user } = useAuth();
  const { activeDog } = useActiveDog();
  const isPro = useIsPro(user?.id);
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/training/detail' });
  const { data: progressList, isLoading, isError, refetch } = useTrainingProgress(activeDog?.id);

  const { curriculum_id: curriculumId } = Route.useParams();
  const [showCelebration, setShowCelebration] = useState(false);

  const curriculum = useMemo(() => getCurriculumById(curriculumId), [curriculumId]);

  // 현재 커리큘럼의 progress 찾기
  const progress = useMemo<TrainingProgress | null>(() => {
    if (!Array.isArray(progressList)) return null;
    return progressList.find((p: TrainingProgress) => p.curriculum_id === curriculumId) ?? null;
  }, [progressList, curriculumId]);

  // State
  const [selectedDay, setSelectedDay] = useState(1);
  const [variant, setVariant] = useState<PlanVariant>('A');
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [hasSyncedProgress, setHasSyncedProgress] = useState(false);

  // progress 로드 후 selectedDay/variant 동기화 (초기 1회)
  useEffect(() => {
    if (progress && !hasSyncedProgress) {
      setSelectedDay(progress.current_day);
      setVariant(progress.current_variant);
      setHasSyncedProgress(true);
    }
  }, [progress, hasSyncedProgress]);

  // Mutations
  const startTraining = useStartTraining();
  const completeStep = useCompleteStep();

  const currentDay = useMemo(() => {
    return curriculum?.days.find((d) => d.day_number === selectedDay) ?? null;
  }, [curriculum, selectedDay]);

  const completedStepIds = useMemo(() => {
    if (!progress) return [];
    // 현재 day의 step만 필터 (step id에 day 번호 포함)
    return progress.completed_steps.filter((id) => id.includes(`_d${selectedDay}_`));
  }, [progress, selectedDay]);

  const allDayStepsCompleted = useMemo(() => {
    if (!currentDay) return false;
    return currentDay.steps.every((s) => completedStepIds.includes(s.id));
  }, [currentDay, completedStepIds]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggleStep = useCallback(
    (stepId: string) => {
      if (!progress || !activeDog?.id) {
        // 훈련 미시작 → 먼저 시작
        if (activeDog?.id) {
          startTraining.mutate(
            { dogId: activeDog.id, curriculumId, variant },
            {
              onSuccess: () => {
                // 시작 후 step 완료는 다음 렌더에서 가능
              },
            },
          );
        }
        return;
      }

      const isAlreadyCompleted = progress.completed_steps.includes(stepId);
      if (isAlreadyCompleted) return; // 이미 완료된 건 토글 안 함

      completeStep.mutate({
        progressId: progress.id,
        stepId,
        currentSteps: progress.completed_steps,
        dogId: activeDog.id,
      }, {
        onSuccess: () => {
          tracker.trainingStepCompleted(curriculumId, stepId);
        },
      });
    },
    [progress, activeDog?.id, curriculumId, variant, startTraining, completeStep],
  );

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

  const handleCelebrationClose = useCallback(() => {
    setShowCelebration(false);
    navigation.navigate('/training/academy');
  }, [navigation]);

  if (!isReady) return null;

  if (!curriculum) {
    return (
      <DetailLayout title="훈련" onBack={handleBack}>
        <EmptyState
          title="커리큘럼을 찾을 수 없어요"
          icon="📚"
        />
      </DetailLayout>
    );
  }

  if (isLoading) {
    return (
      <DetailLayout title={curriculum.title} onBack={handleBack}>
        <View style={styles.loadingContainer}>
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
      {/* Day 진행 상태 */}
      <View style={styles.dayIndicator}>
        <Text style={styles.dayIndicatorText}>
          Day {selectedDay} / {curriculum.total_days}
        </Text>
        <View style={styles.dayProgress}>
          <View
            style={[
              styles.dayProgressFill,
              { width: `${(selectedDay / curriculum.total_days) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Day 선택 탭 */}
      <View style={styles.dayTabs}>
        {curriculum.days.map((day) => {
          const isActive = day.day_number === selectedDay;
          return (
            <TouchableOpacity
              key={day.day_number}
              style={[styles.dayTab, isActive && styles.dayTabActive]}
              onPress={() => setSelectedDay(day.day_number)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                Day {day.day_number}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 현재 Day 정보 */}
      {currentDay && (
        <>
          <Text style={styles.dayTitle}>{currentDay.title}</Text>
          <Text style={styles.dayDescription}>{currentDay.description}</Text>

          {/* Plan A/B/C 전환 */}
          <VariantSelector
            current={variant}
            onChange={setVariant}
            isPro={isPro ?? false}
          />

          {/* 스텝 체크리스트 */}
          <MissionChecklist
            steps={currentDay.steps}
            completedStepIds={completedStepIds}
            currentVariant={variant}
            onToggleStep={handleToggleStep}
          />

          {/* "어려워요?" 링크 → Plan B/C 바텀시트 */}
          <TouchableOpacity
            style={styles.difficultyLink}
            onPress={() => setShowPlanSelector(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.difficultyLinkText}>어려워요? 다른 방법 보기</Text>
          </TouchableOpacity>

          {/* Plan 선택 바텀시트 */}
          <PlanSelector
            visible={showPlanSelector}
            currentVariant={variant}
            variantNotes={currentDay.variant_notes}
            isPro={isPro ?? false}
            onSelect={handleVariantChange}
            onClose={() => setShowPlanSelector(false)}
          />
        </>
      )}

      {/* 커리큘럼 완료 축하 모달 */}
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <LottieAnimation asset="cute-doggie" size={120} loop={false} />
            <Text style={styles.celebrationTitle}>축하합니다!</Text>
            <Text style={styles.celebrationDescription}>
              {curriculum.title} 커리큘럼을 모두 완료했어요!
            </Text>
            <TouchableOpacity
              style={styles.celebrationButton}
              onPress={handleCelebrationClose}
              activeOpacity={0.8}
            >
              <Text style={styles.celebrationButtonText}>아카데미로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 20,
  },
  loadingSkeleton: {
    marginTop: 20,
    gap: 8,
  },
  dayIndicator: {
    marginBottom: 16,
  },
  dayIndicatorText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dayProgress: {
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    backgroundColor: colors.primaryBlue,
    borderRadius: 2,
  },
  dayTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.divider,
  },
  dayTabActive: {
    backgroundColor: colors.primaryBlue,
  },
  dayTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTabTextActive: {
    color: colors.white,
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
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  celebrationCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  celebrationLottie: {
    marginBottom: 16,
    alignItems: 'center',
  },
  celebrationTitle: {
    ...typography.pageTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  celebrationDescription: {
    ...typography.bodySmall,
    color: colors.grey700,
    textAlign: 'center',
    marginBottom: 24,
  },
  celebrationButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  celebrationButtonText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.white,
  },
});
