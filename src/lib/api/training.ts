/**
 * 훈련 API — 진행 상태 CRUD
 * Parity: UI-001
 */
import { requestBackend } from './backend';
import { measureStartupAsync } from 'lib/performance/startupPerformance';
import type { TrainingProgress, CurriculumId, PlanVariant } from 'types/training';
import {
  normalizeVariant,
  parseStepIdentifier,
  summarizeBackendRows,
  type BackendTrainingStatusRow,
} from './training.transform';
import { clearTrainingRowsCache, getSharedTrainingRows } from './training.rows';

export type { BackendTrainingStatusRow };
export {
  submitStepFeedback,
  getStepFeedback,
  getStepAttempts,
  submitStepAttempt,
} from './training.feedback';

/** 전체 훈련 진행 상태 */
export async function getTrainingProgress(dogId: string): Promise<TrainingProgress[]> {
  const rows = await getSharedTrainingRows(dogId, 'progress');
  return summarizeBackendRows(rows);
}

/** 특정 커리큘럼 진행 상태 */
export async function getCurriculumProgress(
  dogId: string,
  curriculumId: CurriculumId
): Promise<TrainingProgress | null> {
  const progressList = await getTrainingProgress(dogId);
  return progressList.find((item) => item.curriculum_id === curriculumId) ?? null;
}

/** 훈련 시작 */
export async function startTraining(
  dogId: string,
  curriculumId: CurriculumId,
  variant: PlanVariant = 'A'
): Promise<TrainingProgress> {
  const created = await requestBackend<
    BackendTrainingStatusRow,
    { dog_id: string; curriculum_id: string; stage_id: string; step_number: number; status: string; current_variant: string; memo: string | null }
  >('/api/v1/training/status', {
    method: 'POST',
    body: {
      dog_id: dogId,
      curriculum_id: curriculumId,
      stage_id: 'day_1',
      step_number: 0,
      status: 'HIDDEN_BY_AI',
      current_variant: variant,
      memo: null,
    },
  });
  clearTrainingRowsCache(dogId);
  return {
    id: created.id,
    dog_id: created.dog_id,
    curriculum_id: curriculumId,
    current_day: 1,
    current_variant: normalizeVariant(created.current_variant),
    status: 'in_progress',
    completed_steps: [],
    memo: created.memo ?? null,
    started_at: created.created_at,
    updated_at: created.created_at,
  };
}

/** 스텝 완료 처리 */
export async function completeStep(
  _progressId: string,
  stepId: string,
  _currentSteps: string[],
  dogId: string,
): Promise<void> {
  const parsed = parseStepIdentifier(stepId);
  if (!parsed) throw new Error('TRAINING_STEP_ID_INVALID');
  await requestBackend('/api/v1/training/status', {
    method: 'POST',
    body: {
      dog_id: dogId,
      curriculum_id: parsed.curriculumId,
      stage_id: `day_${parsed.day}`,
      step_number: parsed.stepNumber,
      status: 'COMPLETED',
      current_variant: 'A',
      memo: null,
    },
  });
  clearTrainingRowsCache(dogId);
}

/** 스텝 완료 해제 (COMPLETED → HIDDEN_BY_AI) */
export async function uncompleteStep(
  stepId: string,
  dogId: string,
): Promise<void> {
  const parsed = parseStepIdentifier(stepId);
  if (!parsed) throw new Error('TRAINING_STEP_ID_INVALID');
  await requestBackend('/api/v1/training/status', {
    method: 'POST',
    body: {
      dog_id: dogId,
      curriculum_id: parsed.curriculumId,
      stage_id: `day_${parsed.day}`,
      step_number: parsed.stepNumber,
      status: 'HIDDEN_BY_AI',
      current_variant: 'A',
      memo: null,
    },
  });
  clearTrainingRowsCache(dogId);
}

/** Plan Variant 변경 */
export async function changeVariant(
  progressId: string,
  variant: PlanVariant
): Promise<void> {
  void progressId;
  void variant;
  throw new Error('TRAINING_VARIANT_CHANGE_REQUIRES_BACKEND_ENDPOINT');
}

/** 행동 분석 데이터 조회 (로그 기반 추천 엔진용) */
export async function getBehaviorAnalytics(dogId: string, days = 30): Promise<{
  total_logs: number;
  top_behaviors: string[];
  avg_intensity_by_behavior: Record<string, number>;
  weekly_trend: Record<string, string>;
  peak_hour: number | null;
  memo_keywords?: Record<string, string[]>;
} | null> {
  try {
    return await measureStartupAsync(
      'api_training_behavior_analytics_backend',
      { dogId, days },
      () => requestBackend(`/api/v1/dogs/${dogId}/behavior-analytics?days=${days}`),
    );
  } catch {
    return null;
  }
}
