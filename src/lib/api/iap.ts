/**
 * IAP SDK 래퍼 — 공식 createOneTimePurchaseOrder + getPendingOrders 패턴
 * B2C + B2B 공용. B2B는 optional B2BGrantContext로 orgId/trainerUserId 전달.
 * @apps-in-toss/framework 확인 후 실 SDK로 교체 예정
 * Parity: IAP-001, B2B-001
 */
import { IAP } from '@apps-in-toss/native-modules';
import { requestBackend } from './backend';
import { getSupabasePublicConfig, supabase } from './supabase';
import { tracker } from '../analytics/tracker';
import {
  resolveAccessToken,
  normalizeJwtToken,
  isUsableAccessToken,
  resolveAccessTokenForInvoke,
  isTestEnvironment,
  invokeVerifyIapOrderViaFetch,
  getInvokeHttpStatus,
} from './iap-invoke';

// ──────────────────────────────────────
// 공식 SDK 인터페이스 미러
// ──────────────────────────────────────

export interface IAPReceipt {
  orderId: string;
  productId: string;
  transactionId: string;
}

export type IAPEventType =
  | 'PURCHASE_STARTED'
  | 'PAYMENT_COMPLETED'
  | 'GRANT_COMPLETED'
  | 'GRANT_FAILED';

/** @deprecated use IAPEventType */
export type IAPEvent = IAPEventType;

/**
 * 공식 SDK PurchaseResult — PAYMENT_COMPLETED 이후 이벤트에 포함.
 * 실 SDK 교체 전까지 result는 mock 값으로 채워진다.
 */
export interface PurchaseResult {
  orderId: string;
  displayName: string;
  displayAmount: string;
  amount: number;
  currency: string;
  fraction: number;
  miniAppIconUrl: string;
}

/** B2B 구매 검증용 추가 컨텍스트 (optional — B2C 호출 시 생략) */
export interface B2BGrantContext {
  orgId?: string;
  trainerUserId?: string;
}

export interface CreateOrderOptions {
  /** 공식 SDK 정렬: sku는 최상위 필드 (구 options.sku → sku) */
  sku: string;
  /** 공식 SDK 정렬: orderId만 전달 (구 IAPReceipt → { orderId }) */
  processProductGrant: (params: { orderId: string }) => Promise<boolean>;
  /** 공식 SDK 정렬: { type, result? } — result는 PAYMENT_COMPLETED 이후 유효 */
  onEvent?: (event: { type: IAPEventType; result?: PurchaseResult }) => void;
  onError?: (error: Error) => void;
}

/**
 * createOneTimePurchaseOrder — 실 Toss IAP SDK 래퍼
 * IAP.createOneTimePurchaseOrder 공식 인터페이스에 위임.
 * SDK가 결제 UI + orderId 생성을 처리하고, processProductGrant 콜백으로 서버 검증을 호출.
 */
