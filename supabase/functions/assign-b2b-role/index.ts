/**
 * assign-b2b-role — B2B 역할 자동 부여 (셀프 가입 플로우)
 * 인증된 유저가 호출 → user_metadata.role + public.users.role 업데이트
 * verify_jwt=false (withdraw-user 패턴): Admin API로 직접 JWT 검증.
 * Parity: AUTH-001, B2B-001
 */

import { fail, ok } from '../_shared/contracts.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_SELF_ROLES = ['org_owner', 'trainer'] as const;
type AllowedRole = (typeof ALLOWED_SELF_ROLES)[number];

export interface AssignB2BRoleDeps {
  getEnv: (key: string) => string | undefined;
  fetchFn: typeof fetch;
}

function defaultDeps(): AssignB2BRoleDeps {
  return {
    getEnv: (key) => (typeof Deno !== 'undefined' ? Deno.env.get(key) : undefined),
    fetchFn: fetch,
  };
}

/** JWT로 유저 검증 — withdraw-user와 동일 패턴 */
async function verifyJwtOwner(
  authHeader: string | null,
  supabaseUrl: string,
  serviceRoleKey: string,
  fetchFn: typeof fetch,
): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice(7);

  const res = await fetchFn(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!res.ok) return null;
  const data = await res.json() as { id?: string };
  return data.id ? { userId: data.id } : null;
}

export async function handleAssignB2BRole(
  req: Request,
  deps: AssignB2BRoleDeps,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = deps.getEnv('SUPABASE_URL');
  const serviceRoleKey = deps.getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    const result = fail('SUPABASE_ENV_MISSING', 'Supabase env not configured', 500);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // JWT 검증
  const authHeader = req.headers.get('Authorization');
  const owner = await verifyJwtOwner(authHeader, supabaseUrl, serviceRoleKey, deps.fetchFn);
  if (!owner) {
    const result = fail('UNAUTHORIZED', 'Invalid or missing JWT', 401);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // role 파라미터 검증 (기본값: org_owner)
  const body = await req.json().catch(() => ({})) as { role?: string };
  const role = (body.role ?? 'org_owner') as AllowedRole;
  if (!(ALLOWED_SELF_ROLES as readonly string[]).includes(role)) {
    const result = fail('INVALID_ROLE', `role must be one of: ${ALLOWED_SELF_ROLES.join(', ')}`, 400);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 1. auth.users user_metadata.role 업데이트 (Admin API)
  const adminRes = await deps.fetchFn(
    `${supabaseUrl}/auth/v1/admin/users/${owner.userId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ user_metadata: { role } }),
    },
  );

  if (!adminRes.ok) {
    console.error('[assign-b2b-role] AUTH_UPDATE_FAILED', { status: adminRes.status });
    const result = fail('AUTH_UPDATE_FAILED', 'Failed to update user_metadata', 500);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // 2. public.users.role 업데이트
  const usersRes = await deps.fetchFn(
    `${supabaseUrl}/rest/v1/users?id=eq.${owner.userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ role }),
    },
  );

  if (!usersRes.ok) {
    console.error('[assign-b2b-role] USERS_UPDATE_FAILED', { status: usersRes.status });
    const result = fail('USERS_UPDATE_FAILED', 'Failed to update public.users', 500);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const result = ok({ userId: owner.userId, role });
  return new Response(JSON.stringify(result), {
    status: result.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const edgeRuntime = (globalThis as {
  Deno?: { serve: (handler: (request: Request) => Promise<Response> | Response) => void };
}).Deno;

if (edgeRuntime?.serve) {
  edgeRuntime.serve(async (req: Request) => handleAssignB2BRole(req, defaultDeps()));
}
