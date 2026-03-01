/**
 * 커리큘럼 추천 엔진 — DogCoach ISSUE_TO_CURRICULUM 포팅
 * 설문 행동 데이터 기반 primary + secondary 추천 반환
 * Parity: UI-001
 */
import type { BehaviorType } from 'types/dog';
import type { CurriculumId } from 'types/training';
import { CURRICULUMS } from 'lib/data/curriculum';

// ──────────────────────────────────────
// BehaviorType → CurriculumId 매핑 (DogCoach 포팅)
// ──────────────────────────────────────

const BEHAVIOR_TO_CURRICULUM: Record<BehaviorType, CurriculumId> = {
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

// ──────────────────────────────────────
// 추천 이유 한국어 템플릿
// ──────────────────────────────────────

const REASON_TEMPLATES: Record<BehaviorType, string> = {
  separation: '분리불안 행동에 맞춤 추천',
  anxiety: '불안/공포 반응 개선에 맞춤 추천',
  barking: '짖음/반응성 개선에 맞춤 추천',
  destructive: '파괴 행동 교정에 맞춤 추천',
  reactivity: '흥분/반응성 조절에 맞춤 추천',
  aggression: '공격성 관리에 맞춤 추천',
  resource_guarding: '자원 보호 행동 교정에 맞춤 추천',
  leash_pulling: '산책 매너 개선에 맞춤 추천',
  jumping: '기본 예절 훈련에 맞춤 추천',
  other: '우리 아이 맞춤 훈련 추천',
};

// ──────────────────────────────────────
// 공개 API
// ──────────────────────────────────────

export interface CurriculumRecommendation {
  primary: CurriculumId;
  secondary: CurriculumId | null;
  reasoning: string;
}

/**
 * 설문 행동 + 완료 커리큘럼 기반 추천
 * - primary: 첫 번째 행동의 매핑 커리큘럼 (완료 시 다음 후보)
 * - secondary: 두 번째 행동 매핑 (있을 경우)
 * - reasoning: 한국어 추천 이유
 */
export function getRecommendations(
  behaviors: BehaviorType[],
  completedCurriculumIds: CurriculumId[] = [],
): CurriculumRecommendation {
  const completedSet = new Set(completedCurriculumIds);

  // 행동 → 추천 커리큘럼 목록 (중복 제거, 완료 제외)
  const candidates: CurriculumId[] = [];
  for (const behavior of behaviors) {
    const currId = BEHAVIOR_TO_CURRICULUM[behavior];
    if (!completedSet.has(currId) && !candidates.includes(currId)) {
      candidates.push(currId);
    }
  }

  // 모든 추천이 완료됐으면 아직 안 한 커리큘럼 중 첫 번째 무료 추천
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
  const primaryBehavior = behaviors.find(
    (b) => BEHAVIOR_TO_CURRICULUM[b] === primary,
  );
  const reasoning = primaryBehavior
    ? REASON_TEMPLATES[primaryBehavior]
    : '우리 아이 맞춤 훈련 추천';

  return { primary, secondary, reasoning };
}
