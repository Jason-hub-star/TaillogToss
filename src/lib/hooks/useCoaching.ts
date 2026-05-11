/**
 * useCoaching 훅 — AI 코칭 생성/조회/피드백/액션 추적
 * Parity: AI-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { queryPolicy } from 'lib/api/queryConfig';
import * as coachingApi from 'lib/api/coaching';
import type { CoachingResult, ReportType } from 'types/coaching';

export function useCoachingList(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.coaching.list(dogId ?? ''),
    queryFn: () => coachingApi.getCoachings(dogId!),
    enabled: !!dogId,
    ...queryPolicy.default,
  });
}

export function useLatestCoaching(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.coaching.latest(dogId ?? ''),
    queryFn: () => coachingApi.getLatestCoaching(dogId!),
    enabled: !!dogId,
    ...queryPolicy.default,
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ coachingId, score }: { coachingId: string; score: 1 | 2 | 3 | 4 | 5 }) =>
      coachingApi.submitCoachingFeedback(coachingId, score),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.coaching.all });
    },
  });
}

/** AI 코칭 생성 mutation — 더블클릭 방지는 isPending으로 처리 */
export function useGenerateCoaching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dogId, reportType }: { dogId: string; reportType?: ReportType }) =>
      coachingApi.generateCoaching(dogId, reportType),
    onSuccess: (data, variables) => {
      // 최신 코칭 캐시 즉시 업데이트
      qc.setQueryData(
        queryKeys.coaching.latest(variables.dogId),
        data,
      );
      // 목록/전체 캐시 무효화
      void qc.invalidateQueries({ queryKey: queryKeys.coaching.all });
    },
  });
}

/** 액션 아이템 완료 토글 — 낙관적 업데이트 */
export function useToggleActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      coachingId,
      actionItemId,
      isCompleted,
    }: {
      coachingId: string;
      actionItemId: string;
      isCompleted: boolean;
      dogId: string;
    }) => coachingApi.toggleActionItem(coachingId, actionItemId, isCompleted),
    onMutate: async (variables) => {
      const latestKey = queryKeys.coaching.latest(variables.dogId);
      await qc.cancelQueries({ queryKey: latestKey });
      const previous = qc.getQueryData<CoachingResult | null>(latestKey);

      // 낙관적 업데이트: blocks.action_plan.items 내 해당 아이템 토글
      if (previous) {
        const updated = {
          ...previous,
          blocks: {
            ...previous.blocks,
            action_plan: {
              ...previous.blocks.action_plan,
              items: previous.blocks.action_plan.items.map((item) =>
                item.id === variables.actionItemId
                  ? { ...item, is_completed: variables.isCompleted }
                  : item,
              ),
            },
          },
        };
        qc.setQueryData(latestKey, updated);
      }
      return { previous };
    },
    onError: (_err, variables, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.coaching.latest(variables.dogId), ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.coaching.all });
    },
  });
}

/** 일일 사용량 조회 */
export function useDailyUsage(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.coaching.dailyUsage(userId ?? ''),
    queryFn: () => coachingApi.getDailyUsage(),
    enabled: !!userId,
    ...queryPolicy.default,
  });
}
