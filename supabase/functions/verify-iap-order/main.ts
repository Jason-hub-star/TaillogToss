/**
 * verify-iap-order main — 내부 JWT 검증(auth/v1/user) 기반 IAP 검증 엔트리.
 * Parity: IAP-001
 *
 * mTLS 모드: 운영/업로드본은 real로 fail-closed, DEV_LOCAL/test에서만 mock 허용.
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
  org_id?: string | null;
  trainer_user_id?: string | null;
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
  org_id?: string | null;
  trainer_user_id?: string | null;
  error_code: string | null;
  retry_count: number;
}

export interface TossOrderPersistedRow {
  id: string;
  user_id: string;
  product_id: string;
  idempotency_key: string;
  toss_status: VerifyIapOrderResponse['toss_status'];
  grant_status: VerifyIapOrderResponse['grant_status'];
  amount: number;
  toss_order_id: string;
  org_id?: string | null;
  trainer_user_id?: string | null;
  error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

import { createMTLSClient } from '../_shared/mTLSClient.ts';
import { resolveMtlsMode } from '../_shared/mtlsMode.ts';
import { iapCircuitBreaker, retryOnServerError } from '../_shared/circuitBreaker.ts';
import { isTrustedServiceRoleToken } from './auth.ts';

const edgeRuntime = (globalThis as {
  Deno?: {
    env: { get: (key: string) => string | undefined };
    serve?: (handler: (request: Request) => Promise<Response> | Response) => void;
  };
}).Deno;

const APP_ROLES = new Set<UserRole>(['user', 'trainer', 'org_owner', 'org_staff', 'service_role']);
const ALLOWED_ROLES = new Set<UserRole>([...APP_ROLES, 'authenticated']);
const SUPABASE_URL = edgeRuntime?.env.get('SUPABASE_URL')?.replace(/\/$/, '');
const SUPABASE_ANON_KEY = edgeRuntime?.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = edgeRuntime?.env.get('SUPABASE_SERVICE_ROLE_KEY');

// productId → 지급 유형 매핑 (IAP 상품 카탈로그와 동기화)
const PRODUCT_GRANTS: Record<string, { planType?: string; aiTokens?: number; durationDays?: number }> = {
  'ait.0000020829.09e69bf9.90a91624b0.7443236299': { planType: 'PRO_MONTHLY', durationDays: 30 },
  'ait.0000020829.b0b00d71.17c5290dc1.7444362301': { aiTokens: 10 },
  'ait.0000020829.32dc32cf.49e67a4cfa.7443541064': { aiTokens: 30 },
};

const B2B_PRODUCT_GRANTS: Record<string, { maxDogs: number; maxStaff: number; priceKrw: number }> = {
  center_basic: { maxDogs: 30, maxStaff: 5, priceKrw: 29000 },
  center_pro: { maxDogs: 60, maxStaff: 10, priceKrw: 59000 },
  center_enterprise: { maxDogs: 100, maxStaff: 20, priceKrw: 99000 },
  trainer_10: { maxDogs: 10, maxStaff: 1, priceKrw: 9900 },
  trainer_30: { maxDogs: 30, maxStaff: 1, priceKrw: 19900 },
  trainer_50: { maxDogs: 50, maxStaff: 1, priceKrw: 39900 },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

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
  input: TossOrderUpsertInput,
): Promise<{ ok: true; row: TossOrderPersistedRow } | { ok: false; conflict?: boolean; error: EdgeResult<never> }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error: fail('SUPABASE_CONFIG_MISSING', 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY is required', 500),
    };
  }

  const endpoint =
    `${SUPABASE_URL}/rest/v1/toss_orders` +
    '?select=id,user_id,product_id,idempotency_key,toss_status,grant_status,amount,toss_order_id,org_id,trainer_user_id,error_code,retry_count,created_at,updated_at';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify([input]),
  });

  if (!response.ok) {
    if (response.status === 409) {
      return {
        ok: false,
        conflict: true,
        error: fail('IAP_IDEMPOTENCY_CONFLICT', 'IAP idempotency key is already bound to another order', 409),
      };
    }

    return {
      ok: false,
      error: fail('IAP_PERSIST_FAILED', 'Failed to persist toss_orders record', 502, {
        status: response.status,
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

// SEC-1: 선점 insert 이후 활성화 결과로 grant_status/error_code 를 확정한다.
async function updateTossOrderGrantState(
  rowId: string,
  grantStatus: VerifyIapOrderResponse['grant_status'],
  errorCode: string | null,
): Promise<{ ok: true; row: TossOrderPersistedRow } | { ok: false; error: EdgeResult<never> }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error: fail('SUPABASE_CONFIG_MISSING', 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY is required', 500),
    };
  }

  const endpoint =
    `${SUPABASE_URL}/rest/v1/toss_orders?id=eq.${encodeURIComponent(rowId)}` +
    '&select=id,user_id,product_id,idempotency_key,toss_status,grant_status,amount,toss_order_id,org_id,trainer_user_id,error_code,retry_count,created_at,updated_at';

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      grant_status: grantStatus,
      error_code: errorCode,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      error: fail('IAP_PERSIST_FAILED', 'Failed to finalize toss_orders grant state', 502, {
        status: response.status,
      }),
    };
  }

  const rows = await response.json().catch(() => null) as TossOrderPersistedRow[] | null;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.id) {
    return {
      ok: false,
      error: fail('IAP_PERSIST_FAILED', 'Invalid toss_orders finalize response', 502),
    };
  }

  return { ok: true, row };
}

export function buildExistingTossOrderLookupFilter(idempotencyKey: string, orderId: string): string {
  return [
    `idempotency_key.eq.${encodeURIComponent(idempotencyKey)}`,
    `toss_order_id.eq.${encodeURIComponent(orderId)}`,
  ].join(',');
}

async function findExistingTossOrder(
  body: Pick<VerifyIapOrderRequest, 'idempotencyKey' | 'orderId'>,
): Promise<{ ok: true; row: TossOrderPersistedRow | null } | { ok: false; error: EdgeResult<never> }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error: fail('SUPABASE_CONFIG_MISSING', 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY is required', 500),
    };
  }

  const endpoint =
    `${SUPABASE_URL}/rest/v1/toss_orders` +
    `?or=(${buildExistingTossOrderLookupFilter(body.idempotencyKey, body.orderId)})` +
    '&select=id,user_id,product_id,idempotency_key,toss_status,grant_status,amount,toss_order_id,org_id,trainer_user_id,error_code,retry_count,created_at,updated_at' +
    '&limit=1';

  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      error: fail('IAP_IDEMPOTENCY_LOOKUP_FAILED', 'Failed to check IAP idempotency key', 502, {
        status: response.status,
      }),
    };
  }

  const rows = await response.json().catch(() => null) as TossOrderPersistedRow[] | null;
  return { ok: true, row: Array.isArray(rows) ? rows[0] ?? null : null };
}

export function isIapReplayCompatible(
  row: TossOrderPersistedRow,
  body: Pick<VerifyIapOrderRequest, 'orderId' | 'productId' | 'idempotencyKey' | 'orgId' | 'trainerUserId'>,
  resolvedUserId: string,
): boolean {
  return (
    row.user_id === resolvedUserId &&
    row.product_id === body.productId &&
    row.idempotency_key === body.idempotencyKey &&
    row.toss_order_id === body.orderId &&
    (row.org_id ?? null) === (body.orgId ?? null) &&
    (row.trainer_user_id ?? null) === (body.trainerUserId ?? null)
  );
}

function toVerifyIapOrderResponse(row: TossOrderPersistedRow): VerifyIapOrderResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    product_id: row.product_id,
    idempotency_key: row.idempotency_key,
    toss_status: row.toss_status,
    grant_status: row.grant_status,
    amount: row.amount,
    toss_order_id: row.toss_order_id,
    org_id: row.org_id ?? null,
    trainer_user_id: row.trainer_user_id ?? null,
    error_code: row.error_code,
    retry_count: row.retry_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function validateGrantedReplayEntitlement(row: TossOrderPersistedRow): Promise<EdgeResult<void>> {
  if (row.grant_status !== 'granted') {
    return ok(undefined);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return fail('SUPABASE_CONFIG_MISSING', 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY is required', 500);
  }

  const svcHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
  const b2cGrant = PRODUCT_GRANTS[row.product_id];

  if (b2cGrant?.planType) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(row.user_id)}` +
        `&plan_type=eq.${encodeURIComponent(b2cGrant.planType)}&is_active=eq.true&select=id&limit=1`,
      { headers: svcHeaders },
    );
    if (!response.ok) {
      return fail('IAP_GRANT_LEDGER_CHECK_FAILED', 'Failed to verify subscription grant ledger', 502, {
        status: response.status,
      });
    }
    const rows = await response.json().catch(() => []) as Array<{ id?: string }>;
    return rows[0]?.id
      ? ok(undefined)
      : fail('IAP_GRANT_LEDGER_INCONSISTENT', 'Granted IAP order has no active subscription', 409);
  }

  if (b2cGrant?.aiTokens) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(row.user_id)}` +
        `&ai_tokens_total=gte.${b2cGrant.aiTokens}&select=id&limit=1`,
      { headers: svcHeaders },
    );
    if (!response.ok) {
      return fail('IAP_GRANT_LEDGER_CHECK_FAILED', 'Failed to verify token grant ledger', 502, {
        status: response.status,
      });
    }
    const rows = await response.json().catch(() => []) as Array<{ id?: string }>;
    return rows[0]?.id
      ? ok(undefined)
      : fail('IAP_GRANT_LEDGER_INCONSISTENT', 'Granted IAP order has no token entitlement ledger', 409);
  }

  if (row.org_id || row.trainer_user_id) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/org_subscriptions?toss_order_id=eq.${encodeURIComponent(row.toss_order_id)}` +
        '&status=in.(active,trial)&select=id&limit=1',
      { headers: svcHeaders },
    );
    if (!response.ok) {
      return fail('IAP_GRANT_LEDGER_CHECK_FAILED', 'Failed to verify org subscription grant ledger', 502, {
        status: response.status,
      });
    }
    const rows = await response.json().catch(() => []) as Array<{ id?: string }>;
    return rows[0]?.id
      ? ok(undefined)
      : fail('IAP_GRANT_LEDGER_INCONSISTENT', 'Granted B2B IAP order has no active org subscription', 409);
  }

  return fail('IAP_GRANT_LEDGER_INCONSISTENT', 'Granted IAP order has no known entitlement mapping', 409);
}

export function resolveIapRequestUserId(params: {
  isServiceRole: boolean;
  bodyUserId?: string;
  authUserId?: string;
}): EdgeResult<{ userId: string }> {
  if (params.isServiceRole) {
    if (!params.bodyUserId) {
      return fail('VALIDATION_ERROR', 'userId is required for service_role calls', 400);
    }
    if (!isUuid(params.bodyUserId)) {
      return fail('VALIDATION_ERROR', 'userId must be a UUID', 400);
    }
    return ok({ userId: params.bodyUserId });
  }

  if (!params.authUserId) {
    return fail('AUTH_UNAUTHORIZED', 'Missing authenticated user id', 401);
  }
  if (!isUuid(params.authUserId)) {
    return fail('AUTH_UNAUTHORIZED', 'Invalid authenticated user id', 401);
  }
  return ok({ userId: params.authUserId });
}


/**
 * 구독/토큰 활성화 — 성공해야 toss_orders grant_status=granted로 기록한다.
 * subscriptions.user_id UNIQUE 제약 필요 (migration 20260504000001).
 */
