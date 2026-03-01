/**
 * Curriculum recommendation engine.
 * Parity: UI-001
 */
import type { BehaviorType } from 'types/dog';
import type { CurriculumId } from 'types/training';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { BEHAVIOR_TO_CURRICULUM } from 'lib/data/mappings/behaviorToCurriculum';
import { REASON_TEMPLATES } from './reasonTemplates';

export interface CurriculumRecommendation {
  primary: CurriculumId;
  secondary: CurriculumId | null;
  reasoning: string;
}

export function getRecommendations(
  behaviors: BehaviorType[],
  completedCurriculumIds: CurriculumId[] = [],
): CurriculumRecommendation {
  const completedSet = new Set(completedCurriculumIds);

  const candidates: CurriculumId[] = [];
  for (const behavior of behaviors) {
    const currId = BEHAVIOR_TO_CURRICULUM[behavior];
    if (!completedSet.has(currId) && !candidates.includes(currId)) {
      candidates.push(currId);
    }
  }

  if (candidates.length === 0) {
    const fallback = CURRICULUMS.find(
      (c) => c.access === 'free' && !completedSet.has(c.id),
    );
    return {
      primary: fallback?.id ?? 'basic_obedience',
      secondary: null,
      reasoning: '다음 단계로 추천하는 훈련이에요',
    };
  }

  const primary = candidates[0] as CurriculumId;
  const secondary = (candidates.length > 1 ? candidates[1] : null) as CurriculumId | null;
  const primaryBehavior = behaviors.find((b) => BEHAVIOR_TO_CURRICULUM[b] === primary);
  const reasoning = primaryBehavior ? REASON_TEMPLATES[primaryBehavior] : '우리 아이 맞춤 훈련 추천';

  return { primary, secondary, reasoning };
}
