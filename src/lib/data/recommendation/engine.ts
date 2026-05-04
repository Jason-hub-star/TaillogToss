/**
 * Curriculum recommendation engine.
 * Parity: UI-001 (v1) + UI-TRAINING-PERSONALIZATION-001 (v2)
 */
import type { BehaviorType } from 'types/dog';
import type { CurriculumId, PlanVariant } from 'types/training';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { BEHAVIOR_TO_CURRICULUM } from 'lib/data/mappings/behaviorToCurriculum';
import { REASON_TEMPLATES } from './reasonTemplates';

export interface CurriculumRecommendation {
  primary: CurriculumId;
  secondary: CurriculumId | null;
  reasoning: string;
}

/** 행동 분석 데이터 (로그 기반 추천 엔진용) */
export interface BehaviorAnalytics {
  avg_intensity_by_behavior: Partial<Record<string, number>>;
  total_logs: number;
  top_behaviors?: string[];
  weekly_trend?: Partial<Record<string, string>>;
  memo_keywords?: Partial<Record<string, string[]>>;
}

/** 커리큘럼 추천 점수 분해 */
export interface ScoreBand {
  behaviorScore: number;        // 0~40: 설문 행동 일치 점수
  logIntensityScore: number;    // 0~35: 로그 강도 기반 점수
  progressBonus: number;        // 0~15: 진행도 보너스
  total: number;
}

/** 커리큘럼 추천 v2 (로그 기반 + 콜드스타트 플래그) */
export interface CurriculumRecommendationV2 extends CurriculumRecommendation {
  scoreBand?: ScoreBand;
  logBased: boolean;
  coldStart: boolean;
  contextTags?: string[];  // 메모 키워드 기반 상황 태그 (UI 배지용)
}

// ──────────────────────────────────────
// Plan A/B/C 초기 추천
// ──────────────────────────────────────

/** Plan 추천에 사용되는 강아지 프로필 신호 */
export interface DogPlanSignals {
  birthDate?: string | null;
  weightKg?: number;
  hasPain?: boolean;
  energyScore?: number;       // 1–5, DogEnv.activity_meta.energy_score
  playReward?: number;        // 1–5, DogEnv.activity_meta.rewards_meta.play
  noiseSensitivity?: number;  // 1–5, DogEnv.household_info.noise_sensitivity
  behaviors?: BehaviorType[];
  envReaction?: string;       // explore|adapt|anxious|indifferent
  personReaction?: string;    // rush|observe|hide|indifferent
  dogReaction?: string;       // approach|sniff|bark|indifferent
  focusLevel?: string;        // treat_only|good|distracted|uninterested
  attachLevel?: string;       // velcro|moderate|independent
}

/**
 * 강아지 프로필 신호 기반 초기 Plan 추천.
 * - C (Adaptive):   나이 7살+ / 체중 25kg+ / 통증 있음
 * - B (PlayBased):  불안·반응성 행동 / 에너지 낮음 / 놀이 선호 높음 / 소음 예민
 * - A (Focus):      위 조건 미해당 (기본)
 */
