/**
 * AI 코칭 API — 코칭 결과 조회/생성
 * Parity: AI-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback, type BackendApiError } from './backend';
import type { CoachingResult, ActionTracker, ReportType } from 'types/coaching';

// ── 코칭 생성 (백엔드 전용, Supabase fallback 없음) ──

export interface GenerateCoachingRequest {
  dog_id: string;
  report_type?: ReportType;
  user_context?: string;
}

export interface GenerateCoachingError {
  status: number;
  remaining?: number;
  retryAfterSec?: number;
  message: string;
}

/** AI 코칭 생성 — 백엔드 필수, 생성은 fallback 없음 */
export async function generateCoaching(
  dogId: string,
  reportType: ReportType = 'DAILY',
  userContext?: string,
): Promise<CoachingResult> {
  const body: GenerateCoachingRequest = { dog_id: dogId, report_type: reportType };
  if (userContext?.trim()) body.user_context = userContext.trim();
  return requestBackend<CoachingResult, GenerateCoachingRequest>(
    '/api/v1/coaching/generate',
    { method: 'POST', body },
  );
}

/** 429 에러 파싱 헬퍼 */
export function parseCoachingError(error: unknown): GenerateCoachingError {
  const apiErr = error as BackendApiError;
  const status = apiErr.status ?? 500;
  const detail = apiErr.details as Record<string, unknown> | undefined;

  if (status === 429) {
    return {
      status: 429,
      remaining: (detail?.remaining as number) ?? (detail?.daily_limit as number) ?? 0,
      retryAfterSec: (detail?.retry_after_sec as number) ?? 60,
      message: '일일 코칭 한도에 도달했어요',
    };
  }

  return {
    status,
    message: status === 503 ? 'AI 서비스에 일시적 문제가 있어요' : '코칭 생성에 실패했어요',
  };
}

// ── Action Tracker ──

/** 액션 아이템 완료 토글 */
export async function toggleActionItem(
  coachingId: string,
  actionItemId: string,
  isCompleted: boolean,
): Promise<ActionTracker> {
  return requestBackend<ActionTracker>(
    `/api/v1/coaching/${coachingId}/actions/${actionItemId}`,
    {
      method: 'PATCH',
      body: { is_completed: isCompleted },
    },
  );
}

/** 코칭의 사용자 일일 사용량 조회 */
export async function getDailyUsage(): Promise<{ used: number; limit: number }> {
  return requestBackend<{ used: number; limit: number }>(
    '/api/v1/coaching/usage/daily',
  );
}

async function getCoachingsFromSupabase(dogId: string): Promise<CoachingResult[]> {
  const { data, error } = await supabase
    .from('ai_coaching')
    .select('*')
    .eq('dog_id', dogId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as CoachingResult[];
}

/** 코칭 결과 목록 */
export async function getCoachings(dogId: string): Promise<CoachingResult[]> {
  return withBackendFallback(
    () => requestBackend<CoachingResult[]>(`/api/v1/coaching/${dogId}`),
    () => getCoachingsFromSupabase(dogId),
  );
}

async function getLatestCoachingFromSupabase(dogId: string): Promise<CoachingResult | null> {
  const { data, error } = await supabase
    .from('ai_coaching')
    .select('*')
    .eq('dog_id', dogId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as CoachingResult | null;
}

/** 최신 코칭 결과 */
export async function getLatestCoaching(dogId: string): Promise<CoachingResult | null> {
  return withBackendFallback(
    () => requestBackend<CoachingResult | null>(`/api/v1/coaching/${dogId}/latest`),
    () => getLatestCoachingFromSupabase(dogId),
  );
}

async function submitCoachingFeedbackToSupabase(
  coachingId: string,
  score: 1 | 2 | 3 | 4 | 5,
): Promise<void> {
  const { error } = await supabase
    .from('ai_coaching')
    .update({ feedback_score: score })
    .eq('id', coachingId);
  if (error) throw error;
}

/** 코칭 피드백 제출 */
export async function submitCoachingFeedback(
  coachingId: string,
  score: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  return withBackendFallback(
    () => requestBackend<void, { score: number }>(`/api/v1/coaching/${coachingId}/feedback`, {
      method: 'PATCH',
      body: { score },
    }),
    () => submitCoachingFeedbackToSupabase(coachingId, score),
  );
}
