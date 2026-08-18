/**
 * withdraw-user — 회원탈퇴: public.users CASCADE 삭제 → auth.users 삭제.
 * verify_jwt=false (ES256 호환). JWT는 내부에서 Admin API로 직접 검증.
 * 본인만 탈퇴 가능 (JWT sub === body.userId, Supabase Auth 검증).
 * Parity: AUTH-001
 */

import { fail, ok, type EdgeResult } from '../_shared/contracts.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface WithdrawDeps {
  getEnv: (key: string) => string | undefined;
  fetchFn: typeof fetch;
}

type CleanupAction = 'set_null' | 'delete';

interface UserReferenceCleanup {
  table: string;
  column: string;
  action: CleanupAction;
}

const USER_REFERENCE_CLEANUPS: UserReferenceCleanup[] = [
  { table: 'behavior_logs', column: 'recorded_by', action: 'set_null' },
  { table: 'training_sessions', column: 'user_id', action: 'set_null' },
  { table: 'training_goals', column: 'user_id', action: 'set_null' },
  { table: 'ai_recommendation_snapshots', column: 'user_id', action: 'set_null' },
  { table: 'ai_recommendation_feedback', column: 'user_id', action: 'set_null' },
  { table: 'case_intakes', column: 'author_user_id', action: 'set_null' },
  { table: 'org_dogs', column: 'parent_user_id', action: 'set_null' },
  { table: 'pii_access_log', column: 'accessor_id', action: 'set_null' },
  { table: 'parent_interactions', column: 'parent_user_id', action: 'set_null' },
  { table: 'parent_interactions', column: 'responded_by', action: 'set_null' },
  { table: 'daily_reports', column: 'created_by_trainer_id', action: 'delete' },
  { table: 'dog_assignments', column: 'trainer_user_id', action: 'delete' },
  { table: 'org_subscriptions', column: 'trainer_user_id', action: 'delete' },
  { table: 'ai_cost_usage_org', column: 'trainer_user_id', action: 'delete' },
];

function defaultDeps(): WithdrawDeps {
  return {
    getEnv: (key) => (typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined),
    fetchFn: fetch,
  };
}

/** JWT payload에서 sub(userId) 추출 — 서명 없이 디코드만 */
export function extractSubFromJwt(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Supabase Admin API로 JWT의 실제 소유자를 검증한다.
 * ES256 알고리즘 토큰도 서버사이드에서 정상 처리됨.
 */
async function verifyJwtOwner(
  authHeader: string | null,
  supabaseUrl: string,
  serviceRoleKey: string,
  fetchFn: typeof fetch,
): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice(7);

  // Admin API: GET /auth/v1/user — 토큰으로 유저 정보 조회 (서명 검증 포함)
  const res = await fetchFn(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!res.ok) return null;

  const data = await res.json() as { id?: string };
  return data?.id ? { userId: data.id } : null;
}

function isMissingRestTarget(status: number, body: string): boolean {
  if (status === 404) return true;
  return body.includes('PGRST204') || body.includes('PGRST205') || body.includes('Could not find');
}

async function applyUserReferenceCleanup(
  supabaseUrl: string,
  adminHeaders: Record<string, string>,
  userId: string,
  cleanup: UserReferenceCleanup,
  fetchFn: typeof fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const filter = `${cleanup.column}=eq.${encodeURIComponent(userId)}`;
  const url = `${supabaseUrl}/rest/v1/${cleanup.table}?${filter}`;
  const init: RequestInit = cleanup.action === 'delete'
    ? { method: 'DELETE', headers: { ...adminHeaders, Prefer: 'return=minimal' } }
    : {
        method: 'PATCH',
        headers: { ...adminHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ [cleanup.column]: null }),
      };

  const res = await fetchFn(url, init);
  if (res.ok) return { ok: true };

  const body = await res.text().catch(() => '');
  if (isMissingRestTarget(res.status, body)) return { ok: true };

  return {
    ok: false,
    message: `${cleanup.table}.${cleanup.column} cleanup failed: ${res.status} ${body}`,
  };
}