export function createOneTimePurchaseOrder({
  sku,
  processProductGrant,
  onEvent,
  onError,
}: CreateOrderOptions): () => void {
  onEvent?.({ type: 'PURCHASE_STARTED' });

  return IAP.createOneTimePurchaseOrder({
    options: {
      sku,
      processProductGrant: async ({ orderId }) => {
        const granted = await processProductGrant({ orderId });
        if (granted) {
          // 서버 지급 완료 후 SDK에 영수증 소비 신호 전달
          try {
            await IAP.completeProductGrant({ params: { orderId } });
          } catch (e) {
            if (__DEV__) {
              console.warn('[IAP-001] completeProductGrant failed (non-fatal):', e);
            }
          }
        }
        return granted;
      },
    },
    onEvent: () => {
      // SDK가 결제 + 지급 전체 성공 후 발화
      onEvent?.({ type: 'GRANT_COMPLETED' });
    },
    onError: (error) => {
      const code = (error as { code?: string })?.code;
      if (code === 'PRODUCT_NOT_GRANTED_BY_PARTNER' || code === 'USER_CANCELED') {
        // 지급 실패 또는 사용자 취소 → 에러 없이 GRANT_FAILED로 처리
        onEvent?.({ type: 'GRANT_FAILED' });
      } else {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
}

/**
 * 서버 검증 + 상품 지급 (processProductGrant 내부에서 호출)
 * B2B 호출 시 b2bContext로 orgId/trainerUserId를 추가 전달한다.
 */
export async function verifyAndGrant(
  receipt: IAPReceipt,
  b2bContext?: B2BGrantContext,
): Promise<boolean> {
  const body = {
    orderId: receipt.orderId,
    productId: receipt.productId,
    transactionId: receipt.transactionId,
    idempotencyKey: `idem_${receipt.orderId}`,
    ...(b2bContext?.orgId && { orgId: b2bContext.orgId }),
    ...(b2bContext?.trainerUserId && { trainerUserId: b2bContext.trainerUserId }),
  };

  const firstToken = await resolveAccessTokenForInvoke();
  if (!firstToken) {
    if (__DEV__) {
      console.warn('[IAP-001] verify-iap-order skipped: missing/invalid auth jwt');
    }
    return false;
  }
  if (__DEV__) {
    const { anonKey } = getSupabasePublicConfig();
    const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(firstToken);
    console.log('[IAP-001] verify-iap-order token debug', {
      tokenPreview: `${firstToken.slice(0, 12)}...${firstToken.slice(-8)}`,
      tokenLength: firstToken.length,
      isAnonKey: firstToken === anonKey,
      tokenUserId: tokenUserData.user?.id ?? null,
      tokenUserError: tokenUserError?.message ?? null,
    });
  }

  // Toss mini-app은 /functions/v1/ 를 네트워크 레벨에서 차단 (404도 아닌 hang)
  // 5초 타임아웃 후 즉시 FastAPI 프록시로 전환
  const INVOKE_TIMEOUT_MS = 5000;
  let data: unknown = null;
  let error: unknown = null;

  const invokeWithTimeout = async (): Promise<{ data: unknown; error: unknown }> => {
    const timeout = new Promise<{ data: null; error: { status: 408 } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { status: 408 } }), INVOKE_TIMEOUT_MS)
    );
    return Promise.race([
      supabase.functions.invoke('verify-iap-order', {
        body,
        headers: firstToken ? { Authorization: `Bearer ${firstToken}` } : undefined,
      }),
      timeout,
    ]);
  };

  const firstInvoke = await invokeWithTimeout();
  data = firstInvoke.data;
  error = firstInvoke.error;

  if (__DEV__ && error) {
    console.warn('[IAP-001] firstInvoke error', {
      status: getInvokeHttpStatus(error),
      error,
    });
  }

  if (error && getInvokeHttpStatus(error) === 401) {
    const refreshedToken = normalizeJwtToken(await resolveAccessToken(true));
    const retryToken =
      refreshedToken && (await isUsableAccessToken(refreshedToken)) ? refreshedToken : firstToken;
    if (__DEV__) {
      const { anonKey } = getSupabasePublicConfig();
      console.log('[IAP-001] verify-iap-order retry token debug', {
        source: retryToken === firstToken ? 'first' : 'refreshed',
        isAnonKey: retryToken === anonKey,
      });
    }
    const secondInvoke = await supabase.functions.invoke('verify-iap-order', {
      body,
      headers: { Authorization: `Bearer ${retryToken}` },
    });
    data = secondInvoke.data;
    error = secondInvoke.error;

    if (!isTestEnvironment() && error && getInvokeHttpStatus(error) === 401) {
      const fallback = await invokeVerifyIapOrderViaFetch(body, retryToken);
      data = fallback.data;
      error = fallback.error;
    }
  }

  // 404 또는 408(timeout): Toss mini-app → FastAPI 프록시 우회
  // adb reverse tcp:8765 tcp:8765
  const errStatus = getInvokeHttpStatus(error);
  if (!isTestEnvironment() && error && (errStatus === 404 || errStatus === 408)) {
    if (__DEV__) {
      console.log(`[IAP-001] verify-iap-order ${errStatus} → FastAPI proxy :8765`);
    }
    try {
      data = await requestBackend<unknown>('http://127.0.0.1:8765/api/v1/subscription/iap/verify', {
        method: 'POST',
        body,
      });
      error = null;
    } catch (proxyErr) {
      if (__DEV__) {
        console.warn('[IAP-001] FastAPI proxy failed', proxyErr);
      }
    }
  }

  if (error) {
    if (__DEV__) {
      console.warn('[IAP-001] verify-iap-order invoke failed', {
        status: getInvokeHttpStatus(error),
        error,
      });
    }
    return false;
  }

  // Edge envelope({ ok, data })와 평탄 응답({ grant_status })을 모두 지원한다.
  const payload = data as
    | {
        ok?: boolean;
        grant_status?: string;
        toss_status?: string;
        data?: {
          ok?: boolean;
          grant_status?: string;
          toss_status?: string;
        };
      }
    | null
    | undefined;

  const grantStatus = payload?.grant_status ?? payload?.data?.grant_status;
  if (grantStatus) return grantStatus === 'granted';

  const tossStatus = payload?.toss_status ?? payload?.data?.toss_status;
  if (tossStatus) return tossStatus === 'PAYMENT_COMPLETED';

  const okFlag = payload?.ok ?? payload?.data?.ok;
  return okFlag === true;
}

// ──────────────────────────────────────
// 미완료 주문 복구
// ──────────────────────────────────────

export interface PendingOrder {
  orderId: string;
  productId: string;
  transactionId: string;
}

/**
 * getPendingOrders — 미완료 주문 조회
 * 실 SDK: @apps-in-toss/framework의 getPendingOrders()
 * 래퍼: toss_orders 테이블에서 grant_status='pending' 조회
 */
export async function getPendingOrders(userId: string): Promise<PendingOrder[]> {
  const { data, error } = await supabase
    .from('toss_orders')
    .select('toss_order_id, product_id, id')
    .eq('user_id', userId)
    .eq('grant_status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    orderId: row.toss_order_id ?? row.id,
    productId: row.product_id,
    transactionId: row.toss_order_id ?? row.id,
  }));
}