export function recommendPlan(signals: DogPlanSignals): PlanVariant {
  const {
    birthDate, weightKg, hasPain, energyScore, playReward, noiseSensitivity, behaviors,
    envReaction, personReaction, dogReaction, focusLevel, attachLevel,
  } = signals;

  // C (Adaptive): 노령·대형·통증
  if (hasPain) return 'C';
  if (weightKg !== undefined && weightKg >= 25) return 'C';
  if (birthDate) {
    const ageMonths = (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (ageMonths >= 84) return 'C'; // 7살+
  }

  // B (PlayBased): 불안/반응성, 낮은 에너지, 놀이 선호, 소음 예민, 기질 기반 신호
  const hasAnxietyBehavior = behaviors?.some((b) => b === 'anxiety' || b === 'reactivity') ?? false;
  const hasAnxietyTemperament =
    envReaction === 'anxious' ||        // 환경 불안
    personReaction === 'hide' ||        // 사회적 회피
    dogReaction === 'bark' ||           // 반응성 공격
    attachLevel === 'velcro' ||         // 분리불안 신호
    focusLevel === 'uninterested';      // 동기 저하

  if (
    hasAnxietyBehavior ||
    hasAnxietyTemperament ||
    (energyScore ?? 3) <= 2 ||
    (playReward ?? 3) >= 4 ||
    (noiseSensitivity ?? 3) >= 4
  ) return 'B';

  return 'A';
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

function _enrichReasoning(
  base: string,
  memoKeywords: string[] | undefined,
  intensity: number | undefined,
): string {
  if (!memoKeywords || memoKeywords.length === 0) return base;
  const top = memoKeywords.slice(0, 2).join(', ');
  if (intensity !== undefined && intensity >= 7) {
    return `${base} · '${top}' 상황에서 특히 강해요`;
  }
  return `${base} · '${top}' 상황 집중`;
}

/** 동기 함수 — API 결과를 파라미터로 받음 (로그 5개 이상일 때 호출) */
export function getRecommendationsV2(
  behaviors: BehaviorType[],
  completedCurriculumIds: CurriculumId[],
  logAnalytics: BehaviorAnalytics,
): CurriculumRecommendationV2 {
  const completedSet = new Set(completedCurriculumIds);

  // 1. 행동 매핑 후보 (설문 기반)
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
      logBased: true,
      coldStart: false,
    };
  }

  // 2. ScoreBand 계산
  const scoreBands: Array<{ id: CurriculumId; band: ScoreBand }> = [];

  for (const currId of candidates) {
    // behaviorScore: 설문 행동과 커리큘럼 매핑 일치 정도
    const matchedBehaviors = behaviors.filter(
      (b) => BEHAVIOR_TO_CURRICULUM[b] === currId,
    );
    const behaviorScore = Math.min(40, matchedBehaviors.length * 20);

    // logIntensityScore: 로그 평균 강도가 높을수록 우선순위 높음
    const curriculum = CURRICULUMS.find((c) => c.id === currId);
    const relatedBehaviors = curriculum?.recommended_for ?? [];

    let intensitySum = 0;
    let intensityCount = 0;
    for (const behavior of relatedBehaviors) {
      const avg = logAnalytics.avg_intensity_by_behavior[behavior];
      if (avg !== undefined) {
        intensitySum += avg;
        intensityCount++;
      }
    }
    const avgIntensity = intensityCount > 0 ? intensitySum / intensityCount : 5;
    // 강도 7 이상 = 높은 점수, 4 이하 = 낮은 점수
    const logIntensityScore = Math.round(Math.min(35, (avgIntensity / 10) * 35));

    // progressBonus: 이미 시작한 커리큘럼 우선 (진행 데이터 없음 — 기본 0)
    const progressBonus = 0;

    const total = behaviorScore + logIntensityScore + progressBonus;

    scoreBands.push({
      id: currId,
      band: { behaviorScore, logIntensityScore, progressBonus, total },
    });
  }

  // 총점 내림차순 정렬
  scoreBands.sort((a, b) => b.band.total - a.band.total);

  const primary = scoreBands[0]!.id;
  // secondary: 점수 2위 또는, 단일 후보인 경우 미완료 커리큘럼 중 첫 번째
  const secondary = scoreBands.length > 1
    ? scoreBands[1]!.id
    : (CURRICULUMS.find((c) => c.id !== primary && !completedSet.has(c.id))?.id ?? null);
  const topBand = scoreBands[0]!.band;

  // reasoning: logIntensity 조건부 문구
  const primaryBehavior = behaviors.find((b) => BEHAVIOR_TO_CURRICULUM[b] === primary);
  const baseReasoning = primaryBehavior ? REASON_TEMPLATES[primaryBehavior] : '우리 아이 맞춤 훈련 추천';

  const topBehaviorIntensity = primaryBehavior
    ? logAnalytics.avg_intensity_by_behavior[primaryBehavior]
    : undefined;

  let reasoning = baseReasoning;
  if (topBehaviorIntensity !== undefined) {
    if (topBehaviorIntensity >= 7) {
      reasoning = `${baseReasoning} · 최근 기록에서 강도가 높아 우선 추천해요`;
    } else if (topBehaviorIntensity <= 3) {
      reasoning = `${baseReasoning} · 최근 많이 개선되고 있어요`;
    }
  }

  // 메모 키워드로 reasoning 보강 + contextTags 생성
  const memoKeywords = primaryBehavior
    ? logAnalytics.memo_keywords?.[primaryBehavior]
    : undefined;
  reasoning = _enrichReasoning(reasoning, memoKeywords, topBehaviorIntensity);
  const contextTags = memoKeywords?.slice(0, 3);

  return {
    primary,
    secondary,
    reasoning,
    scoreBand: topBand,
    logBased: true,
    coldStart: false,
    contextTags: contextTags && contextTags.length > 0 ? contextTags : undefined,
  };
}
