/**
 * Edge Function 공통 계약 — 응답 포맷/컨텍스트/에러 타입.
 * Parity: AUTH-001, IAP-001, MSG-001
 */

export type UserRole = 'user' | 'trainer' | 'org_owner' | 'org_staff' | 'service_role';

export interface EdgeContext {
  clientKey: string;
  role?: UserRole;
  now?: Date;
}

export interface EdgeError {
  code: string;
  message: string;
  retryable: boolean;
  correlationId: string;
  details?: Record<string, unknown>;
}

export interface EdgeResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: EdgeError;
}

export function newCorrelationId(prefix = 'edge'): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${stamp}_${random}`;
}

export function ok<T>(data: T, status = 200): EdgeResult<T> {
  return {
    ok: true,
    status,
    data,
  };
}

export function fail(
  code: string,
  message: string,
  status = 400,
  options?: {
    retryable?: boolean;
    details?: Record<string, unknown>;
    correlationId?: string;
  }
): EdgeResult<never> {
  return {
    ok: false,
    status,
    error: {
      code,
      message,
      retryable: options?.retryable ?? false,
      correlationId: options?.correlationId ?? newCorrelationId('err'),
      details: options?.details,
    },
  };
}
