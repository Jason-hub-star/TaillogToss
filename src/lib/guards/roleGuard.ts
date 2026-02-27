/**
 * roleGuard — B2B 역할 기반 접근 제어
 * Parity: B2B-001
 */
import type { UserRole } from 'types/auth';
import type { GuardResult } from './authGuard';

interface RoleGuardInput {
  userRole: UserRole | undefined;
  requiredRoles: UserRole[];
}

export function roleGuard({ userRole, requiredRoles }: RoleGuardInput): GuardResult {
  if (!userRole || !requiredRoles.includes(userRole)) {
    return { allow: false, redirectTo: '/dashboard' };
  }
  return { allow: true };
}
