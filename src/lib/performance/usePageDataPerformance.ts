/**
 * Page data timing markers — distinguish shell, cached data, and fresh data.
 * Parity: APP-001
 */
import { useEffect, useRef } from 'react';
import {
  markStartupPerformance,
  type StartupPerformanceMeta,
} from 'lib/performance/startupPerformance';

interface PageDataCheckpoint {
  label: 'shell_ready' | 'cached_data_ready' | 'fresh_data_settled';
  ready: boolean;
  meta?: StartupPerformanceMeta;
}

export function usePageDataPerformance(route: string, checkpoints: PageDataCheckpoint[]) {
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const checkpoint of checkpoints) {
      const marker = `${route}:${checkpoint.label}`;
      if (!checkpoint.ready || markedRef.current.has(marker)) continue;
      markedRef.current.add(marker);
      markStartupPerformance(`page_${checkpoint.label}`, {
        route,
        ...(checkpoint.meta ?? {}),
      });
    }
  }, [checkpoints, route]);
}
