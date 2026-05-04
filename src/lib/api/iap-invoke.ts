/**
 * IAP 내부 유틸 — 토큰 해석 + Edge Function 직접 호출 fallback
 * iap.ts에서 분리된 헬퍼. 외부에서 직접 import 금지.
 * Parity: IAP-001
 */
import { supabase } from './supabase';
import { getSupabasePublicConfig } from './supabase';

// ──────────────────────────────────────
// 토큰 해석 헬퍼
// ──────────────────────────────────────

export async function resolveAccessToken(forceRefresh = false): Promise<string | null> {
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

export function normalizeJwtToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const token = raw.trim();
  if (!token) return null;
  return token.split('.').length === 3 ? token : null;
}

export async function isUsableAccessToken(token: string): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

export async function resolveAccessTokenForInvoke(): Promise<string | null> {
  const activeToken = normalizeJwtToken(await resolveAccessToken(false));
  if (activeToken && (await isUsableAccessToken(activeToken))) return activeToken;

  const refreshedToken = normalizeJwtToken(await resolveAccessToken(true));
  if (refreshedToken && (await isUsableAccessToken(refreshedToken))) return refreshedToken;
  return null;
}

export function isTestEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
}

// ──────────────────────────────────────
// Edge Function 직접 호출 fallback (401 재시도용)
// ──────────────────────────────────────

export async function invokeVerifyIapOrderViaFetch(
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
    return { data: null, error: { status: response.status, payload } };
  }

  return { data: payload, error: null };
}

export function getInvokeHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const withContext = error as { context?: unknown; status?: number };
  if (typeof withContext.status === 'number') return withContext.status;

  const context = withContext.context as { status?: number } | undefined;
  if (typeof context?.status === 'number') return context.status;
  return undefined;
}
