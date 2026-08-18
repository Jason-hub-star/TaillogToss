import type { AuthEntryFlow } from 'lib/api/auth';
import type { User } from 'types/auth';

const B2B_ROLES: User['role'][] = ['trainer', 'org_owner', 'org_staff'];

export function isB2BAuthRole(role: unknown): role is User['role'] {
  return typeof role === 'string' && B2B_ROLES.includes(role as User['role']);
}

export function resolveEffectiveSessionRole(input: {
  sessionRole?: unknown;
  preferredFlow?: AuthEntryFlow | null;
  publicRole?: User['role'] | null;
}): User['role'] {
  if (input.preferredFlow === 'B2C') return 'user';
  if (isB2BAuthRole(input.publicRole)) return input.publicRole;
  if (input.sessionRole === 'user') return 'user';
  return 'user';
}
