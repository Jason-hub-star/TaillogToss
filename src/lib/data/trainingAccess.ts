import type { Curriculum } from 'types/training';

export const LOCKED_CURRICULUM_PREVIEW_STEP_COUNT = 2;

const FREE_CURRICULUM_IDS = new Set(['basic_obedience']);

export function isFreeCurriculumForUser(curriculum: Curriculum): boolean {
  return (
    FREE_CURRICULUM_IDS.has(curriculum.id) ||
    curriculum.access === 'free' ||
    curriculum.difficulty === 'beginner'
  );
}

export function isCurriculumLockedForUser(curriculum: Curriculum, isPro: boolean): boolean {
  return !isPro && !isFreeCurriculumForUser(curriculum);
}

export function shouldShowInterstitialForCurriculum(curriculum: Curriculum, isPro: boolean): boolean {
  return !isPro && !isFreeCurriculumForUser(curriculum);
}

export function getLockedCurriculumPreview(curriculum: Curriculum) {
  const firstDay = curriculum.days[0] ?? null;
  return {
    firstDay,
    previewSteps: firstDay?.steps.slice(0, LOCKED_CURRICULUM_PREVIEW_STEP_COUNT) ?? [],
  };
}
