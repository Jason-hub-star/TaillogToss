/**
 * FastAPI HTTP 클라이언트 — FE→BE 전환 공통 레이어
 * Authorization(JWT) 헤더 + JSON 응답/에러 파싱을 통일한다.
 * Parity: AI-001, B2B-001
 */
import { NativeModules } from 'react-native';
import { redactLogValue, redactSerializedBodyForLog } from './logRedaction';
import { supabase } from './supabase';

const PUBLIC_BACKEND_URL = 'https://taillogtoss-backend-l35lj.ondigitalocean.app';
const LOCAL_BACKEND_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2']);

function devLoopbackBackendUrl(): string {
  const host = ['127', '0', '0', '1'].join('.');
  return ['http', '://', host, ':', '8765'].join('');
}

function isPublicReleaseBackendUrl(value: string | undefined): value is string {
  if (!value || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') return false;
    if (LOCAL_BACKEND_HOSTS.has(parsed.hostname)) return false;
    if (parsed.hostname.startsWith('192.168.')) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveBackendUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!__DEV__) return isPublicReleaseBackendUrl(fromEnv) ? fromEnv.trim() : PUBLIC_BACKEND_URL;

  // 개발 중 실기기 Metro 번들 URL(host:8081)에서 host를 추출해 backend(8765)로 맞춘다.
  const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL;
  if (!scriptURL || (!scriptURL.startsWith('http://') && !scriptURL.startsWith('https://'))) {
    return devLoopbackBackendUrl();
  }

  try {
    const parsed = new URL(scriptURL);
    if (!parsed.hostname) return PUBLIC_BACKEND_URL;
    // Metro가 0.0.0.0/localhost로 노출되면 실기기에서 127.0.0.1은 기기 자신을 가리킨다.
    if (parsed.hostname === '0.0.0.0' || parsed.hostname === 'localhost') {
      // adb reverse tcp:8765 tcp:8765 설정 시 local dev에서만 loopback 접근 가능.
      return devLoopbackBackendUrl();
    }
    return `${parsed.protocol}//${parsed.hostname}:8765`;
  } catch {
    return devLoopbackBackendUrl();
  }
}

const BACKEND_URL = resolveBackendUrl();
const UNTRUSTED_AUTH_HEADER_NAMES = new Set([
  'authorization',
  'apikey',
  'x-user-role',
  'x-user-id',
  'x-org-role',
]);

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

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3;
}

function toBackendAuthError(message: 'BACKEND_AUTH_MISSING' | 'BACKEND_AUTH_INVALID'): BackendApiError {
  const authError = new Error(message) as BackendApiError;
  authError.status = 401;
  return authError;
}

async function clearInvalidSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local cleanup is best-effort; callers still fail closed on invalid tokens.
  }
}

async function validateAccessToken(
  accessToken: string | null | undefined,
  required: boolean,
): Promise<string | null> {
  if (!accessToken) {
    if (required) throw toBackendAuthError('BACKEND_AUTH_MISSING');
    return null;
  }

  if (!isJwtLike(accessToken)) {
    await clearInvalidSession();
    if (required) throw toBackendAuthError('BACKEND_AUTH_INVALID');
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    await clearInvalidSession();
    if (required) throw toBackendAuthError('BACKEND_AUTH_INVALID');
    return null;
  }

  return accessToken;
}

async function getAccessTokenOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return await validateAccessToken(data.session?.access_token, true) as string;
}

async function getAccessTokenOptional(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return await validateAccessToken(data.session?.access_token, false);
  } catch {
    return null;
  }
}

function toBackendApiError(message: string, status?: number, details?: unknown): BackendApiError {
  const error = new Error(message) as BackendApiError;
  error.status = status;
  error.details = details;
  return error;
}

function sanitizeCallerHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !UNTRUSTED_AUTH_HEADER_NAMES.has(key.toLowerCase())),
  );
}

function redactPerformancePath(path: string): string {
  return path.replace(/\/dogs\/[^/]+\/behavior-analytics/, '/dogs/:dogId/behavior-analytics');
}