async function activateSubscription(userId: string, productId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
  }

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

    const response = await fetch(
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
    if (!response.ok) {
      throw new Error(`SUBSCRIPTION_PLAN_ACTIVATION_FAILED:${response.status}`);
    }
  } else if (grant.aiTokens) {
    const getResp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=id,ai_tokens_remaining,ai_tokens_total`,
      { headers: svcHeaders },
    );
    if (!getResp.ok) {
      throw new Error(`SUBSCRIPTION_TOKEN_LOOKUP_FAILED:${getResp.status}`);
    }
    const rows = await getResp.json().catch(() => []) as Array<{
      id: string;
      ai_tokens_remaining: number | null;
      ai_tokens_total: number | null;
    }>;

    if (rows.length > 0) {
      const response = await fetch(
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
      if (!response.ok) {
        throw new Error(`SUBSCRIPTION_TOKEN_PATCH_FAILED:${response.status}`);
      }
    } else {
      const response = await fetch(
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
      if (!response.ok) {
        throw new Error(`SUBSCRIPTION_TOKEN_INSERT_FAILED:${response.status}`);
      }
    }
  }
}

function resolveB2BScope(body: VerifyIapOrderRequest): {
  orgId: string | null;
  trainerUserId: string | null;
  grant: { maxDogs: number; maxStaff: number; priceKrw: number } | null;
  error?: EdgeResult<never>;
} {
  const orgId = body.orgId ?? null;
  const trainerUserId = body.trainerUserId ?? null;
  if (!orgId && !trainerUserId) {
    if (B2B_PRODUCT_GRANTS[body.productId]) {
      return {
        orgId: null,
        trainerUserId: null,
        grant: null,
        error: fail('B2B_IAP_SCOPE_REQUIRED', 'B2B IAP product requires orgId or trainerUserId', 400),
      };
    }
    return { orgId: null, trainerUserId: null, grant: null };
  }
  if (orgId && trainerUserId) {
    return {
      orgId,
      trainerUserId,
      grant: null,
      error: fail('B2B_IAP_SCOPE_XOR', 'orgId and trainerUserId are mutually exclusive', 400),
    };
  }
  if (orgId && !isUuid(orgId)) {
    return {
      orgId,
      trainerUserId,
      grant: null,
      error: fail('B2B_IAP_ORG_ID_INVALID', 'orgId must be a UUID', 400),
    };
  }
  if (trainerUserId && !isUuid(trainerUserId)) {
    return {
      orgId,
      trainerUserId,
      grant: null,
      error: fail('B2B_IAP_TRAINER_ID_INVALID', 'trainerUserId must be a UUID', 400),
    };
  }

  const grant = B2B_PRODUCT_GRANTS[body.productId];
  if (!grant) {
    return {
      orgId,
      trainerUserId,
      grant: null,
      error: fail('B2B_IAP_PRODUCT_UNKNOWN', 'Unknown B2B IAP product', 400),
    };
  }

  const isCenterProduct = body.productId.startsWith('center_');
  const scopeMatches = (isCenterProduct && orgId && !trainerUserId) || (!isCenterProduct && trainerUserId && !orgId);
  if (!scopeMatches) {
    return {
      orgId,
      trainerUserId,
      grant: null,
      error: fail('B2B_IAP_PRODUCT_SCOPE_MISMATCH', 'B2B product does not match org/trainer scope', 400),
    };
  }
  return { orgId, trainerUserId, grant };
}

async function activateOrgSubscription(
  body: VerifyIapOrderRequest,
  tossOrderId: string,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
  }

  const scope = resolveB2BScope(body);
  if (!scope.grant) return;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  const svcHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  const lookupFilter = scope.orgId
    ? `org_id=eq.${encodeURIComponent(scope.orgId)}`
    : `trainer_user_id=eq.${encodeURIComponent(scope.trainerUserId!)}`;
  const existingResp = await fetch(
    `${SUPABASE_URL}/rest/v1/org_subscriptions?${lookupFilter}&status=in.(active,trial)&select=id&limit=1`,
    { headers: svcHeaders },
  );
  if (!existingResp.ok) {
    throw new Error(`ORG_SUBSCRIPTION_LOOKUP_FAILED:${existingResp.status}`);
  }
  const existing = await existingResp.json().catch(() => []) as Array<{ id: string }>;
  const payload = {
    org_id: scope.orgId,
    trainer_user_id: scope.trainerUserId,
    plan_type: body.productId,
    toss_order_id: tossOrderId,
    price_krw: scope.grant.priceKrw,
    max_dogs: scope.grant.maxDogs,
    max_staff: scope.grant.maxStaff,
    billing_cycle: 'monthly',
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
  };

  const response = existing[0]?.id
    ? await fetch(`${SUPABASE_URL}/rest/v1/org_subscriptions?id=eq.${encodeURIComponent(existing[0].id)}`, {
        method: 'PATCH',
        headers: { ...svcHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify(payload),
      })
    : await fetch(`${SUPABASE_URL}/rest/v1/org_subscriptions`, {
        method: 'POST',
        headers: { ...svcHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify([payload]),
      });

  if (!response.ok) {
    throw new Error(`ORG_SUBSCRIPTION_ACTIVATION_FAILED:${response.status}`);
  }
}

export async function finalizeGrantStateAfterActivation(params: {
  grantStatus: VerifyIapOrderResponse['grant_status'];
  errorCode: string | null;
  userId: string;
  productId: string;
  body: VerifyIapOrderRequest;
  tossOrderId: string;
  hasB2BGrant: boolean;
  activateSubscriptionFn?: (userId: string, productId: string) => Promise<void>;
  activateOrgSubscriptionFn?: (body: VerifyIapOrderRequest, tossOrderId: string) => Promise<void>;
}): Promise<{
  grantStatus: VerifyIapOrderResponse['grant_status'];
  errorCode: string | null;
}> {
  let grantStatus = params.grantStatus;
  let errorCode = params.errorCode;
  const hasB2CGrant = Boolean(PRODUCT_GRANTS[params.productId]);

  if (grantStatus === 'granted' && !hasB2CGrant && !params.hasB2BGrant) {
    grantStatus = 'grant_failed';
    errorCode = 'IAP_PRODUCT_GRANT_UNKNOWN';
  }

  if (grantStatus === 'granted' && hasB2CGrant) {
    try {
      await (params.activateSubscriptionFn ?? activateSubscription)(params.userId, params.productId);
    } catch {
      grantStatus = 'grant_failed';
      errorCode = 'SUBSCRIPTION_ACTIVATION_FAILED';
    }
  }

  if (grantStatus === 'granted' && params.hasB2BGrant) {
    try {
      await (params.activateOrgSubscriptionFn ?? activateOrgSubscription)(params.body, params.tossOrderId);
    } catch {
      grantStatus = 'grant_failed';
      errorCode = 'ORG_SUBSCRIPTION_ACTIVATION_FAILED';
    }
  }

  return { grantStatus, errorCode };
}

async function resolveTossUserKey(userId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=toss_user_key&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to resolve toss_user_key: ${response.status}`);
  }
  const rows = await response.json() as Array<{ toss_user_key?: string | null }>;
  return rows[0]?.toss_user_key ?? null;
}

