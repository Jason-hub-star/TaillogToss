/**
 * useDashboard 훅 — 대시보드 데이터 조회 (backend-first)
 * Parity: APP-001
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { STALE_TIME_SHORT } from 'lib/api/queryConfig';
import { getDashboard } from 'lib/api/dashboard';

export function useDashboard(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.detail(dogId ?? ''),
    queryFn: () => getDashboard(dogId),
    enabled: !!dogId,
    staleTime: STALE_TIME_SHORT,
  });
}

