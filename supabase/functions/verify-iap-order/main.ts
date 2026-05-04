/**
 * verify-iap-order main — 내부 JWT 검증(auth/v1/user) 기반 IAP 검증 엔트리.
 * Parity: IAP-001
 *
 * mTLS 모드: TOSS_CLIENT_CERT_BASE64 + TOSS_CLIENT_KEY_BASE64 환경변수 존재 시 real,
 * 없으면 mock (로컬 개발 안전). TOSS_MTLS_MODE=real|mock 으로 명시 가능.
 */

type UserRole =
  | 'user'
  | 'trainer'
  | 'org_owner'
  | 'org_staff'
  | 'service_role'
  | 'authenticated';

interface VerifyIapOrderRequest {
  orderId: string;
  productId: string;
  transactionId: string;
  idempotencyKey: string;
  userId?: string;
  orgId?: string;
  trainerUserId?: string;
}

interface VerifyIapOrderResponse {
  id: string;
  user_id: string;
  product_id: string;
  idempotency_key: string;
  toss_status:
    | 'PURCHASED'
    | 'PAYMENT_COMPLETED'
    | 'FAILED'
    | 'REFUNDED'
    | 'ORDER_IN_PROGRESS'
    | 'NOT_FOUND';
  grant_status: 'pending' | 'granted' | 'grant_failed' | 'refund_requested' | 'refunded';
  amount: number;
  toss_order_id: string;
  error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface EdgeResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    correlationId: string;
    details?: Record<string, unknown>;
  };
}

interface AuthUserPayload {
  id?: string;
  role?: string;
  app_metadata?: {
    role?: string;
    user_role?: string;
  };
}

interface TossOrderUpsertInput {
  user_id: string;
  product_id: string;
  idempotency_key: string;
  toss_status: VerifyIapOrderResponse['toss_status'];
  grant_status: VerifyIapOrderResponse['grant_status'];
  amount: number;
  toss_order_id: string;
  error_code: string | null;
  retry_count: number;
}

