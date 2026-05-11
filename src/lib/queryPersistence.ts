/**
 * React Query persistence policy — fast shell hydration without auth/IAP leakage.
 * Parity: APP-001
 */
import { Storage } from '@apps-in-toss/framework';
import type { Query } from '@tanstack/react-query';
import { queryClient } from 'stores/queryClient';
import { PERSIST_MAX_AGE, QUERY_CACHE_OWNER_KEY } from './api/queryConfig';

export const QUERY_PERSIST_STORAGE_KEY = 'taillog:react-query-cache';

const PERSIST_ROOT_KEYS = new Set([
  'dogs',
  'logs',
  'dashboard',
  'coaching',
  'training',
  'settings',
  'notification',
  'survey',
  'reports',
]);

const EXCLUDED_ROOT_KEYS = new Set([
  'auth',
  'subscription',
  'orders',
  'iap',
  'entitlement',
  'entitlements',
  'orgSubscription',
  'org',
  'orgDogs',
  'assignments',
]);

export function shouldPersistQuery(query: Query): boolean {
  const [root, ...rest] = query.queryKey;
  if (typeof root !== 'string') return false;
  if (EXCLUDED_ROOT_KEYS.has(root)) return false;
  if (!PERSIST_ROOT_KEYS.has(root)) return false;
  if (query.state.status !== 'success') return false;

  if (root === 'coaching' && rest[0] === 'dailyUsage') return true;
  return true;
}

export async function clearPersistedQueryCache() {
  await Promise.all([
    Storage.removeItem(QUERY_PERSIST_STORAGE_KEY),
    Storage.removeItem(QUERY_CACHE_OWNER_KEY),
  ]);
  queryClient.clear();
}

export async function setQueryCacheOwner(userId: string | undefined) {
  if (!userId) return;
  const previousOwner = await Storage.getItem(QUERY_CACHE_OWNER_KEY);
  if (previousOwner && previousOwner !== userId) {
    await Storage.removeItem(QUERY_PERSIST_STORAGE_KEY);
    queryClient.clear();
  }
  await Storage.setItem(QUERY_CACHE_OWNER_KEY, userId);
}

export const queryPersistenceMaxAge = PERSIST_MAX_AGE;