async function selectIds(
  supabaseUrl: string,
  adminHeaders: Record<string, string>,
  path: string,
  fetchFn: typeof fetch,
): Promise<{ ok: true; ids: string[] } | { ok: false; message: string }> {
  const res = await fetchFn(`${supabaseUrl}/rest/v1/${path}`, {
    headers: adminHeaders,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (isMissingRestTarget(res.status, body)) return { ok: true, ids: [] };
    return { ok: false, message: `${path} select failed: ${res.status} ${body}` };
  }

  const body = await res.text().catch(() => '');
  let rows: unknown;
  try {
    rows = body ? JSON.parse(body) : [];
  } catch {
    rows = [];
  }

  if (!Array.isArray(rows)) return { ok: true, ids: [] };
  return {
    ok: true,
    ids: rows
      .map((row) => (row as { id?: unknown }).id)
      .filter((id): id is string => typeof id === 'string'),
  };
}

async function clearPiiAccessOrgDogReferences(
  supabaseUrl: string,
  adminHeaders: Record<string, string>,
  userId: string,
  fetchFn: typeof fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const dogIdsResult = await selectIds(
    supabaseUrl,
    adminHeaders,
    `dogs?user_id=eq.${encodeURIComponent(userId)}&select=id`,
    fetchFn,
  );
  if (!dogIdsResult.ok) return dogIdsResult;

  const orgDogIds = new Set<string>();
  const parentOrgDogsResult = await selectIds(
    supabaseUrl,
    adminHeaders,
    `org_dogs?parent_user_id=eq.${encodeURIComponent(userId)}&select=id`,
    fetchFn,
  );
  if (!parentOrgDogsResult.ok) return parentOrgDogsResult;
  parentOrgDogsResult.ids.forEach((id) => orgDogIds.add(id));

  if (dogIdsResult.ids.length > 0) {
    const dogFilter = dogIdsResult.ids.map(encodeURIComponent).join(',');
    const dogOrgDogsResult = await selectIds(
      supabaseUrl,
      adminHeaders,
      `org_dogs?dog_id=in.(${dogFilter})&select=id`,
      fetchFn,
    );
    if (!dogOrgDogsResult.ok) return dogOrgDogsResult;
    dogOrgDogsResult.ids.forEach((id) => orgDogIds.add(id));
  }

  const ids = [...orgDogIds];
  if (ids.length === 0) return { ok: true };

  const orgDogFilter = ids.map(encodeURIComponent).join(',');
  const res = await fetchFn(
    `${supabaseUrl}/rest/v1/pii_access_log?org_dog_id=in.(${orgDogFilter})`,
    {
      method: 'PATCH',
      headers: { ...adminHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ org_dog_id: null }),
    },
  );
  if (res.ok) return { ok: true };

  const body = await res.text().catch(() => '');
  if (isMissingRestTarget(res.status, body)) return { ok: true };
  return {
    ok: false,
    message: `pii_access_log.org_dog_id cleanup failed: ${res.status} ${body}`,
  };
}

async function clearUserReferences(
  supabaseUrl: string,
  adminHeaders: Record<string, string>,
  userId: string,
  fetchFn: typeof fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const orgDogPiiCleanup = await clearPiiAccessOrgDogReferences(
    supabaseUrl,
    adminHeaders,
    userId,
    fetchFn,
  );
  if (!orgDogPiiCleanup.ok) return orgDogPiiCleanup;

  for (const cleanup of USER_REFERENCE_CLEANUPS) {
    const result = await applyUserReferenceCleanup(supabaseUrl, adminHeaders, userId, cleanup, fetchFn);
    if (!result.ok) return result;
  }

  const ownerCleanup = await applyUserReferenceCleanup(
    supabaseUrl,
    adminHeaders,
    userId,
    { table: 'organizations', column: 'owner_user_id', action: 'set_null' },
    fetchFn,
  );
  if (ownerCleanup.ok) return { ok: true };

  return applyUserReferenceCleanup(
    supabaseUrl,
    adminHeaders,
    userId,
    { table: 'organizations', column: 'owner_user_id', action: 'delete' },
    fetchFn,
  );
}

export async function handleWithdraw(
  authHeader: string | null,
  body: unknown,
  deps: WithdrawDeps,
): Promise<EdgeResult<{ withdrawn: boolean }>> {
  const supabaseUrl = deps.getEnv('SUPABASE_URL');
  const serviceRoleKey = deps.getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return fail('CONFIG_MISSING', 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing', 500);
  }

  // JWT 검증 — Admin API 경유 (ES256 지원)
  const verified = await verifyJwtOwner(authHeader, supabaseUrl, serviceRoleKey, deps.fetchFn);
  if (!verified) {
    return fail('UNAUTHORIZED', 'Valid JWT required', 401);
  }

  const parsed = body as { userId?: unknown };
  const userId = parsed?.userId;
  if (!userId || typeof userId !== 'string') {
    return fail('INVALID_PARAMS', 'userId is required', 400);
  }

  if (verified.userId !== userId) {
    return fail('FORBIDDEN', 'Cannot withdraw another user', 403);
  }

  const adminHeaders = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // Step 0: nullable/no-action references cleanup for older deployed schemas.
  const cleanupResult = await clearUserReferences(
    supabaseUrl,
    adminHeaders,
    userId,
    deps.fetchFn,
  );
  if (!cleanupResult.ok) {
    return fail('REFERENCE_CLEANUP_FAILED', cleanupResult.message, 500);
  }

  // Step 1: public.users DELETE (CASCADE)
  const deletePublicRes = await deps.fetchFn(
    `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
    { method: 'DELETE', headers: { ...adminHeaders, Prefer: 'return=minimal' } },
  );
  if (!deletePublicRes.ok && deletePublicRes.status !== 404) {
    const errText = await deletePublicRes.text().catch(() => '');
    return fail('DB_DELETE_FAILED', `public.users 삭제 실패: ${errText}`, 500);
  }

  // Step 2: auth.users DELETE (Admin API)
  const deleteAuthRes = await deps.fetchFn(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    { method: 'DELETE', headers: adminHeaders },
  );
  if (!deleteAuthRes.ok && deleteAuthRes.status !== 404) {
    const errText = await deleteAuthRes.text().catch(() => '');
    return fail('AUTH_DELETE_FAILED', `auth.users 삭제 실패: ${errText}`, 500);
  }

  return ok({ withdrawn: true });
}

function jsonResponse(result: EdgeResult<unknown>, status?: number): Response {
  return new Response(JSON.stringify(result), {
    status: status ?? result.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

if (typeof Deno !== 'undefined') {
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== 'POST') {
      return jsonResponse(fail('METHOD_NOT_ALLOWED', 'POST only', 405), 405);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(fail('INVALID_PARAMS', 'JSON body required', 400), 400);
    }

    const result = await handleWithdraw(
      req.headers.get('Authorization'),
      body,
      defaultDeps(),
    );
    return jsonResponse(result);
  });
}
