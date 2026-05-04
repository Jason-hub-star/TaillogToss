/**
 * training.transform.ts — 내부 타입 + 순수 변환 유틸
 * training.ts에서만 import. 직접 사용 금지.
 * Parity: UI-001
 */
import { getCurriculumById } from 'lib/data/published/runtime';
import type { TrainingProgress, CurriculumId, PlanVariant } from 'types/training';
import { supabase } from './supabase';

export interface BackendTrainingStatusRow {
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

export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return MISSING_RELATION_CODES.has(code);
}

export function isSchemaMismatchError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return SCHEMA_MISMATCH_CODES.has(code) || MISSING_RELATION_CODES.has(code);
}

export function normalizeVariant(value: string | undefined): PlanVariant {
  if (value === 'B' || value === 'C') return value;
  return 'A';
}

export async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('BACKEND_AUTH_MISSING');
  return uid;
}

export function parseDayNumber(stageId: string): number {
  const match = stageId.match(/(\d+)/);
  if (!match) return 1;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseStepIdentifier(stepId: string): { curriculumId: CurriculumId; day: number; stepNumber: number } | null {
  const match = stepId.match(/^(.*)_d(\d+)_s(\d+)$/);
  if (!match) return null;
  const curriculumId = match[1] as CurriculumId;
  const day = Number(match[2]);
  const stepNumber = Number(match[3]);
  if (!Number.isFinite(day) || !Number.isFinite(stepNumber)) return null;
  return { curriculumId, day, stepNumber };
}

export function toStepId(curriculumId: string, day: number, stepNumber: number): string {
  const curriculum = getCurriculumById(curriculumId as CurriculumId);
  if (!curriculum) return `${curriculumId}_d${day}_s${stepNumber}`;
  const dayData = curriculum.days.find((d) => d.day_number === day);
  if (!dayData) return `${curriculumId}_d${day}_s${stepNumber}`;
  const matched = dayData.steps.find((s) => s.order === stepNumber) ?? dayData.steps[stepNumber - 1];
  return matched?.id ?? `${curriculumId}_d${day}_s${stepNumber}`;
}

export function summarizeBackendRows(rows: BackendTrainingStatusRow[]): TrainingProgress[] {
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
