/**
 * Survey result analysis text engine.
 * Parity: AUTH-001
 */
import type { SurveyData, BehaviorType } from 'types/dog';
import type { CurriculumId } from 'types/training';
import { classifyBehaviorType } from 'components/features/survey/BehaviorTypeBadge';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { ANALYSIS_BY_TYPE, FALLBACK_ANALYSIS } from './analysisCopy';
import { TRIGGER_LABELS } from './triggerLabels';

export interface SurveyAnalysisResult {
  summaryParagraph: string;
  recommendedCurriculum: string;
  recommendedCurriculumId: CurriculumId;
  estimatedDuration: string;
  keyInsights: string[];
}

function estimateDuration(curriculumId: CurriculumId): string {
  const curriculum = CURRICULUMS.find((c) => c.id === curriculumId);
  if (!curriculum) return '4~6주';
  const days = curriculum.total_days;
  const weeks = Math.ceil(days / 5);
  return `${weeks}~${weeks + 2}주`;
}

export function generateSurveyAnalysis(surveyData: SurveyData): SurveyAnalysisResult {
  const behaviors: BehaviorType[] = surveyData.step3_behavior.primary_behaviors;
  const triggers = surveyData.step4_triggers?.triggers ?? [];
  const dogName = surveyData.step1_basic.name;

  const classifiedType = classifyBehaviorType(behaviors);
  const copy = ANALYSIS_BY_TYPE[classifiedType] ?? FALLBACK_ANALYSIS;

  const curriculum = CURRICULUMS.find((c) => c.id === copy.curriculumId);
  const curriculumTitle = curriculum?.title ?? '맞춤 훈련 프로그램';

  const triggerLabels = triggers
    .map((t) => TRIGGER_LABELS[t])
    .filter(Boolean)
    .slice(0, 3);

  const triggerContext = triggerLabels.length > 0
    ? ` 특히 ${triggerLabels.join(', ')} 상황에서 주의가 필요합니다.`
    : '';

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