interface TossOrderPersistedRow {
  id: string;
  user_id: string;
  product_id: string;
  idempotency_key: string;
  toss_status: VerifyIapOrderResponse['toss_status'];
  grant_status: VerifyIapOrderResponse['grant_status'];
  amount: number;
  toss_order_id: string;
  error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

import { createMTLSClient } from '../_shared/mTLSClient.ts';
import { resolveMtlsMode } from '../_shared/mtlsMode.ts';
import { iapCircuitBreaker, retryOnServerError } from '../_shared/circuitBreaker.ts';

const APP_ROLES = new Set<UserRole>(['user', 'trainer', 'org_owner', 'org_staff', 'service_role']);
const ALLOWED_ROLES = new Set<UserRole>([...APP_ROLES, 'authenticated']);
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// productId → 지급 유형 매핑 (IAP 상품 카탈로그와 동기화)
const PRODUCT_GRANTS: Record<string, { planType?: string; aiTokens?: number; durationDays?: number }> = {
  'ait.0000020829.09e69bf9.90a91624b0.7443236299': { planType: 'PRO_MONTHLY', durationDays: 30 },
  'ait.0000020829.b0b00d71.17c5290dc1.7444362301': { aiTokens: 10 },
  'ait.0000020829.32dc32cf.49e67a4cfa.7443541064': { aiTokens: 30 },
};

function newCorrelationId(prefix = 'err'): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${stamp}_${random}`;
}

function fail(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): EdgeResult<never> {
  return {
    ok: false,
    status,
    error: {
      code,
      message,
      retryable: false,
      correlationId: newCorrelationId('err'),
      details,
    },
  };
}

function ok<T>(data: T, status = 200): EdgeResult<T> {
  return { ok: true, status, data };
}

function toJsonResponse<T>(result: EdgeResult<T>): Response {
  return new Response(JSON.stringify(result), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function parseAppRoleFromToken(token: string): UserRole | undefined {
  const segments = token.split('.');
  if (segments.length !== 3) return undefined;
  const payloadJson = decodeBase64Url(segments[1]);
  if (!payloadJson) return undefined;

  try {
    const claims = JSON.parse(payloadJson) as Record<string, unknown> & {
      role?: string;
      user_role?: string;
      app_metadata?: { role?: string; user_role?: string };
    };
    const candidates = [
      claims.user_role,
      claims.app_metadata?.user_role,
      claims.app_metadata?.role,
      claims.role,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && APP_ROLES.has(candidate as UserRole)) {
        return candidate as UserRole;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function parseTokenRole(token: string): UserRole | undefined {
  const segments = token.split('.');
  if (segments.length !== 3) return undefined;
  const payloadJson = decodeBase64Url(segments[1]);
  if (!payloadJson) return undefined;

  try {
    const claims = JSON.parse(payloadJson) as { role?: string };
    if (typeof claims.role === 'string' && ALLOWED_ROLES.has(claims.role as UserRole)) {
      return claims.role as UserRole;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function resolveEffectiveRole(token: string, user: AuthUserPayload): UserRole | undefined {
  const appRoleFromToken = parseAppRoleFromToken(token);
  if (appRoleFromToken) return appRoleFromToken;

  const appRoleFromMetaCandidates = [user.app_metadata?.user_role, user.app_metadata?.role];
  for (const candidate of appRoleFromMetaCandidates) {
    if (typeof candidate === 'string' && APP_ROLES.has(candidate as UserRole)) {
      return candidate as UserRole;
    }
  }

  const tokenRole = parseTokenRole(token);
  if (tokenRole === 'authenticated') return 'authenticated';
  if (user.role === 'authenticated') return 'authenticated';
  return undefined;
}

async function verifyJwtViaAuth(
  token: string
): Promise<{ ok: true; user: AuthUserPayload & { id: string } } | { ok: false; error: EdgeResult<never> }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      error: fail('SUPABASE_CONFIG_MISSING', 'SUPABASE_URL/SUPABASE_ANON_KEY is required', 500),
    };
  }

  const verifyResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!verifyResponse.ok) {
    return { ok: false, error: fail('AUTH_UNAUTHORIZED', 'Invalid JWT', 401) };
  }

  const payload = await verifyResponse.json().catch(() => null) as AuthUserPayload | null;
  if (!payload?.id) {
    return { ok: false, error: fail('AUTH_UNAUTHORIZED', 'Invalid JWT payload', 401) };
  }

  return { ok: true, user: payload as AuthUserPayload & { id: string } };
}

async function upsertTossOrder(
  accessToken: string,
  input: TossOrderUpsertInput,
): Promise<{ ok: true; row: TossOrderPersistedRow } | { ok: false; error: EdgeResult<never> }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      error: fail('SUPABASE_CONFIG_MISSING', 'SUPABASE_URL/SUPABASE_ANON_KEY is required', 500),
    };
  }

  const endpoint =
    `${SUPABASE_URL}/rest/v1/toss_orders` +
    '?on_conflict=idempotency_key' +
    '&select=id,user_id,product_id,idempotency_key,toss_status,grant_status,amount,toss_order_id,error_code,retry_count,created_at,updated_at';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([input]),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    return {
      ok: false,
      error: fail('IAP_PERSIST_FAILED', 'Failed to persist toss_orders record', 502, {
        status: response.status,
        payload: payload.slice(0, 600),
      }),
    };
  }

  const rows = await response.json().catch(() => null) as TossOrderPersistedRow[] | null;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.id) {
    return {
      ok: false,
      error: fail('IAP_PERSIST_FAILED', 'Invalid toss_orders upsert response', 502),
    };
  }

  return { ok: true, row };
}


/**
 * 구독/토큰 활성화 — grant 성공 후 subscriptions 테이블 업데이트.
 * 실패해도 toss_orders grant는 기록되었으므로 non-fatal.
 * subscriptions.user_id UNIQUE 제약 필요 (migration 20260504000001).
 */
async function activateSubscription(userId: string, productId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  const grant = PRODUCT_GRANTS[productId];
  if (!grant) return;

  const now = new Date();
  const svcHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  if (grant.planType) {
    const nextBilling = new Date(now);
    nextBilling.setDate(nextBilling.getDate() + (grant.durationDays ?? 30));

    await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`,
      {
        method: 'POST',
        headers: { ...svcHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          user_id: userId,
          plan_type: grant.planType,
          is_active: true,
          next_billing_date: nextBilling.toISOString().split('T')[0],
          updated_at: now.toISOString(),
        }]),
      },
    );
  } else if (grant.aiTokens) {
    const getResp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=id,ai_tokens_remaining,ai_tokens_total`,
      { headers: svcHeaders },
    );
    const rows = await getResp.json().catch(() => []) as Array<{
      id: string;
      ai_tokens_remaining: number | null;
      ai_tokens_total: number | null;
    }>;

    if (rows.length > 0) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { ...svcHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({
            ai_tokens_remaining: (rows[0].ai_tokens_remaining ?? 0) + grant.aiTokens,
            ai_tokens_total: (rows[0].ai_tokens_total ?? 0) + grant.aiTokens,
            updated_at: now.toISOString(),
          }),
        },
      );
    } else {
      await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=user_id`,
        {
          method: 'POST',
          headers: { ...svcHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{
            user_id: userId,
            plan_type: 'FREE',
            is_active: false,
            ai_tokens_remaining: grant.aiTokens,
            ai_tokens_total: grant.aiTokens,
          }]),
        },
      );
    }
  }
}

/** 요청 전체 타임아웃 — processProductGrant 30초 한도보다 1초 마진 */
const REQUEST_TIMEOUT_MS = 29_000;

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return toJsonResponse(fail('METHOD_NOT_ALLOWED', `Unsupported method: ${request.method}`, 405));
  }

  const timeoutResponse = new Promise<Response>((resolve) => {
    setTimeout(
      () => resolve(toJsonResponse(fail('IAP_TIMEOUT', 'Request exceeded 30s processProductGrant limit', 504))),
      REQUEST_TIMEOUT_MS,
    );
  });

  return Promise.race([handleRequest(request), timeoutResponse]);
});

