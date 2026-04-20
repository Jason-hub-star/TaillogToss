/**
 * Supabase 클라이언트 — 싱글턴 인스턴스
 * Parity: APP-001
 */
import { createClient } from '@supabase/supabase-js';

/**
 * Granite 번들러는 process.env를 인라인하지 않으므로 fallback 필수.
 * anon key는 클라이언트용 publishable key (RLS로 보호됨).
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  'https://SUPABASE_PROJECT.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  'REDACTED_ANON_KEY';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const msg = '[APP-001] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 환경변수를 설정해주세요.';
  if (__DEV__) {
    console.error(msg);
  } else {
    throw new Error(msg);
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
