/**
 * PII Guard — 민감 정보 키를 재귀적으로 마스킹해 로그 유출을 방지한다.
 * Parity: AUTH-001
 */

const PII_KEYS = [
  'phone',
  'ci',
  'birthday',
  'email',
  'name',
  'gender',
  'nationality',
  'authorization',
  'apikey',
  'accessToken',
  'idToken',
  'jwt',
  'refreshToken',
  'serviceRoleKey',
  'service_role_key',
  'supabaseServiceRoleKey',
  'supabase_service_role_key',
  'auth_code',
  'authorizationCode',
  'authCode',
  'parentPhone',
  'parentEmail',
  'userKey',
  'tossUserKey',
  'toss_user_key',
] as const;

const REDACTED = '[REDACTED]';
const SENSITIVE_ASSIGNMENT =
  /(authorizationCode|authorization[_-]?code|authCode|auth[_-]?code|accessToken|access[_-]?token|refreshToken|refresh[_-]?token|idToken|id[_-]?token|tossUserKey|toss[_-]?user[_-]?key|userKey|jwt|apiKey|api[_-]?key|serviceRoleKey|service[_-]?role[_-]?key|supabaseServiceRoleKey|supabase[_-]?service[_-]?role[_-]?key)(["'\s:=]+)([^"'\s,&}]+)/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_LIKE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}(?!\d)/g;

function normalizeKey(key: string): string {
  return key.replace(/[_-]/g, '').toLowerCase();
}

export function isPiiKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return PII_KEYS.some((candidate) => normalizeKey(candidate) === normalized);
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (typeof value === 'string') {
    return redactText(value);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isPiiKey(key) ? REDACTED : sanitizeValue(nested);
    }
    return result;
  }

  return value;
}

export function redactText(value: string): string {
  return value
    .replace(SENSITIVE_ASSIGNMENT, (_match, key: string, separator: string) => `${key}${separator}${REDACTED}`)
    .replace(BEARER_TOKEN, `Bearer ${REDACTED}`)
    .replace(JWT_LIKE, REDACTED)
    .replace(EMAIL, REDACTED)
    .replace(PHONE, REDACTED);
}

export function redactPII<T>(payload: T): T {
  return sanitizeValue(payload) as T;
}

export function safeLogPayload(payload: unknown): Record<string, unknown> {
  const sanitized = redactPII(payload);
  if (sanitized !== null && typeof sanitized === 'object') {
    return sanitized as Record<string, unknown>;
  }
  return { value: sanitized };
}
