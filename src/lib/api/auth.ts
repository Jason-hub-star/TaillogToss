/**
 * 인증 API — Toss Login → Edge Function → Supabase Auth
 * Parity: AUTH-001
 */
import { supabase } from './supabase';
import { isSupabaseConfigured } from './supabase';
import { Storage } from '@apps-in-toss/framework';
import type { TossLoginResponse } from 'types/auth';

type TossLoginReferrer = 'DEFAULT' | 'SANDBOX' | string;
export type AuthEntryFlow = 'B2C' | 'B2B';
type EdgeEnvelope<T> = {
  ok?: boolean;
  status?: number;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

const AUTH_ENTRY_FLOW_KEY = 'taillog:auth-entry-flow:v1';

function createClientNonce(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeReferrer(referrer?: TossLoginReferrer): string {
  const raw = referrer?.trim();
  if (!raw) return 'DEFAULT';
  return raw;
}

/** Toss 로그인 (Edge Function 호출) */
export async function loginWithToss(
  authCode: string,
  referrer?: TossLoginReferrer,
  flow: AuthEntryFlow = 'B2C',
): Promise<TossLoginResponse> {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_ENV_MISSING');
  }

  const { data, error } = await supabase.functions.invoke('login-with-toss', {
    body: {
      authorizationCode: authCode,
      referrer: normalizeReferrer(referrer),
      nonce: createClientNonce(),
      flow,
    },
  });
  if (error) throw error;

  const envelope = data as EdgeEnvelope<TossLoginResponse> | null;
  if (envelope && typeof envelope === 'object' && ('ok' in envelope || 'data' in envelope)) {
    if (envelope.ok === false || !envelope.data) {
      const code = envelope.error?.code ?? 'EDGE_RESPONSE_ERROR';
      const message = envelope.error?.message ?? 'Invalid edge response';
      throw new Error(`${code}: ${message}`);
    }
    return envelope.data;
  }

  return data as TossLoginResponse;
}

export async function setPreferredAuthEntryFlow(flow: AuthEntryFlow): Promise<void> {
  await Storage.setItem(AUTH_ENTRY_FLOW_KEY, flow);
}

export async function getPreferredAuthEntryFlow(): Promise<AuthEntryFlow | null> {
  const value = await Storage.getItem(AUTH_ENTRY_FLOW_KEY);
  return value === 'B2C' || value === 'B2B' ? value : null;
}

export async function clearPreferredAuthEntryFlow(): Promise<void> {
  await Storage.removeItem(AUTH_ENTRY_FLOW_KEY);
}

/**
 * 일반 사용자 진입은 같은 Toss 계정이 과거 B2B self-join을 눌렀더라도
 * 세션 메타데이터를 B2C(user)로 되돌린다. 서버 함수도 같은 보정을 하지만,
 * 이미 발급된 세션/로컬 부트스트랩 흔들림을 막기 위해 클라이언트에서도 다운그레이드만 허용한다.
 */
export async function normalizeCurrentSessionAsB2C(): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      role: 'user',
      status: 'active',
      timezone: 'Asia/Seoul',
    },
  });
  if (error) throw error;
  await supabase.auth.refreshSession();
}

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3;
}

/**
 * Edge 브릿지 응답 토큰으로 Supabase 세션을 설정한다.
 * 현재 mock 토큰 형식(sb_access_...)이면 세션 설정을 건너뛴다.
 */
export async function setSessionFromBridgeResponse(payload: TossLoginResponse): Promise<boolean> {
  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error('INVALID_BRIDGE_TOKENS');
  }

  // Supabase refresh token은 JWT가 아닐 수 있으므로 access token만 판별한다.
  if (!isJwtLike(payload.access_token)) {
    return false;
  }

  console.log('[AUTH-001] supabase setSession start');
  const { error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw error;
  console.log('[AUTH-001] supabase setSession done');

  console.log('[AUTH-001] supabase getUser verify start');
  const { data: userData, error: userError } = await supabase.auth.getUser(payload.access_token);
  console.log('[AUTH-001] supabase getUser verify done', { ok: Boolean(userData.user), hasError: Boolean(userError) });
  if (userError || !userData.user) {
    await supabase.auth.signOut();
    return false;
  }
  return true;
}

/** 로그아웃 */
export async function logout(): Promise<void> {
  await clearPreferredAuthEntryFlow();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 회원탈퇴 — withdraw-user Edge Function 호출.
 * public.users CASCADE 삭제 → auth.users 삭제 (서버에서 service_role로 처리).
 * Toss 연동해제는 toss-disconnect 콜백에서 Toss가 별도 호출.
 */
export async function withdrawUser(userId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('NO_SESSION');

  const { error: invokeError, data } = await supabase.functions.invoke('withdraw-user', {
    body: { userId },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (invokeError) throw invokeError;
  if (!(data as { ok?: boolean })?.ok) {
    throw new Error((data as { error?: { code?: string } })?.error?.code ?? 'WITHDRAW_FAILED');
  }

  await logout();
}

/** 현재 세션 확인 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * B2B 역할 자동 부여 — 셀프 가입 플로우.
 * assign-b2b-role Edge Function 호출 후 세션 갱신.
 * 갱신된 세션의 user_metadata.role에 새 역할이 반영됨.
 */
export async function assignB2BRole(role: 'org_owner' | 'trainer' = 'org_owner'): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('NO_SESSION');

  const { error, data } = await supabase.functions.invoke('assign-b2b-role', {
    body: { role },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw error;
  if (!(data as { ok?: boolean })?.ok) {
    throw new Error((data as { error?: { code?: string } })?.error?.code ?? 'ASSIGN_ROLE_FAILED');
  }

  // 세션 갱신 → user_metadata.role이 새 역할로 업데이트됨
  await supabase.auth.refreshSession();
}
