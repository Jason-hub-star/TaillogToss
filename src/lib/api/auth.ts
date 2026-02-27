/**
 * 인증 API — Toss Login → Edge Function → Supabase Auth
 * Parity: AUTH-001
 */
import { supabase } from './supabase';
import { isSupabaseConfigured } from './supabase';
import type { TossLoginResponse } from 'types/auth';

type TossLoginReferrer = 'DEFAULT' | 'SANDBOX' | string;
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

function createClientNonce(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeReferrer(referrer?: TossLoginReferrer): string | undefined {
  const raw = referrer?.trim();
  if (!raw) return undefined;
  return raw;
}

/** Toss 로그인 (Edge Function 호출) */
export async function loginWithToss(
  authCode: string,
  referrer?: TossLoginReferrer
): Promise<TossLoginResponse> {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_ENV_MISSING');
  }

  const { data, error } = await supabase.functions.invoke('login-with-toss', {
    body: {
      authorizationCode: authCode,
      referrer: normalizeReferrer(referrer),
      nonce: createClientNonce(),
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

  if (!isJwtLike(payload.access_token) || !isJwtLike(payload.refresh_token)) {
    return false;
  }

  const { error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw error;
  return true;
}

/** 로그아웃 */
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 회원탈퇴 — 사용자 상태를 inactive로 변경 후 로그아웃.
 * Toss 연동해제는 toss-disconnect 콜백에서 Toss가 별도 호출.
 */
export async function withdrawUser(userId: string): Promise<void> {
  const { error: updateError } = await supabase
    .from('users')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) throw updateError;
  await logout();
}

/** 현재 세션 확인 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
