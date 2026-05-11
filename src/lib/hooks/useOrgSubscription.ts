/**
 * useOrgSubscription 훅 — B2B 구독 상태 + Entitlement + 공식 IAP 패턴 정렬
 * Parity: B2B-001, IAP-001
 */
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryPolicy } from 'lib/api/queryConfig';
import { queryKeys } from 'lib/api/queryKeys';
import { supabase } from 'lib/api/supabase';
import { tracker } from 'lib/analytics/tracker';
import {
  createOneTimePurchaseOrder,
  verifyAndGrant,
  recoverPendingOrdersB2B,
} from 'lib/api/iap';
import type { OrgSubscription } from 'types/b2b';

/** 조직 구독 조회 */
async function getOrgSubscription(orgId: string): Promise<OrgSubscription | null> {
  const { data, error } = await supabase
    .from('org_subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as OrgSubscription | null;
}

/** 훈련사 개인 구독 조회 */
async function getTrainerSubscription(trainerId: string): Promise<OrgSubscription | null> {
  const { data, error } = await supabase
    .from('org_subscriptions')
    .select('*')
    .eq('trainer_user_id', trainerId)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as OrgSubscription | null;
}

export function useOrgSubscription(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orgSubscription.current(orgId ?? ''),
    queryFn: () => getOrgSubscription(orgId!),
    enabled: !!orgId,
    ...queryPolicy.long,
  });
}

export function useTrainerSubscription(trainerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orgSubscription.trainerCurrent(trainerId ?? ''),
    queryFn: () => getTrainerSubscription(trainerId!),
    enabled: !!trainerId,
    ...queryPolicy.long,
  });
}

/** Entitlement 헬퍼: 현재 플랜의 한도 */
export function useOrgEntitlement(orgId: string | undefined) {
  const { data: sub } = useOrgSubscription(orgId);
  return {
    isActive: sub?.status === 'active' || sub?.status === 'trial',
    maxDogs: sub?.max_dogs ?? 0,
    maxStaff: sub?.max_staff ?? 1,
    planType: sub?.plan_type ?? null,
  };
}

/**
 * usePurchaseB2BIAP — 공식 createOneTimePurchaseOrder 패턴 정렬
 * B2C usePurchaseIAP과 동일 구조: Receipt → processProductGrant → 이벤트 추적 → cleanup
 */
export function usePurchaseB2BIAP() {
  const qc = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      org_id?: string;
      trainer_user_id?: string;
    }) => {
      cleanupRef.current?.();

      return new Promise<boolean>((resolve, reject) => {
        const cleanup = createOneTimePurchaseOrder({
          sku: input.product_id,
          processProductGrant: async ({ orderId }) => {
            return verifyAndGrant(
              { orderId, productId: input.product_id, transactionId: orderId },
              { orgId: input.org_id, trainerUserId: input.trainer_user_id },
            );
          },
          onEvent: ({ type }) => {
            if (type === 'GRANT_COMPLETED') {
              tracker.iapPurchaseSuccess(input.product_id);
              resolve(true);
            } else if (type === 'GRANT_FAILED') {
              resolve(false);
            }
          },
          onError: (error) => reject(error),
        });
        cleanupRef.current = cleanup;
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orgSubscription.all });
    },
  });
}

/**
 * usePendingOrderRecoveryB2B — B2B 미완료 주문 자동 복구
 * 조직 또는 훈련사 기준으로 앱 시작 시 자동 실행
 */
export function usePendingOrderRecoveryB2B(
  orgId: string | undefined,
  trainerUserId: string | undefined,
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId && !trainerUserId) return;

    recoverPendingOrdersB2B(orgId, trainerUserId).then((recovered) => {
      if (recovered > 0) {
        void qc.invalidateQueries({ queryKey: queryKeys.orgSubscription.all });
      }
    });
  }, [orgId, trainerUserId, qc]);
}
