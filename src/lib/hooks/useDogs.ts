/**
 * useDogs 훅 — 반려견 CRUD + 멀티독 전환
 * Parity: APP-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { queryPolicy } from 'lib/api/queryConfig';
import * as dogApi from 'lib/api/dog';
import type { Dog, SurveyData } from 'types/dog';

export function useDogList(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dogs.list(userId ?? ''),
    queryFn: () => dogApi.getDogs(userId!),
    enabled: !!userId,
    ...queryPolicy.default,
  });
}

export function useDogDetail(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dogs.detail(dogId ?? ''),
    queryFn: () => dogApi.getDog(dogId!),
    enabled: !!dogId,
    ...queryPolicy.default,
  });
}

export function useCreateDogFromSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, survey }: { userId: string; survey: SurveyData }) =>
      dogApi.createDogFromSurvey(userId, survey),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.dogs.list(variables.userId) });
    },
  });
}

export function useDogEnv(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dogs.env(dogId ?? ''),
    queryFn: () => dogApi.getDogEnv(dogId!),
    enabled: !!dogId,
    ...queryPolicy.default,
  });
}

export function useUpdateDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dogId, updates }: { dogId: string; updates: Partial<Dog> }) =>
      dogApi.updateDog(dogId, updates),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.dogs.detail(data.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.dogs.all });
    },
  });
}

export function useDeleteDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dogApi.deleteDog,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dogs.all });
    },
  });
}
