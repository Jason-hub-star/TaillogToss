/**
 * 훈련 API — 진행 상태 CRUD
 * Parity: UI-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import { getCurriculumById } from 'lib/data/published/runtime';
import type { TrainingProgress, CurriculumId, PlanVariant, DogReaction, StepFeedback } from 'types/training';

interface BackendTrainingStatusRow {
  id: string;
  user_id: string;
  dog_id: string;
  curriculum_id: string;
  stage_id: string;
  step_number: number;
  status: string;
  current_variant?: string;
  memo?: string | null;
  reaction?: string | null;
  created_at: string;
}

const MISSING_RELATION_CODES = new Set(['42P01', 'PGRST205']);
// 42703 = undefined_column, PGRST204 = column not found in schema cache
const SCHEMA_MISMATCH_CODES = new Set(['42703', 'PGRST204']);

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return MISSING_RELATION_CODES.has(code);
}

function isSchemaMismatchError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return SCHEMA_MISMATCH_CODES.has(code) || MISSING_RELATION_CODES.has(code);
}

function normalizeVariant(value: string | undefined): PlanVariant {
  if (value === 'B' || value === 'C') return value;
  return 'A';
}

function parseDayNumber(stageId: string): number {
  const match = stageId.match(/(\d+)/);
  if (!match) return 1;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseStepIdentifier(stepId: string): { curriculumId: CurriculumId; day: number; stepNumber: number } | null {
  const match = stepId.match(/^(.*)_d(\d+)_s(\d+)$/);
  if (!match) return null;

  const curriculumId = match[1] as CurriculumId;
  const day = Number(match[2]);
  const stepNumber = Number(match[3]);
  if (!Number.isFinite(day) || !Number.isFinite(stepNumber)) return null;

  return { curriculumId, day, stepNumber };
}

function toStepId(curriculumId: string, day: number, stepNumber: number): string {
  const curriculum = getCurriculumById(curriculumId as CurriculumId);
  if (!curriculum) return `${curriculumId}_d${day}_s${stepNumber}`;

  const dayData = curriculum.days.find((d) => d.day_number === day);
  if (!dayData) return `${curriculumId}_d${day}_s${stepNumber}`;

  const matched = dayData.steps.find((s) => s.order === stepNumber) ?? dayData.steps[stepNumber - 1];
  return matched?.id ?? `${curriculumId}_d${day}_s${stepNumber}`;
}

function summarizeBackendRows(rows: BackendTrainingStatusRow[]): TrainingProgress[] {
  const grouped = new Map<string, BackendTrainingStatusRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.curriculum_id) ?? [];
    list.push(row);
    grouped.set(row.curriculum_id, list);
  }

  const result: TrainingProgress[] = [];

  for (const [curriculumId, statusRows] of grouped.entries()) {
    const sortedRows = [...statusRows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const latest = sortedRows[sortedRows.length - 1];
    if (!latest) continue;

    const completedStepIds = new Set<string>();
    for (const row of sortedRows) {
      if (row.status !== 'COMPLETED') continue;
      const day = parseDayNumber(row.stage_id);
      completedStepIds.add(toStepId(curriculumId, day, row.step_number));
    }

    const curriculum = getCurriculumById(curriculumId as CurriculumId);
    const totalSteps = curriculum
      ? curriculum.days.reduce((sum, day) => sum + day.steps.length, 0)
      : completedStepIds.size;

    let currentDay = parseDayNumber(latest.stage_id);
    if (curriculum) {
      currentDay = curriculum.total_days;
      for (const day of curriculum.days) {
        const allCompleted = day.steps.every((step) => completedStepIds.has(step.id));
        if (!allCompleted) {
          currentDay = day.day_number;
          break;
        }
      }
    }

    const status = totalSteps > 0 && completedStepIds.size >= totalSteps ? 'completed' : 'in_progress';
    const startedAt = sortedRows[0]?.created_at ?? latest.created_at;

    result.push({
      id: latest.id,
      dog_id: latest.dog_id,
      curriculum_id: curriculumId as CurriculumId,
      current_day: currentDay,
      current_variant: normalizeVariant(latest.current_variant),
      status,
      completed_steps: [...completedStepIds],
      memo: latest.memo ?? null,
      started_at: startedAt,
      updated_at: latest.created_at,
    });
  }

  return result;
}

async function getTrainingProgressFromSupabase(dogId: string): Promise<TrainingProgress[]> {
  // user_training_status는 row-per-step 구조 → summarizeBackendRows로 요약
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
        {
          dog_id: string;
          curriculum_id: string;
          stage_id: string;
          step_number: number;
          status: string;
          current_variant: string;
          memo: string | null;
        }
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
      const { data, error } = await supabase
        .from('user_training_status')
        .upsert(
          {
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
      if (!parsed) {
        throw new Error('TRAINING_STEP_ID_INVALID');
      }
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
      const { error } = await supabase
        .from('user_training_status')
        .upsert(
          {
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
      if (!parsed) {
        throw new Error('TRAINING_STEP_ID_INVALID');
      }
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
      const { error } = await supabase
        .from('user_training_status')
        .upsert(
          {
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
        // 42703: reaction column not yet migrated — silently skip
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
      const rows = await requestBackend<BackendTrainingStatusRow[]>(url);
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
        // 42703: reaction column not yet migrated — return empty
        if (isMissingRelationError(error) || isSchemaMismatchError(error)) return [];
        throw error;
      }
      if (!data) return [];
      // Filter client-side (column may not exist before migration)
      return (data as BackendTrainingStatusRow[])
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
