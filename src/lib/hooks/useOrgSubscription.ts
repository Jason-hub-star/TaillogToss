/**
 * useOrgSubscription 훅 — B2B 구독 상태 + Entitlement
 * Parity: B2B-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { supabase } from 'lib/api/supabase';
import { tracker } from 'lib/analytics/tracker';
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
  });
}

export function useTrainerSubscription(trainerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orgSubscription.trainerCurrent(trainerId ?? ''),
    queryFn: () => getTrainerSubscription(trainerId!),
    enabled: !!trainerId,
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

/** B2B IAP 구매 (Edge Function) */
export function usePurchaseB2BIAP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      org_id?: string;
      trainer_user_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('verify-iap-order', {
        body: {
          productId: input.product_id,
          orgId: input.org_id,
          trainerUserId: input.trainer_user_id,
          idempotencyKey: `b2b_${Date.now().toString(36)}`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      tracker.iapPurchaseSuccess(variables.product_id);
      void qc.invalidateQueries({ queryKey: queryKeys.orgSubscription.all });
    },
  });
}
