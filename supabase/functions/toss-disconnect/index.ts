/**
 * toss-disconnect — 토스 연결 끊기 콜백 Edge Function.
 * 토스 앱 설정에서 사용자가 연결 해제 시 토스 서버가 호출.
 * Basic Auth 인증, verify_jwt=false.
 * Parity: AUTH-001
 */

import { fail, ok } from '../_shared/contracts.ts';

type DisconnectReferrer = 'UNLINK' | 'WITHDRAWAL_TERMS' | 'WITHDRAWAL_TOSS';

interface DisconnectRequest {
  userKey: number;
  referrer: DisconnectReferrer;
}

const VALID_REFERRERS: DisconnectReferrer[] = ['UNLINK', 'WITHDRAWAL_TERMS', 'WITHDRAWAL_TOSS'];
const USER_KEY_COLUMNS = ['toss_user_key', 'kakao_sync_id'] as const;

function getSupabaseEnv(): { supabaseUrl: string; serviceKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return { supabaseUrl, serviceKey };
}

function isMissingColumnError(status: number, body: string, column: string): boolean {
  if (status !== 400) return false;
  const lowered = body.toLowerCase();
  return lowered.includes(column.toLowerCase()) && (lowered.includes('could not find') || lowered.includes('column'));
}

/** 허용 CORS origin: 콘솔 테스트 + Sandbox */
const ALLOWED_ORIGINS = [
  'https://apps-in-toss.toss.im',
  'https://taillog-toss.private-apps.tossmini.com',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function verifyBasicAuth(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Basic ')) return false;

  const expectedId = Deno.env.get('TOSS_CALLBACK_AUTH_ID');
  const expectedPw = Deno.env.get('TOSS_CALLBACK_AUTH_PW');
  if (!expectedId || !expectedPw) return false;

  try {
    const decoded = atob(authHeader.slice(6));
    const [id, pw] = decoded.split(':');
    return id === expectedId && pw === expectedPw;
  } catch {
    return false;
  }
}

function hashUserKey(userKey: number): string {
  const str = String(userKey);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `uk_${Math.abs(hash).toString(36)}`;
}

async function patchUserByAnyKey(
  userKey: number,
  buildPayload: (column: (typeof USER_KEY_COLUMNS)[number]) => Record<string, unknown>,
  contextLabel: string,
): Promise<void> {
  const { supabaseUrl, serviceKey } = getSupabaseEnv();
  let lastError = '';

  for (const column of USER_KEY_COLUMNS) {
    const res = await fetch(`${supabaseUrl}/rest/v1/users?${column}=eq.${encodeURIComponent(String(userKey))}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ...buildPayload(column),
        updated_at: new Date().toISOString(),
      }),
    });

    if (res.ok) return;

    const body = await res.text().catch(() => '');
    if (isMissingColumnError(res.status, body, column)) {
      lastError = `${column}:missing`;
      continue;
    }

    throw new Error(`${contextLabel} PATCH failed (${column}): ${res.status} ${body}`);
  }

  throw new Error(`${contextLabel} PATCH failed: no compatible user-key column (${lastError || 'unknown'})`);
}

async function findUserIdByAnyKey(userKey: number): Promise<string | null> {
  const { supabaseUrl, serviceKey } = getSupabaseEnv();

  for (const column of USER_KEY_COLUMNS) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/users?${column}=eq.${encodeURIComponent(String(userKey))}&select=id&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    if (res.ok) {
      const users = await res.json();
      if (users.length > 0) return users[0].id as string;
      return null;
    }

    const body = await res.text().catch(() => '');
    if (isMissingColumnError(res.status, body, column)) {
      continue;
    }

    throw new Error(`WITHDRAWAL_TOSS lookup failed (${column}): ${res.status} ${body}`);
  }

  return null;
}

function getDisconnectIdempotencyKey(userKeyHash: string, referrer: DisconnectReferrer): string {
  return `disconnect_${userKeyHash}_${referrer}`.slice(0, 255);
}

async function handleUnlink(userKey: number): Promise<void> {
  // 유저키 컬럼이 마이그레이션 상태에 따라 다를 수 있어 둘 다 지원
  await patchUserByAnyKey(
    userKey,
    (column) => ({ [column]: null }),
    'UNLINK',
  );
}

async function handleWithdrawalTerms(userKey: number): Promise<void> {
  // PII 삭제 + 익명화 (user_xxxxx)
  const anonymId = `user_${String(userKey).slice(-5).padStart(5, '0')}`;
  await patchUserByAnyKey(
    userKey,
    (column) => ({ [column]: anonymId }),
    'WITHDRAWAL_TERMS',
  );
}

async function handleWithdrawalToss(userKey: number): Promise<void> {
  const { supabaseUrl, serviceKey } = getSupabaseEnv();
  const userId = await findUserIdByAnyKey(userKey);

  if (userId) {
    // Supabase Auth 사용자 삭제 → CASCADE로 관련 데이터 삭제
    // 결제 이력은 ON DELETE SET NULL 또는 별도 보존 테이블로 5년 보존
    const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!delRes.ok) {
      const body = await delRes.text().catch(() => '');
      throw new Error(`WITHDRAWAL_TOSS delete failed: ${delRes.status} ${body}`);
    }
  }
}

async function logDisconnect(
  userKeyHash: string,
  referrer: DisconnectReferrer,
  success: boolean
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return;

  const idempotencyKey = getDisconnectIdempotencyKey(userKeyHash, referrer);
  try {
    await fetch(`${supabaseUrl}/rest/v1/noti_history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        channel: 'WEB_PUSH',
        template_code: 'toss_disconnect',
        template_set_code: `toss_disconnect_${referrer.toLowerCase()}`,
        sent_at: new Date().toISOString(),
        success,
        error_code: success ? null : 'disconnect_failed',
        idempotency_key: idempotencyKey,
      }),
    });
  } catch {
    // 로그 실패는 무시 (메인 처리에 영향 없음)
  }
}

