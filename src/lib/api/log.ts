/**
 * 행동 기록(ABC 로그) API — 빠른 기록 + 상세 기록
 * Parity: LOG-001
 */
import { requestBackend } from './backend';
import {
  LOG_LIMIT_DAILY,
  LOG_LIMIT_DEFAULT,
  LOG_LIMIT_ORG,
  LOG_LIMIT_ORG_BACKEND_MULTIPLIER,
} from './queryConfig';
import type { BehaviorLog, QuickLogInput, DetailedLogInput } from 'types/log';

async function getLogsFromBackend(dogId: string, limit = LOG_LIMIT_DEFAULT): Promise<BehaviorLog[]> {
  const data = await requestBackend<BehaviorLog[]>(
    `/api/v1/logs/${dogId}?limit=${encodeURIComponent(String(limit))}`,
  );
  return Array.isArray(data) ? data : [];
}

/** 기록 목록 조회 */
export async function getLogs(dogId: string, limit = LOG_LIMIT_DEFAULT): Promise<BehaviorLog[]> {
  return getLogsFromBackend(dogId, limit);
}

/** 일별 기록 조회 */
export async function getDailyLogs(dogId: string, date: string): Promise<BehaviorLog[]> {
  const startMs = new Date(`${date}T00:00:00`).getTime();
  const endMs = new Date(`${date}T23:59:59`).getTime();

  const logs = await getLogsFromBackend(dogId, LOG_LIMIT_DAILY);
  return logs.filter((log) => {
    const occurredAt = new Date(log.occurred_at).getTime();
    return occurredAt >= startMs && occurredAt <= endMs;
  });
}

/** 빠른 기록 생성 */
export async function createQuickLog(input: QuickLogInput): Promise<BehaviorLog> {
  if (!input.dog_id) throw new Error('dog_id is required for createQuickLog');

  // occurred_at ISO 형식 보장 (BE Pydantic datetime 파싱 호환)
  const normalizedInput: QuickLogInput = {
    ...input,
    occurred_at: new Date(input.occurred_at).toISOString(),
  };

  return requestBackend<BehaviorLog, QuickLogInput>('/api/v1/logs/quick', {
    method: 'POST',
    body: normalizedInput,
  });
}

/** 상세 ABC 기록 생성 */
export async function createDetailedLog(input: DetailedLogInput): Promise<BehaviorLog> {
  return requestBackend<BehaviorLog, DetailedLogInput>('/api/v1/logs/detailed', {
    method: 'POST',
    body: input,
  });
}

/** 기록 삭제 */
export async function deleteLog(logId: string): Promise<void> {
  await requestBackend<void>(`/api/v1/logs/${logId}`, { method: 'DELETE' });
}

/** B2B: 조직 소속 강아지의 기록 조회 */
export async function getOrgDogLogs(
  orgId: string,
  dogId: string,
  limit = LOG_LIMIT_ORG,
): Promise<BehaviorLog[]> {
  const rows = await getLogsFromBackend(dogId, limit * LOG_LIMIT_ORG_BACKEND_MULTIPLIER);
  return rows.filter((row) => row.org_id === orgId).slice(0, limit);
}