function logBackendServerTiming(method: HttpMethod, path: string, response: Response): void {
  if (!__DEV__) return;
  if (!path.includes('/behavior-analytics')) return;

  try {
    const serverTiming = response.headers.get('server-timing');
    const debugTiming = response.headers.get('x-taillog-server-timing');
    const timing = debugTiming || serverTiming;
    if (!timing) return;

    console.log('[PERF][backend-server-timing]', {
      method,
      path: redactPerformancePath(path),
      status: response.status,
      timing,
    });
  } catch {
    // Timing headers are diagnostic only; never fail the API call because of them.
  }
}

function redactErrorForLog(error: unknown): unknown {
  if (error instanceof Error) {
    const candidate = error as BackendApiError;
    return redactLogValue({
      name: error.name,
      message: error.message,
      status: candidate.status,
      details: candidate.details,
    });
  }
  return redactLogValue(error);
}

export async function requestBackend<TResponse, TBody = unknown>(
  path: string,
  options?: RequestOptions<TBody>,
): Promise<TResponse> {
  const method = options?.method ?? 'GET';
  const url = buildUrl(path);
  const accessToken = await getAccessTokenOrThrow();

  const serializedBody = options?.body ? JSON.stringify(options.body) : undefined;

  if (__DEV__ && serializedBody) {
    console.log(`[FE-BE] ${method} ${path} body:`, redactSerializedBodyForLog(serializedBody));
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...sanitizeCallerHeaders(options?.headers),
      Authorization: `Bearer ${accessToken}`,
    },
    body: serializedBody,
  });

  logBackendServerTiming(method, path, response);

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
    if (__DEV__) {
      console.warn(`[FE-BE] ${method} ${path} → ${response.status}`, redactLogValue(detail));
    }
    throw toBackendApiError(`BACKEND_${response.status}`, response.status, detail);
  }

  return parsed as TResponse;
}

export async function requestBackendPublic<TResponse, TBody = unknown>(
  path: string,
  options?: RequestOptions<TBody>,
): Promise<TResponse> {
  const method = options?.method ?? 'GET';
  const url = buildUrl(path);
  const accessToken = await getAccessTokenOptional();

  const serializedBody = options?.body ? JSON.stringify(options.body) : undefined;

  if (__DEV__ && serializedBody) {
    console.log(`[FE-BE] ${method} ${path} body:`, redactSerializedBodyForLog(serializedBody));
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...sanitizeCallerHeaders(options?.headers),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: serializedBody,
  });

  logBackendServerTiming(method, path, response);

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
    if (__DEV__) {
      console.warn(`[FE-BE] ${method} ${path} → ${response.status}`, redactLogValue(detail));
    }
    throw toBackendApiError(`BACKEND_${response.status}`, response.status, detail);
  }

  return parsed as TResponse;
}

/**
 * FastAPI 호출 실패 시 기존 Supabase 구현으로 폴백한다.
 * 개발 중 단계 전환에서 회귀를 줄이기 위한 안전장치.
 *
 * Network request failed(백엔드 미실행)는 첫 1회만 warn, 이후 무시.
 * 그 외 에러(4xx/5xx 등)는 항상 warn.
 */
let _backendUnreachableLogged = false;

export async function withBackendFallback<T>(runBackend: () => Promise<T>, runFallback: () => Promise<T>): Promise<T> {
  try {
    return await runBackend();
  } catch (error) {
    if (__DEV__) {
      const isNetworkError =
        error instanceof TypeError && /network request failed/i.test(error.message);
      if (isNetworkError) {
        if (!_backendUnreachableLogged) {
          _backendUnreachableLogged = true;
          console.warn('[FE-BE] backend unreachable, using supabase fallback (이후 동일 경고 생략)');
        }
      } else {
        console.warn('[FE-BE] backend fallback to supabase', redactErrorForLog(error));
      }
    }
    try {
      return await runFallback();
    } catch (fallbackError) {
      if (__DEV__) {
        console.error('[FE-BE] supabase fallback also failed', redactErrorForLog(fallbackError));
      }
      throw fallbackError;
    }
  }
}
