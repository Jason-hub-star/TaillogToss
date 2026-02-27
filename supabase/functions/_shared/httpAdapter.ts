/**
 * httpAdapter — Edge 핸들러를 Deno HTTP 요청/응답으로 어댑팅한다.
 * Parity: AUTH-001, IAP-001, MSG-001
 */

import { fail, type EdgeContext, type EdgeResult, type UserRole } from './contracts.ts';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const ALLOWED_ROLES: UserRole[] = ['user', 'trainer', 'org_owner', 'org_staff'];

function parseRole(value: string | null): UserRole | undefined {
  if (!value) return undefined;
  if (ALLOWED_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return undefined;
}

export function buildEdgeContext(request: Request): EdgeContext {
  return {
    clientKey: request.headers.get('x-client-key') ?? 'local-invoke',
    role: parseRole(request.headers.get('x-user-role')),
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
