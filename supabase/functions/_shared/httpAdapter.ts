/**
 * httpAdapter — Edge 핸들러를 Deno HTTP 요청/응답으로 어댑팅한다.
 * Parity: AUTH-001, IAP-001, MSG-001
 */

import { fail, type EdgeContext, type EdgeResult, type UserRole } from './contracts.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ALLOWED_ROLES: UserRole[] = ['user', 'trainer', 'org_owner', 'org_staff', 'service_role'];
const JWT_SEGMENTS = 3;

type JwtClaims = Record<string, unknown> & {
  role?: string;
  user_role?: string;
  app_metadata?: {
    role?: string;
    user_role?: string;
  };
};

function parseRole(value: string | null): UserRole | undefined {
  if (!value) return undefined;
  if (ALLOWED_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return undefined;
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    if (typeof atob === 'function') {
      return atob(padded);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

function parseJwtClaims(request: Request): JwtClaims | null {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  const segments = token.split('.');
  if (segments.length !== JWT_SEGMENTS) return null;

  const payloadJson = decodeBase64Url(segments[1]);
  if (!payloadJson) return null;

  try {
    return JSON.parse(payloadJson) as JwtClaims;
  } catch {
    return null;
  }
}

function resolveRoleFromJwt(claims: JwtClaims | null): UserRole | undefined {
  if (!claims) return undefined;

  const candidates = [
    claims.user_role,
    claims.app_metadata?.user_role,
    claims.app_metadata?.role,
    claims.role,
  ];

  for (const candidate of candidates) {
    const parsed = parseRole(typeof candidate === 'string' ? candidate : null);
    if (parsed) return parsed;
  }

  return undefined;
}

export function buildEdgeContext(request: Request): EdgeContext {
  return {
    clientKey: request.headers.get('x-client-key') ?? 'local-invoke',
    // Never trust caller-controlled role headers. Resolve role from verified JWT claims only.
    role: resolveRoleFromJwt(parseJwtClaims(request)),
    now: new Date(),
  };
}

export async function parseRequestJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function toJsonResponse<T>(result: EdgeResult<T>): Response {
  return new Response(JSON.stringify(result), {
    status: result.status,
    headers: JSON_HEADERS,
  });
}

export function methodNotAllowed(method: string): Response {
  return toJsonResponse(
    fail('METHOD_NOT_ALLOWED', `Unsupported method: ${method}`, 405)
  );
}
