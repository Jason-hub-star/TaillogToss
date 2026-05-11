/**
 * React Query persistence policy tests
 * Parity: APP-001
 */
import { QueryClient } from '@tanstack/react-query';
import { Storage } from '@apps-in-toss/framework';
import { clearPersistedQueryCache, QUERY_PERSIST_STORAGE_KEY, shouldPersistQuery } from 'lib/queryPersistence';
import { QUERY_CACHE_OWNER_KEY } from 'lib/api/queryConfig';
import { queryClient } from 'stores/queryClient';

jest.mock('@apps-in-toss/framework', () => ({
  Storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockedStorage = Storage as unknown as {
  removeItem: jest.Mock;
};

type PersistQuery = Parameters<typeof shouldPersistQuery>[0];

function successQuery(queryKey: unknown[]): PersistQuery {
  const client = new QueryClient();
  client.setQueryData(queryKey, { ok: true });
  const query = client.getQueryCache().find({ queryKey });
  if (!query) throw new Error('query not found');
  return query as PersistQuery;
}

function pendingQuery(queryKey: unknown[]): PersistQuery {
  const client = new QueryClient();
  return client.getQueryCache().build(client, {
    queryKey,
    queryFn: async () => ({ ok: true }),
  }) as unknown as PersistQuery;
}

describe('query persistence policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates only allowed successful read queries', () => {
    expect(shouldPersistQuery(successQuery(['dogs', 'user-1']))).toBe(true);
    expect(shouldPersistQuery(successQuery(['logs', 'dog-1', 100]))).toBe(true);
    expect(shouldPersistQuery(successQuery(['coaching', 'dailyUsage', 'user-1']))).toBe(true);
    expect(shouldPersistQuery(pendingQuery(['dashboard', 'dog-1']))).toBe(false);
  });

  it('does not persist auth, subscription, IAP, or org entitlement queries', () => {
    expect(shouldPersistQuery(successQuery(['auth', 'session']))).toBe(false);
    expect(shouldPersistQuery(successQuery(['subscription', 'user-1']))).toBe(false);
    expect(shouldPersistQuery(successQuery(['orders', 'pending']))).toBe(false);
    expect(shouldPersistQuery(successQuery(['iap', 'restore']))).toBe(false);
    expect(shouldPersistQuery(successQuery(['orgSubscription', 'org-1']))).toBe(false);
    expect(shouldPersistQuery(successQuery(['org', 'stats', 'org-1']))).toBe(false);
  });

  it('clears persisted cache and in-memory query cache on logout/withdraw paths', async () => {
    const clearSpy = jest.spyOn(queryClient, 'clear').mockImplementation(() => undefined);

    await clearPersistedQueryCache();

    expect(mockedStorage.removeItem).toHaveBeenCalledWith(QUERY_PERSIST_STORAGE_KEY);
    expect(mockedStorage.removeItem).toHaveBeenCalledWith(QUERY_CACHE_OWNER_KEY);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
