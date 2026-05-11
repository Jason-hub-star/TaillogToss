/**
 * QueryProvider — TanStack Query 프로바이더 래퍼
 * Parity: APP-001
 */
import React from 'react';
import { Storage } from '@apps-in-toss/framework';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryClient } from './queryClient';
import {
  QUERY_PERSIST_STORAGE_KEY,
  queryPersistenceMaxAge,
  shouldPersistQuery,
} from 'lib/queryPersistence';

const queryPersister = createAsyncStoragePersister({
  storage: Storage,
  key: QUERY_PERSIST_STORAGE_KEY,
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: queryPersistenceMaxAge,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
