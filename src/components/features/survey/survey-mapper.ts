/**
 * Survey Mapper — 7단계 설문 데이터를 Supabase dog_env JSONB 스키마로 변환
 * Parity: UIUX-004
 */
import type { SurveyData, DogEnv, HouseholdInfo, HealthMeta, ActivityMeta } from 'types/dog';

/**
 * 설문 데이터를 DogEnv insert를 위한 부분 데이터로 변환
 */
export function mapSurveyToDogEnv(survey: SurveyData, dogId: string): Partial<DogEnv> {
  return {
    dog_id: dogId,
    household_info: survey.step2_environment.household,
    health_meta: {
      chronic_issues: survey.step3_behavior.primary_behaviors,
      medications: [], // 설문 단계에서 추가 가능성 대비
      vet_notes: null,
    } as HealthMeta,
    triggers: survey.step4_triggers.triggers,
    past_attempts: survey.step5_history.past_attempts,
    temperament: null, // 추후 AI 분석 결과로 채울 수 있음
    activity_meta: {
      daily_walk_minutes: 30, // 기본값, Step2에 추가 가능
      exercise_level: 'medium',
      favorite_activities: [],
    } as ActivityMeta,
  };
}

/**
 * 행동 유형별 위험도/점수 산출 (SurveyResult용 가상 매퍼)
 */
export function calculateSurveyResult(survey: SurveyData) {
  const behaviors = survey.step3_behavior.primary_behaviors;
  const severities = survey.step3_behavior.severity;
  
  // 가장 높은 severity를 가진 행동을 메인으로 선정
  let priorityBehavior = survey.step6_goals.priority_behavior;
  let maxScore = severities[priorityBehavior] || 0;

  behaviors.forEach(b => {
    if ((severities[b] || 0) > maxScore) {
      maxScore = severities[b];
      priorityBehavior = b;
    }
  });

  const riskLevel = maxScore >= 4 ? 'high' : maxScore >= 2 ? 'medium' : 'low';

  return {
    behavior_type_badge: priorityBehavior,
    risk_level: riskLevel,
    risk_score: maxScore * 20, // 1-5 단계를 0-100으로 치환
    summary: `${priorityBehavior} 행동 교정을 위한 맞춤 커리큘럼이 준비되었습니다.`,
  };
}
