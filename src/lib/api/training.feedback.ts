/**
 * training.feedback.ts — 스텝 피드백 + 시행착오 API
 * Parity: UI-001
 */
import { requestBackend } from './backend';
import { measureStartupAsync } from 'lib/performance/startupPerformance';
import type { DogReaction, StepFeedback } from 'types/training';
import {
  parseStepIdentifier,
  rowsToStepFeedback,
} from './training.transform';
import { clearTrainingRowsCache, getSharedTrainingRows } from './training.rows';

/** 스텝 피드백(반응) 저장 — user_training_status.reaction UPDATE */
export async function submitStepFeedback(
  dogId: string,
  stepId: string,
  reaction: DogReaction,
  memo: string | null,
): Promise<void> {
  const parsed = parseStepIdentifier(stepId);
  if (!parsed) throw new Error('TRAINING_STEP_ID_INVALID');

  await requestBackend('/api/v1/training/feedback', {
    method: 'POST',
    body: {
      dog_id: dogId,
      curriculum_id: parsed.curriculumId,
      stage_id: `day_${parsed.day}`,
      step_number: parsed.stepNumber,
      reaction,
      memo,
    },
  });
  clearTrainingRowsCache(dogId);
}

/** 피드백 조회 — reaction IS NOT NULL 행 (migration 미적용 시 빈 배열 반환) */
export async function getStepFeedback(
  dogId: string,
  curriculumId?: string,
): Promise<StepFeedback[]> {
  return measureStartupAsync(
    'api_training_feedback_from_rows',
    { dogId, curriculumId: curriculumId ?? null },
    async () => rowsToStepFeedback(await getSharedTrainingRows(dogId, 'feedback'), curriculumId),
  );
}

/** 시행착오 기록 조회 */
export async function getStepAttempts(
  dogId: string,
  stepId?: string,
): Promise<import('types/training').StepAttempt[]> {
  try {
    const url = stepId
      ? `/api/v1/dogs/${dogId}/step-attempts?step_id=${encodeURIComponent(stepId)}`
      : `/api/v1/dogs/${dogId}/step-attempts`;
    const rows = await requestBackend<Array<{
      id: string; step_id: string; curriculum_id: string; day_number: number;
      attempt_number: number; reaction?: string; situation_tags?: string[];
      method_used?: string; what_worked?: string; what_didnt_work?: string; created_at: string;
    }>>(url);
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      id: r.id,
      dog_id: dogId,
      step_id: r.step_id,
      curriculum_id: r.curriculum_id,
      day_number: r.day_number,
      attempt_number: r.attempt_number,
      reaction: r.reaction as import('types/training').DogReaction | undefined,
      situation_tags: r.situation_tags ?? [],
      method_used: r.method_used ?? undefined,
      what_worked: r.what_worked ?? undefined,
      what_didnt_work: r.what_didnt_work ?? undefined,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

/** 시행착오 상세 기록 저장 */
export async function submitStepAttempt(
  dogId: string,
  data: {
    step_id: string;
    curriculum_id: string;
    day_number: number;
    attempt_number?: number;
    reaction?: string;
    situation_tags?: string[];
    method_used?: string;
    what_worked?: string;
    what_didnt_work?: string;
  }
): Promise<void> {
  await requestBackend(`/api/v1/dogs/${dogId}/step-attempts`, {
    method: 'POST',
    body: {
      ...data,
      attempt_number: data.attempt_number ?? 1,
    },
  });
}
