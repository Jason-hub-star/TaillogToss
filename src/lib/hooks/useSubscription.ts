/**
 * useSubscription 훅 — 구독 상태 + IAP 구매 (공식 패턴 정렬)
 * createOneTimePurchaseOrder + processProductGrant + getPendingOrders 복구
 * Parity: IAP-001
 */
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { tracker } from 'lib/analytics/tracker';
import { STALE_TIME_LONG } from 'lib/api/queryConfig';
import * as subApi from 'lib/api/subscription';
import {
  createOneTimePurchaseOrder,
  verifyAndGrant,
  recoverPendingOrders,
  type IAPEvent,
} from 'lib/api/iap';

export function useCurrentSubscription(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscription.current(userId ?? ''),
    queryFn: () => subApi.getSubscription(userId!),
    enabled: !!userId,
    staleTime: STALE_TIME_LONG,
  });
}

export function useIsPro(userId: string | undefined) {
  const { data } = useCurrentSubscription(userId);
  return data?.plan_type === 'PRO_MONTHLY' && data?.is_active;
}

/**
 * usePurchaseIAP — 공식 createOneTimePurchaseOrder 패턴
 * 구매 → 서버 검증(processProductGrant) → 결과 반영
 */
export function usePurchaseIAP() {
  const qc = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  // 컴포넌트 언마운트 시 진행 중인 구매 cleanup
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return useMutation({
    mutationFn: async (productId: string) => {
      // 이전 구매 프로세스 cleanup
      cleanupRef.current?.();

      return new Promise<boolean>((resolve, reject) => {
        const cleanup = createOneTimePurchaseOrder({
          options: { sku: productId },
          processProductGrant: async (receipt) => {
            const ok = await verifyAndGrant(receipt);
            return ok;
          },
          onEvent: (event: IAPEvent) => {
            if (event === 'GRANT_COMPLETED') {
              tracker.iapPurchaseSuccess(productId);
              resolve(true);
            } else if (event === 'GRANT_FAILED') {
              resolve(false);
            }
          },
          onError: (error) => reject(error),
        });
        cleanupRef.current = cleanup;
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
    },
  });
}

/**
 * usePendingOrderRecovery — 앱 시작 시 미완료 주문 자동 복구
 */
export function usePendingOrderRecovery(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    recoverPendingOrders(userId).then((recovered) => {
      if (recovered > 0) {
        void qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
      }
    });
  }, [userId, qc]);
}

export function useRestoreSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => subApi.restoreSubscription(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.subscription.all });
    },
  });
}
