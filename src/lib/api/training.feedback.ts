/**
 * training.feedback.ts — 스텝 피드백 + 시행착오 API
 * Parity: UI-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import type { DogReaction, StepFeedback, CurriculumId } from 'types/training';
import {
  parseStepIdentifier,
  toStepId,
  parseDayNumber,
  isMissingRelationError,
  isSchemaMismatchError,
} from './training.transform';

/** 스텝 피드백(반응) 저장 — user_training_status.reaction UPDATE */
export async function submitStepFeedback(
  dogId: string,
  stepId: string,
  reaction: DogReaction,
  memo: string | null,
): Promise<void> {
  const parsed = parseStepIdentifier(stepId);
  if (!parsed) throw new Error('TRAINING_STEP_ID_INVALID');

  return withBackendFallback(
    async () => {
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
    },
    async () => {
      const { error } = await supabase
        .from('user_training_status')
        .update({ reaction, memo })
        .eq('dog_id', dogId)
        .eq('curriculum_id', parsed.curriculumId)
        .eq('stage_id', `day_${parsed.day}`)
        .eq('step_number', parsed.stepNumber);
      if (error) {
        if (isMissingRelationError(error) || isSchemaMismatchError(error)) return;
        throw error;
      }
    },
  );
}

/** 피드백 조회 — reaction IS NOT NULL 행 (migration 미적용 시 빈 배열 반환) */
export async function getStepFeedback(
  dogId: string,
  curriculumId?: string,
): Promise<StepFeedback[]> {
  return withBackendFallback(
    async () => {
      const url = curriculumId
        ? `/api/v1/training/feedback/${dogId}?curriculum_id=${curriculumId}`
        : `/api/v1/training/feedback/${dogId}`;
      const rows = await requestBackend<Array<{
        id: string; user_id: string; dog_id: string; curriculum_id: string;
        stage_id: string; step_number: number; status: string; current_variant?: string;
        memo?: string | null; reaction?: string | null; created_at: string;
      }>>(url);
      if (!Array.isArray(rows)) return [];
      return rows
        .filter((r) => r.reaction)
        .map((r) => ({
          step_id: toStepId(r.curriculum_id, parseDayNumber(r.stage_id), r.step_number),
          curriculum_id: r.curriculum_id as CurriculumId,
          day: parseDayNumber(r.stage_id),
          step_number: r.step_number,
          reaction: r.reaction as DogReaction,
          memo: r.memo ?? null,
        }));
    },
    async () => {
      let query = supabase
        .from('user_training_status')
        .select('*')
        .eq('dog_id', dogId);
      if (curriculumId) {
        query = query.eq('curriculum_id', curriculumId);
      }
      const { data, error } = await query;
      if (error) {
        if (isMissingRelationError(error) || isSchemaMismatchError(error)) return [];
        throw error;
      }
      if (!data) return [];
      return (data as Array<{ curriculum_id: string; stage_id: string; step_number: number; reaction?: string | null; memo?: string | null }>)
        .filter((r) => r.reaction)
        .map((r) => ({
          step_id: toStepId(r.curriculum_id, parseDayNumber(r.stage_id), r.step_number),
          curriculum_id: r.curriculum_id as CurriculumId,
          day: parseDayNumber(r.stage_id),
          step_number: r.step_number,
          reaction: r.reaction as DogReaction,
          memo: r.memo ?? null,
        }));
    },
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
  const { error } = await supabase
    .from('training_step_attempts')
    .insert({
      dog_id: dogId,
      ...data,
      attempt_number: data.attempt_number ?? 1,
    });
  if (error) throw error;
}
