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
