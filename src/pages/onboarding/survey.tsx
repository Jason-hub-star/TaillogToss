/**
 * 온보딩 설문 화면 — SurveyContainer(7단계) 래핑
 * 설문 완료 → survey-result로 이동
 * Parity: AUTH-001
 */
import { createRoute } from '@granite-js/react-native';
import React, { useCallback } from 'react';
import { SurveyContainer } from 'components/features/survey/SurveyContainer';
import type { SurveyData } from 'types/dog';

export const Route = createRoute('/onboarding/survey', {
  component: SurveyPage,
});

function SurveyPage() {
  const handleComplete = useCallback((data: SurveyData) => {
    // TODO: 설문 데이터 저장 (API) + survey-result로 이동
    // navigation.push('/onboarding/survey-result', { surveyData: data })
    void data;
  }, []);

  const handleBack = useCallback(() => {
    // TODO: navigation.back() — welcome으로 돌아감
  }, []);

  return <SurveyContainer onComplete={handleComplete} onBack={handleBack} />;
}