/** 요청 전체 타임아웃 — processProductGrant 30초 한도보다 1초 마진 */
const REQUEST_TIMEOUT_MS = 29_000;

if (edgeRuntime?.serve) {
  edgeRuntime.serve(async (request: Request) => {
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
}

async function handleRequest(request: Request): Promise<Response> {

  const token = readBearerToken(request);
  if (!token) {
    return toJsonResponse(fail('AUTH_UNAUTHORIZED', 'Missing bearer token', 401));
  }

  // FastAPI 프록시 경로: 실제 service role key와 정확히 일치할 때만 body.userId 사용.
  // verify_jwt=false 함수라서 unsigned JWT payload의 role=service_role은 절대 신뢰하지 않는다.
  const isServiceRole = isTrustedServiceRoleToken(token, SUPABASE_SERVICE_ROLE_KEY);

  let resolvedUserId: string | undefined;

  if (!isServiceRole) {
    const auth = await verifyJwtViaAuth(token);
    if (!auth.ok) {
      return toJsonResponse(auth.error);
    }
    const effectiveRole = resolveEffectiveRole(token, auth.user);
    if (!effectiveRole || !ALLOWED_ROLES.has(effectiveRole)) {
      return toJsonResponse(fail('AUTH_FORBIDDEN', 'Only authenticated app roles can verify IAP orders', 403));
    }
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

  const userResolution = resolveIapRequestUserId({
    isServiceRole,
    bodyUserId: body.userId,
    authUserId: resolvedUserId,
  });
  if (!userResolution.ok) {
    return toJsonResponse(userResolution);
  }
  resolvedUserId = userResolution.data.userId;

  const b2bScope = resolveB2BScope(body);
  if (b2bScope.error) {
    return toJsonResponse(b2bScope.error);
  }

  // B2B 지급 컨텍스트는 FastAPI proxy가 JWT 사용자와 org/trainer 권한을 검증한 service_role 경로만 허용한다.
  if (!isServiceRole && b2bScope.grant) {
    return toJsonResponse(
      fail('AUTH_FORBIDDEN', 'B2B IAP context requires server-side membership verification', 403),
    );
  }

  const existing = await findExistingTossOrder(body);
  if (!existing.ok) {
    return toJsonResponse(existing.error);
  }

  if (existing.row) {
    if (!isIapReplayCompatible(existing.row, body, resolvedUserId!)) {
      return toJsonResponse(
        fail('IAP_IDEMPOTENCY_CONFLICT', 'IAP idempotency key is already bound to another order', 409),
      );
    }
    const replayEntitlement = await validateGrantedReplayEntitlement(existing.row);
    if (!replayEntitlement.ok) {
      return toJsonResponse(replayEntitlement);
    }
    return toJsonResponse(ok(toVerifyIapOrderResponse(existing.row)));
  }

  // mTLS 실 검증 — 업로드/운영 계열은 cert/key가 없어도 real fail-closed, mock은 명시적 DEV_LOCAL/test에서만 허용한다.
  const mTLSClient = createMTLSClient(resolveMtlsMode());
  let tossUserKey: string | null = null;
  try {
    tossUserKey = await resolveTossUserKey(resolvedUserId!);
  } catch {
    return toJsonResponse(fail('IAP_USER_KEY_RESOLVE_FAILED', 'Failed to resolve Toss user key', 502));
  }
  if (!tossUserKey) {
    return toJsonResponse(fail('IAP_USER_KEY_MISSING', 'Missing Toss user key for IAP verification', 404));
  }

  let tossResult: { tossStatus: VerifyIapOrderResponse['toss_status']; amount: number; tossOrderId: string; errorCode?: string };
  try {
    tossResult = await iapCircuitBreaker.execute(
      'verify-iap-order',
      () => retryOnServerError(
        () => mTLSClient.verifyIapOrder({
          orderId: body.orderId,
          productId: body.productId,
          transactionId: body.transactionId,
          userKey: tossUserKey,
        }),
        { maxRetries: 2, baseDelayMs: 150 }
      )
    );
  } catch (err) {
    const status = typeof err === 'object' && err !== null && 'status' in err ? Number((err as { status: unknown }).status) : 502;
    return toJsonResponse(fail('IAP_VERIFY_FAILED', 'Toss IAP verification failed', status));
  }

  const initialGrantStatus: VerifyIapOrderResponse['grant_status'] =
    tossResult.tossStatus === 'PAYMENT_COMPLETED' ? 'granted'
    : tossResult.tossStatus === 'REFUNDED' ? 'refunded'
    : tossResult.tossStatus === 'FAILED' || tossResult.tossStatus === 'NOT_FOUND' ? 'grant_failed'
    : 'pending';
  const initialErrorCode = tossResult.errorCode ?? null;
  const willActivate = initialGrantStatus === 'granted';

  // SEC-1 (도그푸딩 감사 2026-07-11): 활성화 "이전"에 toss_order_id 유니크 insert 로 선점한다.
  // 활성화(ai_tokens 적립)는 비멱등이라, 동시요청이 둘 다 활성화하면 토큰이 이중 적립된다.
  // 선점에 성공한 요청만 활성화하고, 결과로 grant_status 를 확정 UPDATE 한다.
  const claim = await upsertTossOrder({
    user_id: resolvedUserId!,
    product_id: body.productId,
    idempotency_key: body.idempotencyKey,
    toss_status: tossResult.tossStatus,
    grant_status: willActivate ? 'pending' : initialGrantStatus,
    amount: tossResult.amount,
    toss_order_id: tossResult.tossOrderId,
    org_id: b2bScope.orgId,
    trainer_user_id: b2bScope.trainerUserId,
    error_code: initialErrorCode,
    retry_count: 0,
  });

  if (!claim.ok) {
    // 유니크 충돌 = 다른 요청이 이미 이 주문을 선점(활성화 담당). 기존 행으로 replay 안내.
    if (claim.conflict) {
      const existingAfter = await findExistingTossOrder(body);
      if (
        existingAfter.ok &&
        existingAfter.row &&
        isIapReplayCompatible(existingAfter.row, body, resolvedUserId!)
      ) {
        const replayEntitlement = await validateGrantedReplayEntitlement(existingAfter.row);
        if (!replayEntitlement.ok) {
          return toJsonResponse(replayEntitlement);
        }
        return toJsonResponse(ok(toVerifyIapOrderResponse(existingAfter.row)));
      }
    }
    return toJsonResponse(claim.error);
  }

  // 활성화 대상이 아니면(결제완료 외) 선점 행을 그대로 반환.
  if (!willActivate) {
    return toJsonResponse(ok(toVerifyIapOrderResponse(claim.row)));
  }

  // 선점 성공 + 결제완료 → 이 요청만 활성화(유일 처리자 보장).
  const finalizedGrant = await finalizeGrantStateAfterActivation({
    grantStatus: initialGrantStatus,
    errorCode: initialErrorCode,
    userId: resolvedUserId!,
    productId: body.productId,
    body,
    tossOrderId: tossResult.tossOrderId,
    hasB2BGrant: Boolean(b2bScope.grant),
  });

  const finalized = await updateTossOrderGrantState(
    claim.row.id,
    finalizedGrant.grantStatus,
    finalizedGrant.errorCode,
  );
  if (!finalized.ok) {
    return toJsonResponse(finalized.error);
  }

  return toJsonResponse(ok(toVerifyIapOrderResponse(finalized.row)));
}
