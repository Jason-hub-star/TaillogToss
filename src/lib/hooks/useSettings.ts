/**
 * useSettings 훅 — 사용자 설정 조회/업데이트
 * Parity: APP-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { STALE_TIME_LONG } from 'lib/api/queryConfig';
import * as settingsApi from 'lib/api/settings';
import type { UserSettings } from 'types/settings';

export function useUserSettings(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.settings.user(userId ?? ''),
    queryFn: () => settingsApi.getSettings(userId!),
    enabled: !!userId,
    staleTime: STALE_TIME_LONG,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<UserSettings> }) =>
      settingsApi.updateSettings(userId, updates),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.settings.user(variables.userId) });
    },
  });
}
