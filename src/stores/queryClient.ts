/**
 * TanStack Query 클라이언트 설정
 * Parity: APP-001
 */
import { QueryClient } from '@tanstack/react-query';
import { queryPolicy } from 'lib/api/queryConfig';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...queryPolicy.default,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
