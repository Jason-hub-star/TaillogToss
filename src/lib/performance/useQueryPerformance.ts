/**
 * Query timing markers — identify which hydrated/refetching query gates a page.
 * Parity: APP-001
 */
import { useEffect, useRef } from 'react';
import {
  markStartupPerformance,
  type StartupPerformanceMeta,
} from 'lib/performance/startupPerformance';

interface QueryPerformanceTarget {
  label: string;
  enabled?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  dataUpdatedAt?: number;
  hasData?: boolean;
  meta?: StartupPerformanceMeta;
}

interface QueryMarkerState {
  cachedMarked?: boolean;
  fetchStartedAt?: number;
  fetchStartMarked?: boolean;
  settledMarked?: boolean;
  failedMarked?: boolean;
}

function hasFreshData(query: QueryPerformanceTarget): boolean {
  return query.hasData === true || Boolean(query.dataUpdatedAt && query.dataUpdatedAt > 0);
}

export function useQueryPerformance(route: string, queries: QueryPerformanceTarget[]) {
  const markerStateRef = useRef<Record<string, QueryMarkerState>>({});

  useEffect(() => {
    const now = Date.now();

    for (const query of queries) {
      if (query.enabled === false) continue;

      const markerKey = `${route}:${query.label}`;
      const state = markerStateRef.current[markerKey] ?? {};
      markerStateRef.current[markerKey] = state;

      const meta: StartupPerformanceMeta = {
        route,
        query: query.label,
        dataUpdatedAt: query.dataUpdatedAt || null,
        ...(query.meta ?? {}),
      };

      if (hasFreshData(query) && !state.cachedMarked) {
        state.cachedMarked = true;
        markStartupPerformance('page_query_cached_data_ready', meta);
      }

      if (query.isFetching && !state.fetchStartMarked) {
        state.fetchStartedAt = now;
        state.fetchStartMarked = true;
        markStartupPerformance('page_query_fetch_start', meta);
      }

      const isSettled = !query.isLoading && !query.isFetching;
      const durationMs = state.fetchStartedAt ? now - state.fetchStartedAt : null;

      if (isSettled && query.isError && !state.failedMarked) {
        state.failedMarked = true;
        markStartupPerformance('page_query_fetch_failed', {
          ...meta,
          durationMs,
        });
      }

      if (isSettled && !query.isError && hasFreshData(query) && !state.settledMarked) {
        state.settledMarked = true;
        markStartupPerformance('page_query_fresh_settled', {
          ...meta,
          durationMs,
        });
      }
    }
  }, [queries, route]);
}
