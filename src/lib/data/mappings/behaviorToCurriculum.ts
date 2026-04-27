/**
 * BehaviorType -> CurriculumId canonical mapping
 * Single source for recommendation and fallback curriculum routing.
 */
import type { BehaviorType } from 'types/dog';
import type { CurriculumId } from 'types/training';

export const BEHAVIOR_TO_CURRICULUM: Readonly<Record<BehaviorType, CurriculumId>> = {
  separation: 'separation_anxiety',
  anxiety: 'fear_desensitization',
  barking: 'reactivity_management',
  destructive: 'impulse_control',
  reactivity: 'reactivity_management',
  aggression: 'socialization',
  resource_guarding: 'impulse_control',
  leash_pulling: 'leash_manners',
  jumping: 'basic_obedience',
  other: 'basic_obedience',
};

export function mapBehaviorToCurriculum(behavior: BehaviorType): CurriculumId {
  return BEHAVIOR_TO_CURRICULUM[behavior];
}

// quick_category 값(DB) → BehaviorType 정규화
// 'pulling' → 'leash_pulling', 'biting' → 'aggression' 등 불일치 해소
const QUICK_CATEGORY_TO_BEHAVIOR_TYPE: Partial<Record<string, BehaviorType>> = {
  barking: 'barking',
  anxiety: 'anxiety',
  jumping: 'jumping',
  aggression: 'aggression',
  pulling: 'leash_pulling',
  destructive: 'destructive',
  biting: 'aggression',
  separation: 'separation',
  reactivity: 'reactivity',
  resource_guarding: 'resource_guarding',
  other: 'other',
};

export function normalizeTopBehaviors(topBehaviors: string[]): BehaviorType[] {
  return topBehaviors
    .map((b) => QUICK_CATEGORY_TO_BEHAVIOR_TYPE[b])
    .filter((b): b is BehaviorType => b !== undefined);
}
