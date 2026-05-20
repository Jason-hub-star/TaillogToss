/**
 * useLogs 훅 — 행동 기록 조회/생성
 * Parity: LOG-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { LOG_LIMIT_DEFAULT, queryPolicy } from 'lib/api/queryConfig';
import * as logApi from 'lib/api/log';
import type { QuickLogInput, DetailedLogInput, BehaviorLog } from 'types/log';
import type { DashboardData } from 'lib/api/dashboard';

export function useLogList(dogId: string | undefined, limit = LOG_LIMIT_DEFAULT) {
  return useQuery({
    queryKey: queryKeys.logs.list(dogId ?? ''),
    queryFn: () => logApi.getLogs(dogId!, limit),
    enabled: !!dogId,
    ...queryPolicy.short,
  });
}

export function useDailyLogs(dogId: string | undefined, date: string) {
  return useQuery({
    queryKey: queryKeys.logs.daily(dogId ?? '', date),
    queryFn: () => logApi.getDailyLogs(dogId!, date),
    enabled: !!dogId,
    ...queryPolicy.short,
  });
}

function invalidateLogDerivedQueries(qc: ReturnType<typeof useQueryClient>, dogId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.logs.all });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard.detail(dogId) });
  void qc.invalidateQueries({ queryKey: queryKeys.training.behaviorAnalytics(dogId) });
}

function buildOptimisticLog(input: QuickLogInput): BehaviorLog {
  const now = new Date().toISOString();
  const isDaily = ['walk', 'meal', 'training', 'play', 'rest', 'grooming'].includes(input.category);
  return {
    id: '__optimistic_' + Date.now(),
    dog_id: input.dog_id,
    is_quick_log: true,
    quick_category: isDaily ? null : (input.category as BehaviorLog['quick_category']),
    daily_activity: isDaily ? (input.category as BehaviorLog['daily_activity']) : null,
    type_id: null,
    antecedent: null,
    behavior: null,
    consequence: null,
    intensity: input.intensity,
    occurrence_count: input.occurrence_count ?? 1,
    occurrence_count_is_minimum: input.occurrence_count_is_minimum ?? false,
    duration_minutes: input.duration_minutes ?? null,
    location: input.location ?? null,
    memo: input.memo ?? null,
    occurred_at: input.occurred_at,
    created_at: now,
    updated_at: now,
  };
}

export function useCreateQuickLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuickLogInput) => logApi.createQuickLog(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.logs.list(input.dog_id) });
      await qc.cancelQueries({ queryKey: queryKeys.dashboard.detail(input.dog_id) });

      const previousLogs = qc.getQueryData<BehaviorLog[]>(queryKeys.logs.list(input.dog_id));
      const previousDashboard = qc.getQueryData<DashboardData>(
        queryKeys.dashboard.detail(input.dog_id),
      );

      const optimistic = buildOptimisticLog(input);

      qc.setQueryData<BehaviorLog[]>(queryKeys.logs.list(input.dog_id), (old) =>
        old ? [optimistic, ...old] : [optimistic],
      );

      qc.setQueryData<DashboardData>(queryKeys.dashboard.detail(input.dog_id), (old) => {
        if (!old) return old;
        return {
          ...old,
          stats: { ...old.stats, total_logs: old.stats.total_logs + 1 },
          recentLogs: [optimistic, ...old.recentLogs],
        };
      });

      return { previousLogs, previousDashboard };
    },
    onError: (_err, input, ctx) => {
      qc.setQueryData(queryKeys.logs.list(input.dog_id), ctx?.previousLogs);
      qc.setQueryData(queryKeys.dashboard.detail(input.dog_id), ctx?.previousDashboard);
    },
    onSettled: (_data, _err, input) => {
      void qc.invalidateQueries({ queryKey: queryKeys.logs.list(input.dog_id) });
      invalidateLogDerivedQueries(qc, input.dog_id);
    },
  });
}

export function useCreateDetailedLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DetailedLogInput) => logApi.createDetailedLog(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.logs.list(variables.dog_id) });
      invalidateLogDerivedQueries(qc, variables.dog_id);
    },
  });
}

export function useDeleteLog(dogId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => logApi.deleteLog(logId),
    onMutate: async (logId) => {
      if (!dogId) return;
      await qc.cancelQueries({ queryKey: queryKeys.logs.list(dogId) });
      const previousLogs = qc.getQueryData<BehaviorLog[]>(queryKeys.logs.list(dogId));
      qc.setQueryData<BehaviorLog[]>(queryKeys.logs.list(dogId), (old) =>
        old ? old.filter((l) => l.id !== logId) : [],
      );
      return { previousLogs };
    },
    onError: (_err, _logId, ctx) => {
      if (!dogId) return;
      qc.setQueryData(queryKeys.logs.list(dogId), ctx?.previousLogs);
    },
    onSettled: () => {
      if (!dogId) return;
      void qc.invalidateQueries({ queryKey: queryKeys.logs.list(dogId) });
      invalidateLogDerivedQueries(qc, dogId);
    },
  });
}

/** B2B: 조직 소속 강아지 기록 조회 */
export function useOrgDogLogs(orgId: string | undefined, dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.logs.org(orgId ?? '', dogId ?? ''),
    queryFn: () => logApi.getOrgDogLogs(orgId!, dogId!),
    enabled: !!orgId && !!dogId,
    ...queryPolicy.short,
  });
}
