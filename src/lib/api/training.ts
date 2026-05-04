/**
 * 훈련 API — 진행 상태 CRUD
 * Parity: UI-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import type { TrainingProgress, CurriculumId, PlanVariant } from 'types/training';
import {
  normalizeVariant,
  getCurrentUserId,
  isMissingRelationError,
  parseStepIdentifier,
  summarizeBackendRows,
  type BackendTrainingStatusRow,
} from './training.transform';

export type { BackendTrainingStatusRow };
export {
  submitStepFeedback,
  getStepFeedback,
  getStepAttempts,
  submitStepAttempt,
} from './training.feedback';

async function getTrainingProgressFromSupabase(dogId: string): Promise<TrainingProgress[]> {
  const { data, error } = await supabase
    .from('user_training_status')
    .select('*')
    .eq('dog_id', dogId)
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  if (!data || data.length === 0) return [];
  return summarizeBackendRows(data as BackendTrainingStatusRow[]);
}

async function getTrainingProgressFromBackend(dogId: string): Promise<TrainingProgress[]> {
  const rows = await requestBackend<BackendTrainingStatusRow[]>(`/api/v1/training/${dogId}`);
  if (!Array.isArray(rows)) return [];
  return summarizeBackendRows(rows);
}

/** 전체 훈련 진행 상태 */
export async function getTrainingProgress(dogId: string): Promise<TrainingProgress[]> {
  return withBackendFallback(
    () => getTrainingProgressFromBackend(dogId),
    () => getTrainingProgressFromSupabase(dogId),
  );
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
  return withBackendFallback<TrainingProgress>(
    async () => {
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
    },
    async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('user_training_status')
        .upsert(
          {
            user_id: userId,
            dog_id: dogId,
            curriculum_id: curriculumId,
            stage_id: 'day_1',
            step_number: 0,
            status: 'HIDDEN_BY_AI',
            current_variant: variant,
            memo: null,
          },
          { onConflict: 'user_id,curriculum_id,stage_id,step_number' },
        )
        .select()
        .single();
      if (error) throw error;
      const row = data as BackendTrainingStatusRow;
      return {
        id: row.id,
        dog_id: row.dog_id,
        curriculum_id: curriculumId,
        current_day: 1,
        current_variant: normalizeVariant(row.current_variant),
        status: 'in_progress' as const,
        completed_steps: [],
        memo: row.memo ?? null,
        started_at: row.created_at,
        updated_at: row.created_at,
      };
    },
  );
}

/** 스텝 완료 처리 */
export async function completeStep(
  _progressId: string,
  stepId: string,
  _currentSteps: string[],
  dogId: string,
): Promise<void> {
  return withBackendFallback(
    async () => {
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
    },
    async () => {
      const parsed = parseStepIdentifier(stepId);
      if (!parsed) return;
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from('user_training_status')
        .upsert(
          {
            user_id: userId,
            dog_id: dogId,
            curriculum_id: parsed.curriculumId,
            stage_id: `day_${parsed.day}`,
            step_number: parsed.stepNumber,
            status: 'COMPLETED',
            current_variant: 'A',
            memo: null,
          },
          { onConflict: 'user_id,curriculum_id,stage_id,step_number' },
        );
      if (error) {
        if (isMissingRelationError(error)) return;
        throw error;
      }
    },
  );
}

/** 스텝 완료 해제 (COMPLETED → HIDDEN_BY_AI) */
export async function uncompleteStep(
  stepId: string,
  dogId: string,
): Promise<void> {
  return withBackendFallback(
    async () => {
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
    },
    async () => {
      const parsed = parseStepIdentifier(stepId);
      if (!parsed) return;
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from('user_training_status')
        .upsert(
          {
            user_id: userId,
            dog_id: dogId,
            curriculum_id: parsed.curriculumId,
            stage_id: `day_${parsed.day}`,
            step_number: parsed.stepNumber,
            status: 'HIDDEN_BY_AI',
            current_variant: 'A',
            memo: null,
          },
          { onConflict: 'user_id,curriculum_id,stage_id,step_number' },
        );
      if (error) {
        if (isMissingRelationError(error)) return;
        throw error;
      }
    },
  );
}

/** Plan Variant 변경 */
export async function changeVariant(
  progressId: string,
  variant: PlanVariant
): Promise<void> {
  const { error } = await supabase
    .from('user_training_status')
    .update({ current_variant: variant })
    .eq('id', progressId);
  if (error) throw error;
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
    return await requestBackend(`/api/v1/dogs/${dogId}/behavior-analytics?days=${days}`);
  } catch {
    return null;
  }
}
