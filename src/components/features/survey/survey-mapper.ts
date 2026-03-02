/**
 * Survey Mapper — 7단계 설문 데이터를 Supabase dog_env JSONB 스키마로 변환
 * Parity: UIUX-004
 */
import type { SurveyData, DogEnv, HouseholdInfo, HealthMeta, ActivityMeta } from 'types/dog';

/**
 * 설문 데이터를 DogEnv insert를 위한 부분 데이터로 변환
 */
export function mapSurveyToDogEnv(survey: SurveyData, dogId: string): Partial<DogEnv> {
  // 상황(triggers) 합치기: 선택한 칩 + 직접 입력 상황
  const combinedTriggers = [...survey.step4_triggers.triggers];
  if (survey.step4_triggers.custom_trigger?.trim()) {
    combinedTriggers.push(survey.step4_triggers.custom_trigger.trim());
  }

  return {
    dog_id: dogId,
    household_info: {
      ...survey.step2_environment.household,
      // 환경 스트레스 데이터 통합 (JSONB)
      ...survey.step8_health_context.environment_stress,
    },
    health_meta: {
      chronic_issues: survey.step3_behavior.primary_behaviors,
      medications: [],
      vet_notes: survey.step8_health_context.health.notes || null,
      // 상세 건강 데이터 (JSONB)
      physical_stats: {
        has_pain: survey.step8_health_context.health.has_pain,
        has_allergy: survey.step8_health_context.health.has_allergy,
        is_overweight: survey.step8_health_context.health.is_overweight,
      }
    } as any,
    triggers: combinedTriggers,
    past_attempts: survey.step5_history.past_attempts,
    temperament: survey.step3_behavior.other_behavior_desc || null, // 주관식 고민 텍스트 저장
    activity_meta: {
      daily_walk_minutes: 30,
      exercise_level: survey.step7_preferences.energy_score > 3 ? 'high' : 'medium',
      favorite_activities: [],
      // AI 심화 데이터 (JSONB)
      energy_score: survey.step7_preferences.energy_score,
      social_score: survey.step7_preferences.social_score,
      mastered_commands: survey.step7_preferences.mastered_commands,
      // 보상 선호도 데이터 (JSONB)
      rewards_meta: survey.step7_preferences.rewards,
    } as any,
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