async function checkAlreadyProcessed(
  userKeyHash: string,
  referrer: DisconnectReferrer,
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return false;

  const idempotencyKey = getDisconnectIdempotencyKey(userKeyHash, referrer);
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/noti_history?select=id&limit=1&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&success=eq.true`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    if (!res.ok) return false;
    const rows = await res.json();
    return rows.length > 0;
  } catch {
    return false; // 조회 실패 시 처리 진행 (fail-open)
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight (콘솔 테스트 + Sandbox 버튼용)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const headers = { 'Content-Type': 'application/json', ...corsHeaders };

  // Basic Auth 검증
  const authHeader = req.headers.get('Authorization');
  if (!verifyBasicAuth(authHeader)) {
    return new Response(
      JSON.stringify(fail('UNAUTHORIZED', 'Invalid credentials', 401)),
      { status: 401, headers }
    );
  }

  let currentUserKeyHash = 'unknown';
  let currentReferrer: DisconnectReferrer = 'UNLINK';

  try {
    let body: DisconnectRequest;

    if (req.method === 'GET') {
      // GET 방식: query param으로 전달
      const url = new URL(req.url);
      body = {
        userKey: Number(url.searchParams.get('userKey') || 0),
        referrer: (url.searchParams.get('referrer') || '') as DisconnectReferrer,
      };
    } else if (req.method === 'POST') {
      body = await req.json();
    } else {
      return new Response(
        JSON.stringify(fail('METHOD_NOT_ALLOWED', 'Use GET or POST', 405)),
        { status: 405, headers }
      );
    }

    const { userKey, referrer } = body;

    if (!userKey || isNaN(userKey) || userKey <= 0 || !VALID_REFERRERS.includes(referrer)) {
      return new Response(
        JSON.stringify(fail('INVALID_PARAMS', 'userKey and valid referrer required')),
        { status: 400, headers }
      );
    }

    const userKeyHash = hashUserKey(userKey);
    currentUserKeyHash = userKeyHash;
    currentReferrer = referrer;

    // 멱등성: 동일 요청 이미 처리됐으면 즉시 200 반환 (토스 서버 재시도 대응)
    const alreadyProcessed = await checkAlreadyProcessed(userKeyHash, referrer);
    if (alreadyProcessed) {
      return new Response(
        JSON.stringify(ok({ processed: true, referrer, deduplicated: true })),
        { status: 200, headers }
      );
    }

    // referrer별 처리
    switch (referrer) {
      case 'UNLINK':
        await handleUnlink(userKey);
        break;
      case 'WITHDRAWAL_TERMS':
        await handleWithdrawalTerms(userKey);
        break;
      case 'WITHDRAWAL_TOSS':
        await handleWithdrawalToss(userKey);
        break;
    }

    // 처리 로그 기록
    await logDisconnect(userKeyHash, referrer, true);

    return new Response(
      JSON.stringify(ok({ processed: true, referrer })),
      { status: 200, headers }
    );
  } catch (err) {
    await logDisconnect(currentUserKeyHash, currentReferrer, false);

    return new Response(
      JSON.stringify(fail('INTERNAL', String(err), 500)),
      { status: 500, headers }
    );
  }
});
