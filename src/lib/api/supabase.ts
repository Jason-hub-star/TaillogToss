/**
 * Supabase 클라이언트 — 싱글턴 인스턴스
 * Parity: APP-001
 */
import { createClient } from '@supabase/supabase-js';
import { Storage } from '@apps-in-toss/framework';

// EXPO_PUBLIC_* 는 공개 값 — AIT Runtime이 process.env를 빈 객체로 재설정하므로 상수 fallback 사용
const _SUPABASE_URL = 'https://gxvtgrcqkbdibkyeqyil.supabase.co';
const _SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dnRncmNxa2JkaWJreWVxeWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTUxOTcsImV4cCI6MjA5MTAzMTE5N30.D7EtO5WoTIK-15mCeEzzjBRvbZtPWKq79rvGRpQLTx8';

const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  (process.env.SUPABASE_URL as string | undefined) ||
  _SUPABASE_URL;
const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (process.env.SUPABASE_ANON_KEY as string | undefined) ||
  _SUPABASE_ANON_KEY;

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
    storage: Storage,
    detectSessionInUrl: false,
  },
});