/**
 * completeProductGrant — 미완료 주문 지급 완료
 * 실 SDK: @apps-in-toss/framework의 completeProductGrant()
 * TODO(IAP-001): 실 SDK 교체 시 receipt 검증 로직이 SDK 내부로 이동.
 *   현재는 mock receipt → Edge Function verifyAndGrant로 우회.
 */
export async function completeProductGrant(order: PendingOrder): Promise<boolean> {
  const granted = await verifyAndGrant({
    orderId: order.orderId,
    productId: order.productId,
    transactionId: order.transactionId,
  });
  if (granted) {
    tracker.iapPurchaseSuccess(order.productId);
  }
  return granted;
}

/**
 * recoverPendingOrders — 앱 시작 시 미완료 주문 일괄 복구
 */
export async function recoverPendingOrders(userId: string): Promise<number> {
  const pending = await getPendingOrders(userId);
  let recovered = 0;
  for (const order of pending) {
    const ok = await completeProductGrant(order);
    if (ok) recovered++;
  }
  return recovered;
}

// ──────────────────────────────────────
// B2B 미완료 주문 복구
// ──────────────────────────────────────

/**
 * getPendingOrdersB2B — B2B 미완료 주문 조회
 * org_id 또는 trainer_user_id 기준으로 toss_orders에서 grant_status='pending' 필터
 */
export async function getPendingOrdersB2B(
  orgId?: string,
  trainerUserId?: string,
): Promise<PendingOrder[]> {
  if (!orgId && !trainerUserId) return [];

  let query = supabase
    .from('toss_orders')
    .select('toss_order_id, product_id, id')
    .eq('grant_status', 'pending')
    .order('created_at', { ascending: true });

  if (orgId) {
    query = query.eq('org_id', orgId);
  } else if (trainerUserId) {
    query = query.eq('trainer_user_id', trainerUserId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    orderId: row.toss_order_id ?? row.id,
    productId: row.product_id,
    transactionId: row.toss_order_id ?? row.id,
  }));
}

/**
 * recoverPendingOrdersB2B — B2B 미완료 주문 일괄 복구
 * 각 주문을 verifyAndGrant(receipt, b2bContext)로 재시도한다.
 */
export async function recoverPendingOrdersB2B(
  orgId?: string,
  trainerUserId?: string,
): Promise<number> {
  const pending = await getPendingOrdersB2B(orgId, trainerUserId);
  let recovered = 0;
  for (const order of pending) {
    const ok = await verifyAndGrant(
      { orderId: order.orderId, productId: order.productId, transactionId: order.transactionId },
      { orgId, trainerUserId },
    );
    if (ok) recovered++;
  }
  return recovered;
}
