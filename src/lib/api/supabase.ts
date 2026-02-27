/**
 * Supabase 클라이언트 — 싱글턴 인스턴스
 * Parity: APP-001
 */
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://kvknerzsqgmmdmyxlorl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2a25lcnpzcWdtbWRteXhsb3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTY4ODUsImV4cCI6MjA4NjM3Mjg4NX0.ycj_8qdIQsLGYbU0C9l86AKb6_BStfZbuSKRXV5Gd50';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  DEFAULT_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
}

if (__DEV__ && !process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
  console.warn(
    '[APP-001] Using bundled Supabase public config. Set EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY to override.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
