/**
 * 구독/결제 API — Toss IAP 연동
 * Parity: IAP-001
 */
import { getSupabasePublicConfig, supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import { recoverPendingOrders } from './iap';
import type { Subscription, TossOrder, PurchaseRequest } from 'types/subscription';

function toIdempotencyKey(request: PurchaseRequest): string {
  return request.idempotencyKey ?? request.idempotency_key ?? `idem_${Date.now().toString(36)}`;
}

function toOrderId(request: PurchaseRequest): string {
  return request.orderId ?? request.order_id ?? `order_${Date.now().toString(36)}`;
}

function toTransactionId(request: PurchaseRequest): string {
  return request.transactionId ?? request.transaction_id ?? `tx_${Date.now().toString(36)}`;
}

function toProductId(request: PurchaseRequest): string {
  return request.productId ?? request.product_id;
}

async function resolveAccessToken(forceRefresh = false): Promise<string | null> {
  if (forceRefresh) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

function normalizeJwtToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const token = raw.trim();
  if (!token) return null;
  return token.split('.').length === 3 ? token : null;
}

async function isUsableAccessToken(token: string): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

async function resolveAccessTokenForInvoke(): Promise<string | null> {
  const activeToken = normalizeJwtToken(await resolveAccessToken(false));
  if (activeToken && (await isUsableAccessToken(activeToken))) return activeToken;

  const refreshedToken = normalizeJwtToken(await resolveAccessToken(true));
  if (refreshedToken && (await isUsableAccessToken(refreshedToken))) return refreshedToken;
  return null;
}

function isTestEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
}

async function invokeVerifyIapOrderViaFetch(
  body: Record<string, unknown>,
  accessToken: string | null,
): Promise<{ data: unknown; error: unknown }> {
  const { url, anonKey } = getSupabasePublicConfig();
  const response = await fetch(`${url}/functions/v1/verify-iap-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      data: null,
      error: {
        status: response.status,
        payload,
      },
    };
  }

  return { data: payload, error: null };
}

function getInvokeHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const withContext = error as { context?: unknown; status?: number };
  if (typeof withContext.status === 'number') return withContext.status;

  const context = withContext.context as { status?: number } | undefined;
  if (typeof context?.status === 'number') return context.status;
  return undefined;
}

interface BackendOrderHistory {
  id: string;
  product_id: string;
  toss_status: TossOrder['toss_status'];
  grant_status: TossOrder['grant_status'];
  amount: number;
  created_at: string;
}

function mapBackendOrder(userId: string, row: BackendOrderHistory): TossOrder {
  return {
    id: row.id,
    user_id: userId,
    product_id: row.product_id,
    idempotency_key: '',
    toss_status: row.toss_status,
    grant_status: row.grant_status,
    amount: row.amount,
    toss_order_id: null,
    error_code: null,
    retry_count: 0,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function normalizeSubscription(row: Subscription | null): Subscription | null {
  if (!row) return null;
  const paidPro = row.is_active && (row.plan_type === 'PRO_MONTHLY' || row.plan_type === 'PRO_YEARLY');
  return {
    ...row,
    effective_is_pro: row.effective_is_pro ?? paidPro,
    effective_pro_source: row.effective_pro_source ?? (paidPro ? 'paid_subscription' : null),
    effective_pro_expires_at: row.effective_pro_expires_at ?? null,
  };
}

/** 현재 구독 상태 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const row = await withBackendFallback(
    async () => normalizeSubscription(await requestBackend<Subscription | null>('/api/v1/subscription/')),
    async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return normalizeSubscription(data as Subscription | null);
    },
  );
  return row;
}

/** IAP 구매 검증 (Edge Function) */
export async function verifyIAPOrder(request: PurchaseRequest): Promise<TossOrder> {
  const payload = {
    orderId: toOrderId(request),
    productId: toProductId(request),
    transactionId: toTransactionId(request),
    idempotencyKey: toIdempotencyKey(request),
  };

  const firstToken = await resolveAccessTokenForInvoke();
  if (!firstToken) {
    const sessionError = new Error('IAP_AUTH_SESSION_MISSING_OR_INVALID_JWT') as Error & {
      code?: string;
      status?: number;
    };
    sessionError.code = 'IAP_AUTH_SESSION_MISSING_OR_INVALID_JWT';
    sessionError.status = 401;
    throw sessionError;
  }
  if (__DEV__) {
    const { anonKey } = getSupabasePublicConfig();
    const { data: tokenUserData, error: tokenUserError } = await supabase.auth.getUser(firstToken);
    console.log('[IAP-001] verifyIAPOrder token debug', {
      tokenPreview: `${firstToken.slice(0, 12)}...${firstToken.slice(-8)}`,
      tokenLength: firstToken.length,
      isAnonKey: firstToken === anonKey,
      tokenUserId: tokenUserData.user?.id ?? null,
      tokenUserError: tokenUserError?.message ?? null,
    });
  }
  const firstInvoke = await supabase.functions.invoke('verify-iap-order', {
    body: payload,
    headers: firstToken ? { Authorization: `Bearer ${firstToken}` } : undefined,
  });
  let data = firstInvoke.data;
  let error = firstInvoke.error;

  if (error && getInvokeHttpStatus(error) === 401) {
    const refreshedToken = normalizeJwtToken(await resolveAccessToken(true));
    const retryToken =
      refreshedToken && (await isUsableAccessToken(refreshedToken)) ? refreshedToken : firstToken;
    if (__DEV__) {
      const { anonKey } = getSupabasePublicConfig();
      console.log('[IAP-001] verifyIAPOrder retry token debug', {
        source: retryToken === firstToken ? 'first' : 'refreshed',
        isAnonKey: retryToken === anonKey,
      });
    }
    const secondInvoke = await supabase.functions.invoke('verify-iap-order', {
      body: payload,
      headers: { Authorization: `Bearer ${retryToken}` },
    });
    data = secondInvoke.data;
    error = secondInvoke.error;

    if (!isTestEnvironment() && error && getInvokeHttpStatus(error) === 401) {
      const fallback = await invokeVerifyIapOrderViaFetch(payload, retryToken);
      data = fallback.data;
      error = fallback.error;
    }
  }

  const errStatus = getInvokeHttpStatus(error);
  if (!isTestEnvironment() && error && (errStatus === 404 || errStatus === 408)) {
    if (__DEV__) {
      console.log(`[IAP-001] verifyIAPOrder legacy ${errStatus} → FastAPI proxy`);
    }
    data = await requestBackend<TossOrder, typeof payload>('/api/v1/subscription/iap/verify', {
      method: 'POST',
      body: payload,
    });
    error = null;
  }

  if (error) throw error;
  return data as TossOrder;
}

/** 주문 이력 조회 */
export async function getOrders(userId: string): Promise<TossOrder[]> {
  return withBackendFallback(
    async () => {
      const rows = await requestBackend<BackendOrderHistory[]>('/api/v1/subscription/orders');
      return rows.map((row) => mapBackendOrder(userId, row));
    },
    async () => {
      const { data, error } = await supabase
        .from('toss_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TossOrder[];
    },
  );
}

/** 구독 복원 — 앱 시작 pending 복구 후 최신 구독 상태를 재조회한다. */
export async function restoreSubscription(userId: string): Promise<Subscription | null> {
  console.log('[IAP-001] restoreSubscription start', { userId });
  const recovered = await recoverPendingOrders(userId);
  console.log('[IAP-001] restoreSubscription recovered pending orders', { userId, recovered });
  return getSubscription(userId);
}
