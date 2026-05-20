/**
 * FastAPI HTTP 클라이언트 — FE→BE 전환 공통 레이어
 * Authorization(JWT) 헤더 + JSON 응답/에러 파싱을 통일한다.
 * Parity: AI-001, B2B-001
 */
import { supabase } from './supabase';
import { NativeModules } from 'react-native';

const PUBLIC_BACKEND_URL = 'https://taillogtoss-backend-l35lj.ondigitalocean.app';
const DEV_LOOPBACK_BACKEND_URL = 'http://127.0.0.1:8765';

function resolveBackendUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  if (!__DEV__) return PUBLIC_BACKEND_URL;

  // 개발 중 실기기 Metro 번들 URL(host:8081)에서 host를 추출해 backend(8765)로 맞춘다.
  const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } })?.SourceCode?.scriptURL;
  if (!scriptURL || (!scriptURL.startsWith('http://') && !scriptURL.startsWith('https://'))) {
    return PUBLIC_BACKEND_URL;
  }

  try {
    const parsed = new URL(scriptURL);
    if (!parsed.hostname) return PUBLIC_BACKEND_URL;
    // Metro가 0.0.0.0/localhost로 노출되면 실기기에서 127.0.0.1은 기기 자신을 가리킨다.
    if (parsed.hostname === '0.0.0.0' || parsed.hostname === 'localhost') {
      // adb reverse tcp:8765 tcp:8765 설정 시 local dev에서만 loopback 접근 가능.
      return DEV_LOOPBACK_BACKEND_URL;
    }
    return `${parsed.protocol}//${parsed.hostname}:8765`;
  } catch {
    return PUBLIC_BACKEND_URL;
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

function redactPerformancePath(path: string): string {
  return path.replace(/\/dogs\/[^/]+\/behavior-analytics/, '/dogs/:dogId/behavior-analytics');
}

function logBackendServerTiming(method: HttpMethod, path: string, response: Response): void {
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

export async function requestBackend<TResponse, TBody = unknown>(
  path: string,
  options?: RequestOptions<TBody>,
): Promise<TResponse> {
  const method = options?.method ?? 'GET';
  const url = buildUrl(path);
  const accessToken = await getAccessTokenOrThrow();

  const serializedBody = options?.body ? JSON.stringify(options.body) : undefined;

  if (__DEV__ && serializedBody) {
    console.log(`[FE-BE] ${method} ${path} body:`, serializedBody);
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers ?? {}),
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
      console.warn(`[FE-BE] ${method} ${path} → ${response.status}`, detail);
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
        console.warn('[FE-BE] backend fallback to supabase', error);
      }
    }
    try {
      return await runFallback();
    } catch (fallbackError) {
      if (__DEV__) {
        console.error('[FE-BE] supabase fallback also failed', fallbackError);
      }
      throw fallbackError;
    }
  }
}
