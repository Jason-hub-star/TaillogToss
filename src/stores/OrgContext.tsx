/**
 * OrgContext — B2B 조직 상태 관리. B2C에서는 null (무영향)
 * Parity: B2B-001
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Organization, OrgMember } from 'types/b2b';
import type { UserRole } from 'types/auth';

interface OrgContextValue {
  org: Organization | null;
  membership: OrgMember | null;
  setOrg: (org: Organization | null) => void;
  setMembership: (member: OrgMember | null) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrgState] = useState<Organization | null>(null);
  const [membership, setMembershipState] = useState<OrgMember | null>(null);

  const setOrg = useCallback((newOrg: Organization | null) => {
    setOrgState(newOrg);
  }, []);

  const setMembership = useCallback((member: OrgMember | null) => {
    setMembershipState(member);
  }, []);

  const value = useMemo(
    () => ({ org, membership, setOrg, setMembership }),
    [org, membership, setOrg, setMembership]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}

/** B2B 여부 확인 헬퍼 */
export function useIsB2B(): boolean {
  const { org } = useOrg();
  return org !== null;
}

/** B2B 역할 유틸 — 현재 유저가 B2B 역할인지 확인 */
const B2B_ROLES: UserRole[] = ['trainer', 'org_owner', 'org_staff'];

export function isB2BRole(role: UserRole | undefined): boolean {
  return role !== undefined && B2B_ROLES.includes(role);
}
