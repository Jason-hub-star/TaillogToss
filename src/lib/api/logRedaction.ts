/**
 * Frontend API log redaction.
 * Parity: AUTH-001
 */

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'access_token',
  'accessToken',
  'apikey',
  'auth_code',
  'authCode',
  'authorization',
  'authorizationCode',
  'email',
  'id_token',
  'idToken',
  'jwt',
  'parent_email',
  'parentEmail',
  'parent_phone',
  'parentPhone',
  'phone',
  'phone_number',
  'refresh_token',
  'refreshToken',
  'serviceRoleKey',
  'service_role_key',
  'supabaseServiceRoleKey',
  'supabase_service_role_key',
  'toss_user_key',
  'tossUserKey',
  'userKey',
]);

const SENSITIVE_ASSIGNMENT =
  /(authorizationCode|authorization[_-]?code|authCode|auth[_-]?code|accessToken|access[_-]?token|refreshToken|refresh[_-]?token|idToken|id[_-]?token|tossUserKey|toss[_-]?user[_-]?key|userKey|jwt|apiKey|api[_-]?key|serviceRoleKey|service[_-]?role[_-]?key|supabaseServiceRoleKey|supabase[_-]?service[_-]?role[_-]?key)(["'\s:=]+)([^"'\s,&}]+)/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_LIKE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}(?!\d)/g;

function normalizeKey(key: string): string {
  return key.replace(/[_-]/g, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  for (const candidate of SENSITIVE_KEYS) {
    if (normalizeKey(candidate) === normalized) return true;
  }
  return false;
}

export function redactLogText(value: string): string {
  return value
    .replace(SENSITIVE_ASSIGNMENT, (_match, key: string, separator: string) => `${key}${separator}${REDACTED}`)
    .replace(BEARER_TOKEN, `Bearer ${REDACTED}`)
    .replace(JWT_LIKE, REDACTED)
    .replace(EMAIL, REDACTED)
    .replace(PHONE, REDACTED);
}

export function redactLogValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item)) as T;
  }

  if (typeof value === 'string') {
    return redactLogText(value) as T;
  }

  if (value !== null && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      redacted[key] = isSensitiveKey(key) ? REDACTED : redactLogValue(nested);
    }
    return redacted as T;
  }

  return value;
}

export function redactSerializedBodyForLog(body: string): string {
  try {
    return JSON.stringify(redactLogValue(JSON.parse(body)));
  } catch {
    return redactLogText(body);
  }
}