async function handleRequest(request: Request): Promise<Response> {

  const token = readBearerToken(request);
  if (!token) {
    return toJsonResponse(fail('AUTH_UNAUTHORIZED', 'Missing bearer token', 401));
  }

  // FastAPI 프록시 경로: service_role JWT로 호출 시 JWT 검증 없이 body.userId 사용
  // service_role key는 /auth/v1/user 엔드포인트에서 user.id를 반환하지 않으므로 claims 직접 파싱
  const isServiceRole = parseTokenRole(token) === 'service_role';

  let resolvedUserId: string | undefined;
  let role: UserRole;

  if (isServiceRole) {
    role = 'service_role';
  } else {
    const auth = await verifyJwtViaAuth(token);
    if (!auth.ok) {
      return toJsonResponse(auth.error);
    }
    const effectiveRole = resolveEffectiveRole(token, auth.user);
    if (!effectiveRole || !ALLOWED_ROLES.has(effectiveRole)) {
      return toJsonResponse(fail('AUTH_FORBIDDEN', 'Only authenticated app roles can verify IAP orders', 403));
    }
    role = effectiveRole;
    resolvedUserId = auth.user.id;
  }

  const body = await request.json().catch(() => null) as VerifyIapOrderRequest | null;
  if (!body) {
    return toJsonResponse(fail('VALIDATION_ERROR', 'Invalid JSON body', 400));
  }

  if (!body.orderId || !body.productId || !body.transactionId || !body.idempotencyKey) {
    return toJsonResponse(
      fail('VALIDATION_ERROR', 'orderId/productId/transactionId/idempotencyKey are required', 400),
    );
  }

  // service_role 호출은 FastAPI가 이미 검증한 userId를 body에서 가져온다
  if (isServiceRole) {
    if (!body.userId) {
      return toJsonResponse(fail('VALIDATION_ERROR', 'userId is required for service_role calls', 400));
    }
    resolvedUserId = body.userId;
  }

  // authenticated 기본 세션은 개인 결제만 허용하고 조직/트레이너 지급 컨텍스트는 차단한다.
  if (role === 'authenticated' && (body.orgId || body.trainerUserId)) {
    return toJsonResponse(
      fail('AUTH_FORBIDDEN', 'authenticated role cannot grant org/trainer scoped purchases', 403),
    );
  }

  // mTLS 실 검증 — cert/key 환경변수 존재 시 real, 없으면 mock (로컬 안전)
  const mTLSClient = createMTLSClient(resolveMtlsMode());
  let tossResult: { tossStatus: VerifyIapOrderResponse['toss_status']; amount: number; tossOrderId: string; errorCode?: string };
  try {
    tossResult = await iapCircuitBreaker.execute(
      'verify-iap-order',
      () => retryOnServerError(
        () => mTLSClient.verifyIapOrder({
          orderId: body.orderId,
          productId: body.productId,
          transactionId: body.transactionId,
        }),
        { maxRetries: 2, baseDelayMs: 150 }
      )
    );
  } catch (err) {
    const status = typeof err === 'object' && err !== null && 'status' in err ? Number((err as { status: unknown }).status) : 502;
    return toJsonResponse(fail('IAP_VERIFY_FAILED', 'Toss IAP verification failed', status));
  }

  const grantStatus: VerifyIapOrderResponse['grant_status'] =
    tossResult.tossStatus === 'PAYMENT_COMPLETED' ? 'granted'
    : tossResult.tossStatus === 'REFUNDED' ? 'refunded'
    : tossResult.tossStatus === 'FAILED' || tossResult.tossStatus === 'NOT_FOUND' ? 'grant_failed'
    : 'pending';

  const persisted = await upsertTossOrder(token, {
    user_id: resolvedUserId!,
    product_id: body.productId,
    idempotency_key: body.idempotencyKey,
    toss_status: tossResult.tossStatus,
    grant_status: grantStatus,
    amount: tossResult.amount,
    toss_order_id: tossResult.tossOrderId,
    error_code: tossResult.errorCode ?? null,
    retry_count: 0,
  });

  if (!persisted.ok) {
    return toJsonResponse(persisted.error);
  }

  if (grantStatus === 'granted') {
    try {
      await activateSubscription(resolvedUserId!, body.productId);
    } catch (err) {
      console.error('[verify-iap-order] subscription activation failed (non-fatal):', err);
    }
  }

  const response: VerifyIapOrderResponse = {
    id: persisted.row.id,
    user_id: persisted.row.user_id,
    product_id: persisted.row.product_id,
    idempotency_key: persisted.row.idempotency_key,
    toss_status: persisted.row.toss_status,
    grant_status: persisted.row.grant_status,
    amount: persisted.row.amount,
    toss_order_id: persisted.row.toss_order_id,
    error_code: persisted.row.error_code,
    retry_count: persisted.row.retry_count,
    created_at: persisted.row.created_at,
    updated_at: persisted.row.updated_at,
  };

  return toJsonResponse(ok(response));
}
