/**
 * 설문 결과 분석 텍스트 생성 — DogCoach result-copy.ts 포팅
 * classifyBehaviorType() 결과 → 행동별 headline/subline/nextAction + 추천 커리큘럼
 * Parity: AUTH-001
 */
import type { SurveyData, BehaviorType } from 'types/dog';
import type { CurriculumId } from 'types/training';
import { classifyBehaviorType } from 'components/features/survey/BehaviorTypeBadge';
import { CURRICULUMS } from 'lib/data/curriculum';

// ──────────────────────────────────────
// DogCoach ResultCopy 포팅 (7종 + 폴백)
// ──────────────────────────────────────

interface AnalysisCopy {
  headline: string;
  subline: string;
  nextAction: string;
  curriculumId: CurriculumId;
}

/**
 * classifyBehaviorType 결과(string) → 분석 텍스트 + 추천 커리큘럼
 * DogCoach의 ResultCopy 7종을 TaillogToss CurriculumId 기준으로 재매핑
 */
const ANALYSIS_BY_TYPE: Record<string, AnalysisCopy> = {
  separation: {
    headline: '혼자 있는 상황에서 불안 신호가 보여요.',
    subline: '분리 상황에서 긴장이 올라가며 짖음/초조 행동이 반복될 수 있습니다.',
    nextAction: '아주 짧은 분리 연습(10~30초)부터 차근히 시작해보세요.',
    curriculumId: 'separation_anxiety',
  },
  anxiety: {
    headline: '소리 자극에 예민하게 반응하는 상태예요.',
    subline: '초인종, 복도 소리, 방문자 자극에서 경계 반응이 빠르게 올라옵니다.',
    nextAction: '소리 자극 전환 루틴(자리 이동 + 보상)을 먼저 고정해보세요.',
    curriculumId: 'fear_desensitization',
  },
  dominance: {
    headline: '자원 보호 행동이 나타나는 상태예요.',
    subline: '리드 당김과 자극 추적 반응이 누적되며 보호자 통제가 어려워질 수 있습니다.',
    nextAction: '짧은 거리에서 보행 템포 맞추기부터 반복해보세요.',
    curriculumId: 'socialization',
  },
  energy: {
    headline: '물건 물기·파괴 행동 관리가 필요한 상태예요.',
    subline: '에너지 잔여, 탐색 욕구, 환경 자극이 겹칠 때 문제가 커질 수 있습니다.',
    nextAction: '대체 행동(노즈워크/장난감) 루틴을 먼저 배치해보세요.',
    curriculumId: 'impulse_control',
  },
  complex: {
    headline: '여러 요인이 함께 작동하는 복합 이슈 상태예요.',
    subline: '단일 원인보다 환경·상황·반응이 겹쳐 나타나는 패턴이 보입니다.',
    nextAction: '우선순위 1개 행동부터 정해 1주 단위로 확인해보세요.',
    curriculumId: 'reactivity_management',
  },
  other: {
    headline: '행동 패턴을 더 관찰해 맞춤 코스를 추천했어요.',
    subline: '기록이 쌓일수록 우리 아이에게 맞는 원인 분석 정확도가 올라갑니다.',
    nextAction: '오늘부터 같은 상황의 기록을 3회 이상 남겨보세요.',
    curriculumId: 'basic_obedience',
  },
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- 'other' key always exists above
const FALLBACK: AnalysisCopy = ANALYSIS_BY_TYPE.other!;

// ──────────────────────────────────────
// 트리거 키워드 → 한국어 표현
// ──────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  doorbell: '초인종',
  strangers: '낯선 사람',
  other_dogs: '다른 강아지',
  loud_noise: '큰 소리',
  alone: '혼자 있을 때',
  car_ride: '차량 탑승',
  vet_visit: '병원 방문',
  meal_time: '식사 시간',
  walk: '산책',
  grooming: '미용/목욕',
};

// ──────────────────────────────────────
// 예상 개선 기간 (난이도 기반)
// ──────────────────────────────────────

function estimateDuration(curriculumId: CurriculumId): string {
  const curriculum = CURRICULUMS.find((c) => c.id === curriculumId);
  if (!curriculum) return '4~6주';
  const days = curriculum.total_days;
  const weeks = Math.ceil(days / 5);
  return `${weeks}~${weeks + 2}주`;
}

// ──────────────────────────────────────
// 공개 API
// ──────────────────────────────────────

export interface SurveyAnalysisResult {
  /** 상세 리포트 본문 (headline + subline 결합) */
  summaryParagraph: string;
  /** 추천 커리큘럼 이름 */
  recommendedCurriculum: string;
  /** 추천 커리큘럼 ID */
  recommendedCurriculumId: CurriculumId;
  /** 예상 개선 기간 */
  estimatedDuration: string;
  /** 핵심 인사이트 (nextAction + 트리거 기반) */
  keyInsights: string[];
}

/**
 * 설문 데이터 기반 분석 텍스트 생성
 * - classifyBehaviorType()로 유형 분류 → DogCoach 분석 텍스트 매핑
 * - 트리거 키워드를 subline에 반영
 * - 추천 커리큘럼 이름을 동적으로 삽입
 */
export function generateSurveyAnalysis(surveyData: SurveyData): SurveyAnalysisResult {
  const behaviors: BehaviorType[] = surveyData.step3_behavior.primary_behaviors;
  const triggers = surveyData.step4_triggers?.triggers ?? [];
  const dogName = surveyData.step1_basic.name;

  // 1. 행동 유형 분류 → 분석 텍스트
  const classifiedType = classifyBehaviorType(behaviors);
  const copy = ANALYSIS_BY_TYPE[classifiedType] ?? FALLBACK;

  // 2. 커리큘럼 이름 찾기
  const curriculum = CURRICULUMS.find((c) => c.id === copy.curriculumId);
  const curriculumTitle = curriculum?.title ?? '맞춤 훈련 프로그램';

  // 3. 트리거 한국어 표현
  const triggerLabels = triggers
    .map((t) => TRIGGER_LABELS[t])
    .filter(Boolean)
    .slice(0, 3);

  // 4. subline에 트리거 컨텍스트 삽입
  const triggerContext = triggerLabels.length > 0
    ? ` 특히 ${triggerLabels.join(', ')} 상황에서 주의가 필요합니다.`
    : '';

  // 5. 결과 조합
  const summaryParagraph =
    `${dogName}의 행동 패턴을 분석한 결과, ${copy.headline.replace(/\.$/, '')} ` +
    `${copy.subline}${triggerContext}`;

  const keyInsights: string[] = [copy.nextAction];
  if (triggerLabels.length > 0) {
    keyInsights.push(`${triggerLabels.join(', ')} 상황에서의 반응을 꾸준히 기록해보세요.`);
  }
  keyInsights.push('기록이 쌓이면 더 정확한 맞춤 분석이 가능해요.');

  return {
    summaryParagraph,
    recommendedCurriculum: curriculumTitle,
    recommendedCurriculumId: copy.curriculumId,
    estimatedDuration: estimateDuration(copy.curriculumId),
    keyInsights,
  };
}
