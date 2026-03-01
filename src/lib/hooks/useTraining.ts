/**
 * useTraining 훅 — 훈련 진행 상태 관리
 * Parity: UI-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import { STALE_TIME_ACTIVE } from 'lib/api/queryConfig';
import * as trainingApi from 'lib/api/training';
import type { CurriculumId, PlanVariant, TrainingProgress, DogReaction, StepFeedback } from 'types/training';

export function useTrainingProgress(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.training.progress(dogId ?? ''),
    queryFn: () => trainingApi.getTrainingProgress(dogId!),
    enabled: !!dogId,
    staleTime: STALE_TIME_ACTIVE,
  });
}

export function useStartTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dogId,
      curriculumId,
      variant,
    }: {
      dogId: string;
      curriculumId: CurriculumId;
      variant?: PlanVariant;
    }) => trainingApi.startTraining(dogId, curriculumId, variant),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.training.progress(variables.dogId) });
    },
  });
}

export function useCompleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      progressId,
      stepId,
      currentSteps,
      dogId,
    }: {
      progressId: string;
      stepId: string;
      currentSteps: string[];
      dogId: string;
    }) => trainingApi.completeStep(progressId, stepId, currentSteps, dogId),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: queryKeys.training.progress(variables.dogId) });
      const previous = qc.getQueryData<TrainingProgress[]>(
        queryKeys.training.progress(variables.dogId),
      );
      qc.setQueryData<TrainingProgress[]>(
        queryKeys.training.progress(variables.dogId),
        (old) =>
          old?.map((p) => {
            if (p.curriculum_id !== variables.stepId.replace(/_d\d+_s\d+$/, '')) return p;
            return { ...p, completed_steps: [...p.completed_steps, variables.stepId] };
          }),
      );
      return { previous };
    },
    onError: (_err, variables, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.training.progress(variables.dogId), ctx.previous);
      }
    },
    onSettled: (_d, _e, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.training.progress(variables.dogId) });
    },
  });
}

export function useUncompleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      dogId,
    }: {
      stepId: string;
      dogId: string;
    }) => trainingApi.uncompleteStep(stepId, dogId),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: queryKeys.training.progress(variables.dogId) });
      const previous = qc.getQueryData<TrainingProgress[]>(
        queryKeys.training.progress(variables.dogId),
      );
      qc.setQueryData<TrainingProgress[]>(
        queryKeys.training.progress(variables.dogId),
        (old) =>
          old?.map((p) => {
            const curriculumId = variables.stepId.replace(/_d\d+_s\d+$/, '');
            if (p.curriculum_id !== curriculumId) return p;
            return { ...p, completed_steps: p.completed_steps.filter((id) => id !== variables.stepId) };
          }),
      );
      return { previous };
    },
    onError: (_err, variables, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.training.progress(variables.dogId), ctx.previous);
      }
    },
    onSettled: (_d, _e, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.training.progress(variables.dogId) });
    },
  });
}

export function useStepFeedback(dogId: string | undefined, curriculumId?: string) {
  return useQuery({
    queryKey: queryKeys.training.feedback(dogId ?? '', curriculumId),
    queryFn: () => trainingApi.getStepFeedback(dogId!, curriculumId),
    enabled: !!dogId,
    staleTime: STALE_TIME_ACTIVE,
  });
}

export function useSubmitStepFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dogId,
      stepId,
      reaction,
      memo,
    }: {
      dogId: string;
      stepId: string;
      reaction: DogReaction;
      memo: string | null;
    }) => trainingApi.submitStepFeedback(dogId, stepId, reaction, memo),
    onMutate: async (variables) => {
      const curriculumId = variables.stepId.replace(/_d\d+_s\d+$/, '');
      await qc.cancelQueries({ queryKey: queryKeys.training.feedback(variables.dogId, curriculumId) });
      const previous = qc.getQueryData<StepFeedback[]>(
        queryKeys.training.feedback(variables.dogId, curriculumId),
      );
      qc.setQueryData<StepFeedback[]>(
        queryKeys.training.feedback(variables.dogId, curriculumId),
        (old) => [
          ...(old ?? []),
          {
            step_id: variables.stepId,
            curriculum_id: curriculumId as CurriculumId,
            day: 0,
            step_number: 0,
            reaction: variables.reaction,
            memo: variables.memo,
          },
        ],
      );
      return { previous, curriculumId };
    },
    onError: (_err, variables, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(
          queryKeys.training.feedback(variables.dogId, ctx.curriculumId),
          ctx.previous,
        );
      }
    },
    onSettled: (_d, _e, variables) => {
      const curriculumId = variables.stepId.replace(/_d\d+_s\d+$/, '');
      void qc.invalidateQueries({ queryKey: queryKeys.training.feedback(variables.dogId) });
      void qc.invalidateQueries({ queryKey: queryKeys.training.feedback(variables.dogId, curriculumId) });
    },
  });
}
