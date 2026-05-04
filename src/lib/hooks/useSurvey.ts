/**
 * Progressive Profiling 훅 — Stage 1/2/3 제출 + 완성도 조회
 * Parity: APP-001
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dogApi from 'lib/api/dog';
import { queryKeys } from 'lib/api/queryKeys';
import type {
  DogCreateResponse,
  SurveyStage1Request,
  SurveyStage2Request,
  SurveyStage3Request,
  SurveyStatus,
} from 'types/dog';

export function useSurveyStatus(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.survey.status(dogId ?? ''),
    queryFn: () => dogApi.getSurveyStatus(dogId!),
    enabled: !!dogId,
  });
}

export function useSubmitStage1(userId: string) {
  const qc = useQueryClient();
  return useMutation<DogCreateResponse, Error, SurveyStage1Request>({
    mutationFn: dogApi.submitSurveyStage1,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dogs.list(userId) });
    },
  });
}

export function useSubmitStage2() {
  const qc = useQueryClient();
  return useMutation<SurveyStatus, Error, { dogId: string; data: SurveyStage2Request }>({
    mutationFn: ({ dogId, data }) => dogApi.submitSurveyStage2(dogId, data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.survey.status(result.dog_id) });
    },
  });
}

export function useSubmitStage3() {
  const qc = useQueryClient();
  return useMutation<SurveyStatus, Error, { dogId: string; data: SurveyStage3Request }>({
    mutationFn: ({ dogId, data }) => dogApi.submitSurveyStage3(dogId, data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.survey.status(result.dog_id) });
    },
  });
}

export function usePatchSurveyStage() {
  const qc = useQueryClient();
  return useMutation<
    SurveyStatus,
    Error,
    { dogId: string; stage: 1 | 2 | 3; data: Record<string, unknown> }
  >({
    mutationFn: ({ dogId, stage, data }) => dogApi.patchSurveyStage(dogId, stage, data),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.survey.status(result.dog_id) });
    },
  });
}
