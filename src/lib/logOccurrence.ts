/**
 * 기록 횟수 표시/집계 유틸
 * Parity: LOG-001
 */
import type { BehaviorLog } from 'types/log';

export function getOccurrenceCount(log: Pick<BehaviorLog, 'occurrence_count'>): number {
  const raw = log.occurrence_count ?? 1;
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.round(raw));
}

export function formatOccurrence(count: number, isMinimum?: boolean | null): string {
  const safeCount = Math.max(1, Math.round(count));
  return `${safeCount}회${isMinimum ? ' 이상' : ''}`;
}

export function formatLogOccurrence(log: Pick<BehaviorLog, 'occurrence_count' | 'occurrence_count_is_minimum'>): string {
  return formatOccurrence(getOccurrenceCount(log), log.occurrence_count_is_minimum);
}
