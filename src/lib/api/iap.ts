/**
 * IAP SDK 래퍼 — 공식 createOneTimePurchaseOrder + getPendingOrders 패턴
 * B2C + B2B 공용. B2B는 optional B2BGrantContext로 orgId/trainerUserId 전달.
 * @apps-in-toss/framework 확인 후 실 SDK로 교체 예정
 * Parity: IAP-001, B2B-001
 */
import { Storage } from '@apps-in-toss/framework';
import { IAP } from '@apps-in-toss/native-modules';
import { requestBackend } from './backend';
import { getSupabasePublicConfig, supabase } from './supabase';
import { tracker } from '../analytics/tracker';
import { B2B_IAP_PRODUCTS } from 'types/b2b';
import { IAP_PRODUCTS } from 'types/subscription';
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
  let active = true;
  let grantApproved = false;
  let settled = false;
  let lastPaymentResult: PurchaseResult | undefined;

  const emitGrantFailed = () => {
    if (!active || settled) return;
    settled = true;
    console.log('[IAP-001] grant event', { type: 'GRANT_FAILED', sku });
    onEvent?.({ type: 'GRANT_FAILED' });
  };

  const emitGrantCompleted = (result?: PurchaseResult) => {
    if (!active || settled) return;
    settled = true;
    console.log('[IAP-001] grant event', {
      type: 'GRANT_COMPLETED',
      sku,
      orderId: result?.orderId,
    });
    onEvent?.({ type: 'GRANT_COMPLETED', result });
  };

  console.log('[IAP-001] createOneTimePurchaseOrder start', { sku });
  onEvent?.({ type: 'PURCHASE_STARTED' });

  const cleanup = IAP.createOneTimePurchaseOrder({
    options: {
      sku,
      processProductGrant: async ({ orderId }) => {
        let granted = false;
        console.log('[IAP-001] processProductGrant start', { sku, orderId });
        try {
          granted = await processProductGrant({ orderId });
        } catch (e) {
          console.warn('[IAP-001] processProductGrant failed', {
            sku,
            orderId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
        if (!active) return false;
        grantApproved = granted;
        console.log('[IAP-001] processProductGrant done', { sku, orderId, granted });
        if (!granted) {
          emitGrantFailed();
          return false;
        }
        // 서버 지급 완료 후 SDK에 영수증 소비 신호 전달
        try {
          console.log('[IAP-001] completeProductGrant start', { sku, orderId });
          await IAP.completeProductGrant({ params: { orderId } });
          console.log('[IAP-001] completeProductGrant done', { sku, orderId });
        } catch (e) {
          console.warn('[IAP-001] completeProductGrant failed (non-fatal)', {
            sku,
            orderId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
        emitGrantCompleted(lastPaymentResult);
        return granted;
      },
    },
    onEvent: (event) => {
      if (!active || settled) return;
      const sdkEventType = String((event as { type?: unknown }).type ?? '');
      console.log('[IAP-001] sdk event', { sku, type: sdkEventType });
      if (sdkEventType === 'GRANT_FAILED' || sdkEventType === 'failed') {
        emitGrantFailed();
        return;
      }
      const result = (event as { result?: PurchaseResult } | undefined)?.result;
      if (result) lastPaymentResult = result;
      if (grantApproved) {
        emitGrantCompleted(result ?? lastPaymentResult);
      }
    },
    onError: (error) => {
      if (!active || settled) return;
      const code = (error as { code?: string })?.code;
      console.warn('[IAP-001] sdk error', {
        sku,
        code,
        message: error instanceof Error ? error.message : String(error),
      });
      if (code === 'PRODUCT_NOT_GRANTED_BY_PARTNER' || code === 'USER_CANCELED') {
        // 지급 실패 또는 사용자 취소 → 에러 없이 GRANT_FAILED로 처리
        emitGrantFailed();
      } else {
        settled = true;
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });

  return () => {
    active = false;
    cleanup?.();
  };
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
      console.log(`[IAP-001] verify-iap-order ${errStatus} → FastAPI proxy`);
    }
    try {
      data = await requestBackend<unknown>('/api/v1/subscription/iap/verify', {
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
  if (grantStatus) {
    const granted = grantStatus === 'granted';
    console.log('[IAP-001] verifyAndGrant result', {
      orderId: receipt.orderId,
      productId: receipt.productId,
      grantStatus,
      granted,
    });
    return granted;
  }

  const tossStatus = payload?.toss_status ?? payload?.data?.toss_status;
  if (tossStatus) {
    const granted = tossStatus === 'PAYMENT_COMPLETED';
    console.log('[IAP-001] verifyAndGrant result', {
      orderId: receipt.orderId,
      productId: receipt.productId,
      tossStatus,
      granted,
    });
    return granted;
  }

  const okFlag = payload?.ok ?? payload?.data?.ok;
  const granted = okFlag === true;
  console.log('[IAP-001] verifyAndGrant result', {
    orderId: receipt.orderId,
    productId: receipt.productId,
    ok: okFlag,
    granted,
  });
  return granted;
}

// ──────────────────────────────────────
// 미완료 주문 복구
// ──────────────────────────────────────

export interface PendingOrder {
  orderId: string;
  productId: string;
  transactionId: string;
}

interface PendingOrderTerminalRecord {
  product_id: string;
  grant_status: string;
  toss_status: string;
}

const KNOWN_IAP_PRODUCT_IDS = new Set(
  [...Object.values(IAP_PRODUCTS), ...Object.values(B2B_IAP_PRODUCTS)].map((product) => product.product_id)
);

const TERMINAL_GRANT_STATUSES = new Set(['grant_failed', 'refunded']);
const TERMINAL_TOSS_STATUSES = new Set(['NOT_FOUND', 'FAILED', 'REFUNDED']);
const STALE_PENDING_SUPPRESSION_PREFIX = 'iap_stale_pending_suppress_v1';

function isKnownIapProductId(productId: string): boolean {
  return KNOWN_IAP_PRODUCT_IDS.has(productId);
}

function stalePendingSuppressionKey(userId: string): string {
  return `${STALE_PENDING_SUPPRESSION_PREFIX}:${userId}`;
}

function stalePendingFingerprint(order: PendingOrder): string {
  return `${order.orderId}:${order.productId}`;
}

async function loadSuppressedStalePendingOrders(userId: string): Promise<Record<string, string>> {
  try {
    const raw = await Storage.getItem(stalePendingSuppressionKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'
      )
    );
  } catch {
    return {};
  }
}

async function rememberSuppressedStalePendingOrder(
  userId: string,
  order: PendingOrder,
  reason: string,
): Promise<void> {
  try {
    const current = await loadSuppressedStalePendingOrders(userId);
    current[stalePendingFingerprint(order)] = reason;
    await Storage.setItem(stalePendingSuppressionKey(userId), JSON.stringify(current));
  } catch {
    // suppression marker 실패는 non-fatal
  }
}

async function getSuppressedStalePendingReason(
  userId: string,
  order: PendingOrder,
): Promise<string | null> {
  const suppressed = await loadSuppressedStalePendingOrders(userId);
  return suppressed[stalePendingFingerprint(order)] ?? null;
}

async function resolveStalePendingOrderReason(
  userId: string,
  order: PendingOrder,
): Promise<string | null> {
  if (!isKnownIapProductId(order.productId)) {
    return 'unknown_product';
  }

  const { data, error } = await supabase
    .from('toss_orders')
    .select('product_id, grant_status, toss_status')
    .eq('user_id', userId)
    .eq('toss_order_id', order.orderId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('[IAP-001] stale pending lookup failed', {
      orderId: order.orderId,
      productId: order.productId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const record = (Array.isArray(data) ? data[0] : null) as PendingOrderTerminalRecord | null;
  if (!record || record.product_id !== order.productId) {
    return null;
  }
  if (
    TERMINAL_GRANT_STATUSES.has(record.grant_status) &&
    TERMINAL_TOSS_STATUSES.has(record.toss_status)
  ) {
    return `${record.grant_status}:${record.toss_status}`;
  }
  return null;
}

async function dismissStalePendingOrder(order: PendingOrder, reason: string): Promise<void> {
  console.warn('[IAP-001] dismissing stale pending order', {
    orderId: order.orderId,
    productId: order.productId,
    reason,
  });
  try {
    await IAP.completeProductGrant({ params: { orderId: order.orderId } });
    console.log('[IAP-001] stale pending order dismissed', {
      orderId: order.orderId,
      productId: order.productId,
      reason,
    });
  } catch (error) {
    console.warn('[IAP-001] stale pending dismiss failed', {
      orderId: order.orderId,
      productId: order.productId,
      reason,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * getPendingOrders — 미완료 주문 조회
 * 실 SDK(IAP.getPendingOrders)를 우선 조회하고, 미지원/실패 시 DB pending 이력으로 폴백한다.
 */
export async function getPendingOrders(userId: string): Promise<PendingOrder[]> {
  console.log('[IAP-001] getPendingOrders start', { userId });
  try {
    const pending = typeof IAP.getPendingOrders === 'function'
      ? await IAP.getPendingOrders()
      : undefined;
    if (pending?.orders?.length) {
      const orders = pending.orders.map((order) => ({
        orderId: order.orderId,
        productId: order.sku,
        transactionId: order.orderId,
      }));
      console.log('[IAP-001] getPendingOrders sdk result', { count: orders.length });
      return orders;
    }
    console.log('[IAP-001] getPendingOrders sdk result', { count: 0 });
  } catch (error) {
    console.warn('[IAP-001] getPendingOrders SDK failed, falling back to DB', error);
  }

  const { data, error } = await supabase
    .from('toss_orders')
    .select('toss_order_id, product_id, id')
    .eq('user_id', userId)
    .eq('grant_status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.warn('[IAP-001] getPendingOrders db failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  const orders = data.map((row) => ({
    orderId: row.toss_order_id ?? row.id,
    productId: row.product_id,
    transactionId: row.toss_order_id ?? row.id,
  }));
  console.log('[IAP-001] getPendingOrders db result', { count: orders.length });
  return orders;
}

/**
 * completeProductGrant — 미완료 주문 지급 완료
 * 서버 검증/지급 후 실 SDK completeProductGrant로 Toss pending 상태를 닫는다.
 */
export async function completeProductGrant(order: PendingOrder): Promise<boolean> {
  console.log('[IAP-001] pending completeProductGrant start', {
    orderId: order.orderId,
    productId: order.productId,
  });
  const granted = await verifyAndGrant({
    orderId: order.orderId,
    productId: order.productId,
    transactionId: order.transactionId,
  });
  if (granted) {
    try {
      console.log('[IAP-001] completeProductGrant start', {
        orderId: order.orderId,
        productId: order.productId,
      });
      await IAP.completeProductGrant({ params: { orderId: order.orderId } });
      console.log('[IAP-001] completeProductGrant done', {
        orderId: order.orderId,
        productId: order.productId,
      });
    } catch (error) {
      console.warn('[IAP-001] completeProductGrant SDK failed after server grant', error);
    }
    tracker.iapPurchaseSuccess(order.productId);
  } else {
    console.warn('[IAP-001] pending completeProductGrant skipped: server grant failed', {
      orderId: order.orderId,
      productId: order.productId,
    });
  }
  return granted;
}

/**
 * recoverPendingOrders — 앱 시작 시 미완료 주문 일괄 복구
 */
export async function recoverPendingOrders(userId: string): Promise<number> {
  console.log('[IAP-001] recoverPendingOrders start', { userId });
  const pending = await getPendingOrders(userId);
  let recovered = 0;
  for (const order of pending) {
    const suppressedReason = await getSuppressedStalePendingReason(userId, order);
    if (suppressedReason) {
      console.log('[IAP-001] stale pending order suppressed', {
        orderId: order.orderId,
        productId: order.productId,
        reason: suppressedReason,
      });
      continue;
    }
    const staleReason = await resolveStalePendingOrderReason(userId, order);
    if (staleReason) {
      await dismissStalePendingOrder(order, staleReason);
      await rememberSuppressedStalePendingOrder(userId, order, staleReason);
      continue;
    }
    const ok = await completeProductGrant(order);
    if (ok) recovered++;
  }
  console.log('[IAP-001] recoverPendingOrders done', {
    userId,
    pending: pending.length,
    recovered,
  });
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
