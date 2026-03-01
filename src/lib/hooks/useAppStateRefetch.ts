/**
 * useAppStateRefetch — 백그라운드 복귀 시 핵심 쿼리 자동 갱신
 * background 5초 이상 → foreground 복귀 시 dashboard/logs/training invalidate
 * Parity: APP-001
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';

const BACKGROUND_THRESHOLD_MS = 5_000;

export function useAppStateRefetch(dogId: string | undefined) {
  const qc = useQueryClient();
  const backgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dogId) return;

    const handleChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundAtRef.current = Date.now();
      } else if (nextState === 'active' && backgroundAtRef.current) {
        const elapsed = Date.now() - backgroundAtRef.current;
        backgroundAtRef.current = null;

        if (elapsed >= BACKGROUND_THRESHOLD_MS) {
          void qc.invalidateQueries({ queryKey: queryKeys.dashboard.detail(dogId) });
          void qc.invalidateQueries({ queryKey: queryKeys.logs.list(dogId) });
          void qc.invalidateQueries({ queryKey: queryKeys.training.progress(dogId) });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [dogId, qc]);
}
