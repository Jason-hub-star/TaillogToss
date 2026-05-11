/**
 * useOrg 훅 — B2B 조직/멤버/강아지/배정 TanStack Query 래퍼
 * Parity: B2B-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryPolicy } from 'lib/api/queryConfig';
import { queryKeys } from 'lib/api/queryKeys';
import * as orgApi from 'lib/api/org';
import type { OrgMember, DogAssignment, OrgType } from 'types/b2b';
import { getActiveOrgDogCount, getActiveOrgMemberCount } from 'lib/api/org';
import { useOrg } from 'stores/OrgContext';

/** 조직 생성 — create_organization RPC 호출 후 캐시 무효화 */
export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type?: OrgType }) =>
      orgApi.createOrganization(name, type ?? 'daycare'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.org.all });
    },
  });
}

export function useOrgDetail(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.org.detail(orgId ?? ''),
    queryFn: () => orgApi.getOrg(orgId!),
    enabled: !!orgId,
    ...queryPolicy.default,
  });
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.org.members(orgId ?? ''),
    queryFn: () => orgApi.getOrgMembers(orgId!),
    enabled: !!orgId,
    ...queryPolicy.default,
  });
}

export function useOrgDogs(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orgDogs.list(orgId ?? ''),
    queryFn: () => orgApi.getOrgDogs(orgId!),
    enabled: !!orgId,
    ...queryPolicy.short,
  });
}

export function useEnrollDog(maxDogs: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof orgApi.enrollDog>[0]) => {
      const currentCount = await getActiveOrgDogCount(input.org_id);
      if (currentCount >= maxDogs) {
        throw new Error(`강아지 등록 한도 초과 (최대 ${maxDogs}마리)`);
      }
      return orgApi.enrollDog(input);
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orgDogs.list(variables.org_id) });
    },
  });
}

export function useDischargeDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgApi.dischargeDog,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orgDogs.all });
    },
  });
}

export function useInviteMember(maxStaff: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { org_id: string; user_id: string; role: OrgMember['role'] }) => {
      const currentCount = await getActiveOrgMemberCount(input.org_id);
      if (currentCount >= maxStaff) {
        throw new Error(`직원 초대 한도 초과 (최대 ${maxStaff}명)`);
      }
      return orgApi.inviteMember(input);
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.org.members(variables.org_id) });
    },
  });
}

export function useAssignDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      dog_id: string;
      org_id?: string;
      trainer_user_id: string;
      role: DogAssignment['role'];
    }) => orgApi.assignDog(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
}

export function useMyAssignments(trainerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assignments.byTrainer(trainerId ?? ''),
    queryFn: () => orgApi.getMyAssignments(trainerId!),
    enabled: !!trainerId,
    ...queryPolicy.default,
  });
}

export function useOrgAssignments(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assignments.byOrg(orgId ?? ''),
    queryFn: () => orgApi.getOrgAssignments(orgId!),
    enabled: !!orgId,
    ...queryPolicy.default,
  });
}

/** 센터 강아지 등록 (dogs + org_dogs 원자적 생성) */
export function useCreateOrgDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof orgApi.createOrgDog>[0]) =>
      orgApi.createOrgDog(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orgDogs.list(variables.org_id) });
    },
  });
}

/** 조직 기본 정보 수정 */
export function useUpdateOrg() {
  const qc = useQueryClient();
  const { org, setOrg } = useOrg();
  return useMutation({
    mutationFn: (updates: Parameters<typeof orgApi.updateOrg>[1]) =>
      orgApi.updateOrg(org!.id, updates),
    onSuccess: (updatedOrg) => {
      setOrg(updatedOrg);
      void qc.invalidateQueries({ queryKey: queryKeys.org.detail(org!.id) });
    },
  });
}

/** 조직 오늘의 통계 */
export function useOrgTodayStats(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.org.stats(orgId ?? ''),
    queryFn: () => orgApi.getOrgTodayStats(orgId!),
    enabled: !!orgId,
    ...queryPolicy.short,
  });
}
