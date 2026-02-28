/**
 * FastAPI HTTP 클라이언트 — FE→BE 전환 공통 레이어
 * Authorization(JWT) 헤더 + JSON 응답/에러 파싱을 통일한다.
 * Parity: AI-001, B2B-001
 */
import { supabase } from './supabase';
import { NativeModules } from 'react-native';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

// 개발 전용: adb reverse tcp:8000 바인딩 실패 시 실기기가 PC에 직접 접근할 LAN IP.
// 네트워크 변경 시 이 값만 수정한다. 프로덕션에서는 사용되지 않는다.
const DEV_LAN_BACKEND_URL = 'http://172.30.1.1:8000';

function resolveBackendUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;

  // 실기기 Metro 번들 URL(host:8081)에서 host를 추출해 backend(8000)로 맞춘다.
  const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL;
  if (!scriptURL || (!scriptURL.startsWith('http://') && !scriptURL.startsWith('https://'))) {
    return DEFAULT_BACKEND_URL;
  }

  try {
    const parsed = new URL(scriptURL);
    if (!parsed.hostname) return DEFAULT_BACKEND_URL;
    // Metro가 0.0.0.0/localhost로 노출되면 실기기에서 127.0.0.1은 기기 자신을 가리킨다.
    // __DEV__에서는 LAN IP로, 프로덕션에서는 loopback으로 폴백한다.
    if (parsed.hostname === '0.0.0.0' || parsed.hostname === 'localhost') {
      return __DEV__ ? DEV_LAN_BACKEND_URL : DEFAULT_BACKEND_URL;
    }
    return `${parsed.protocol}//${parsed.hostname}:8000`;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

const BACKEND_URL = resolveBackendUrl();

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
}

export interface BackendApiError extends Error {
  status?: number;
  details?: unknown;
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function getAccessTokenOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    const authError = new Error('BACKEND_AUTH_MISSING') as BackendApiError;
    authError.status = 401;
    throw authError;
  }
  return accessToken;
}

function toBackendApiError(message: string, status?: number, details?: unknown): BackendApiError {
  const error = new Error(message) as BackendApiError;
  error.status = status;
  error.details = details;
  return error;
}

export async function requestBackend<TResponse, TBody = unknown>(
  path: string,
  options?: RequestOptions<TBody>,
): Promise<TResponse> {
  const method = options?.method ?? 'GET';
  const url = buildUrl(path);
  const accessToken = await getAccessTokenOrThrow();

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers ?? {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail =
      typeof parsed === 'object' && parsed !== null && 'detail' in parsed
        ? (parsed as { detail?: unknown }).detail
        : parsed;
    throw toBackendApiError(`BACKEND_${response.status}`, response.status, detail);
  }

  return parsed as TResponse;
}

/**
 * FastAPI 호출 실패 시 기존 Supabase 구현으로 폴백한다.
 * 개발 중 단계 전환에서 회귀를 줄이기 위한 안전장치.
 */
export async function withBackendFallback<T>(runBackend: () => Promise<T>, runFallback: () => Promise<T>): Promise<T> {
  try {
    return await runBackend();
  } catch (error) {
    if (__DEV__) {
      console.warn('[FE-BE] backend fallback to supabase', error);
    }
    return runFallback();
  }
}
