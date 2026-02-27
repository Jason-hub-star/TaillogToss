/**
 * useOrg 훅 — B2B 조직/멤버/강아지/배정 TanStack Query 래퍼
 * Parity: B2B-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import * as orgApi from 'lib/api/org';
import type { OrgMember, DogAssignment } from 'types/b2b';
import { getActiveOrgDogCount, getActiveOrgMemberCount } from 'lib/api/org';

export function useOrgDetail(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.org.detail(orgId ?? ''),
    queryFn: () => orgApi.getOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.org.members(orgId ?? ''),
    queryFn: () => orgApi.getOrgMembers(orgId!),
    enabled: !!orgId,
  });
}

export function useOrgDogs(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orgDogs.list(orgId ?? ''),
    queryFn: () => orgApi.getOrgDogs(orgId!),
    enabled: !!orgId,
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
  });
}

export function useOrgAssignments(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assignments.byOrg(orgId ?? ''),
    queryFn: () => orgApi.getOrgAssignments(orgId!),
    enabled: !!orgId,
  });
}

/** 조직 오늘의 통계 */
export function useOrgTodayStats(orgId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.org.all, 'stats', orgId ?? ''] as const,
    queryFn: () => orgApi.getOrgTodayStats(orgId!),
    enabled: !!orgId,
  });
}
