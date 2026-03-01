/**
 * 행동 기록(ABC 로그) API — 빠른 기록 + 상세 기록
 * Parity: LOG-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import type { BehaviorLog, QuickLogInput, DetailedLogInput } from 'types/log';

async function getLogsFromSupabase(dogId: string, limit = 50): Promise<BehaviorLog[]> {
  const { data, error } = await supabase
    .from('behavior_logs')
    .select('*')
    .eq('dog_id', dogId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as BehaviorLog[];
}

async function getLogsFromBackend(dogId: string, limit = 50): Promise<BehaviorLog[]> {
  const data = await requestBackend<BehaviorLog[]>(`/api/v1/logs/${dogId}`);
  return Array.isArray(data) ? data.slice(0, limit) : [];
}

/** 기록 목록 조회 */
export async function getLogs(dogId: string, limit = 50): Promise<BehaviorLog[]> {
  return withBackendFallback(
    () => getLogsFromBackend(dogId, limit),
    () => getLogsFromSupabase(dogId, limit),
  );
}

/** 일별 기록 조회 */
export async function getDailyLogs(dogId: string, date: string): Promise<BehaviorLog[]> {
  const startMs = new Date(`${date}T00:00:00`).getTime();
  const endMs = new Date(`${date}T23:59:59`).getTime();

  return withBackendFallback(
    async () => {
      const logs = await getLogsFromBackend(dogId, 200);
      return logs.filter((log) => {
        const occurredAt = new Date(log.occurred_at).getTime();
        return occurredAt >= startMs && occurredAt <= endMs;
      });
    },
    async () => {
      const start = `${date}T00:00:00`;
      const end = `${date}T23:59:59`;
      const { data, error } = await supabase
        .from('behavior_logs')
        .select('*')
        .eq('dog_id', dogId)
        .gte('occurred_at', start)
        .lte('occurred_at', end)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return data as BehaviorLog[];
    },
  );
}

/** 빠른 기록 생성 */
export async function createQuickLog(input: QuickLogInput): Promise<BehaviorLog> {
  if (!input.dog_id) throw new Error('dog_id is required for createQuickLog');

  // occurred_at ISO 형식 보장 (BE Pydantic datetime 파싱 호환)
  const normalizedInput: QuickLogInput = {
    ...input,
    occurred_at: new Date(input.occurred_at).toISOString(),
  };

  return withBackendFallback(
    () =>
      requestBackend<BehaviorLog, QuickLogInput>('/api/v1/logs/quick', {
        method: 'POST',
        body: normalizedInput,
      }),
    async () => {
      const { data, error } = await supabase
        .from('behavior_logs')
        .insert({
          dog_id: normalizedInput.dog_id,
          is_quick_log: true,
          quick_category: normalizedInput.category,
          intensity: normalizedInput.intensity,
          occurred_at: normalizedInput.occurred_at,
          memo: normalizedInput.memo ?? null,
          location: normalizedInput.location ?? null,
          duration_minutes: normalizedInput.duration_minutes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BehaviorLog;
    },
  );
}

/** 상세 ABC 기록 생성 */
export async function createDetailedLog(input: DetailedLogInput): Promise<BehaviorLog> {
  return withBackendFallback(
    () =>
      requestBackend<BehaviorLog, DetailedLogInput>('/api/v1/logs/detailed', {
        method: 'POST',
        body: input,
      }),
    async () => {
      const { data, error } = await supabase
        .from('behavior_logs')
        .insert({
          dog_id: input.dog_id,
          is_quick_log: false,
          type_id: input.type_id,
          antecedent: input.antecedent,
          behavior: input.behavior,
          consequence: input.consequence,
          intensity: input.intensity,
          duration_minutes: input.duration_minutes ?? null,
          location: input.location ?? null,
          memo: input.memo ?? null,
          occurred_at: input.occurred_at,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BehaviorLog;
    },
  );
}

/** 기록 삭제 */
export async function deleteLog(logId: string): Promise<void> {
  return withBackendFallback(
    () => requestBackend<void>(`/api/v1/logs/${logId}`, { method: 'DELETE' }),
    async () => {
      const { error } = await supabase.from('behavior_logs').delete().eq('id', logId);
      if (error) throw error;
    },
  );
}

/** B2B: 조직 소속 강아지의 기록 조회 */
export async function getOrgDogLogs(orgId: string, dogId: string, limit = 50): Promise<BehaviorLog[]> {
  return withBackendFallback(
    async () => {
      const rows = await getLogsFromBackend(dogId, limit * 2);
      return rows.filter((row) => row.org_id === orgId).slice(0, limit);
    },
    async () => {
      const { data, error } = await supabase
        .from('behavior_logs')
        .select('*')
        .eq('org_id', orgId)
        .eq('dog_id', dogId)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as BehaviorLog[];
    },
  );
}
