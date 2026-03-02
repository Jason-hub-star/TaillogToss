/**
 * SurveyContainer — 설문 7단계 상태 관리 컨테이너
 * DogCoach SurveyContainer 패턴 포팅. 단계별 유효성 검사 + 진행 상태 관리
 * Parity: AUTH-001
 */
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import type { SurveyData, SurveyStep1, SurveyStep2, SurveyStep3, SurveyStep4, SurveyStep5, SurveyStep6, SurveyStep7 } from 'types/dog';
import { Step1Profile } from './Step1Profile';
import { Step2Problem } from './Step2Problem';
import { Step3Goal } from './Step3Goal';

const TOTAL_STEPS = 3;

const STEP_TITLES = [
  '반려견 프로필',
  '행동 고민 & 상황',
  '목표 & 코칭 선호',
];

const INITIAL_DATA: SurveyData = {
  step1_basic: { name: '', breed: '', age_months: 0, sex: 'MALE' },
  step2_environment: {
    household: { members_count: 1, has_children: false, has_other_pets: false, living_type: 'apartment' },
    daily_alone_hours: 0,
  },
  step3_behavior: { primary_behaviors: [], severity: {} as any },
  step4_triggers: { triggers: [], worst_time: 'random' },
  step5_history: { past_attempts: [], professional_help: false },
  step6_goals: { goals: [], priority_behavior: 'anxiety' as any },
  step7_preferences: { ai_tone: 'empathetic', ai_perspective: 'coach', notification_consent: true },
};

export function SurveyContainer({ onComplete, onBack }: SurveyContainerProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SurveyData>(INITIAL_DATA);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      onComplete(data);
    }
  }, [step, data, onComplete]);

  const handlePrev = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      onBack?.();
    }
  }, [step, onBack]);

  const isStepValid = useCallback((): boolean => {
    switch (step) {
      case 1: return !!(data.step1_basic.name && data.step1_basic.breed && data.step1_basic.age_months > 0);
      case 2: return data.step3_behavior.primary_behaviors.length > 0;
      case 3: return !!data.step6_goals.priority_behavior;
      default: return false;
    }
  }, [step, data]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1Profile
            step1={data.step1_basic}
            step2={data.step2_environment}
            onChange={(s1, s2) => setData(prev => ({ ...prev, step1_basic: s1, step2_environment: s2 }))}
          />
        );
      case 2:
        return (
          <Step2Problem
            step3={data.step3_behavior}
            step4={data.step4_triggers}
            onChange={(s3, s4) => setData(prev => ({ ...prev, step3_behavior: s3, step4_triggers: s4 }))}
          />
        );
      case 3:
        return (
          <Step3Goal
            step5={data.step5_history}
            step6={data.step6_goals}
            step7={data.step7_preferences}
            availableBehaviors={data.step3_behavior.primary_behaviors}
            onChange={(s5, s6, s7) => setData(prev => ({ ...prev, step5_history: s5, step6_goals: s6, step7_preferences: s7 }))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormLayout
      title={STEP_TITLES[step - 1] ?? ''}
      step={{ current: step, total: TOTAL_STEPS }}
      onBack={handlePrev}
      bottomCTA={{
        label: step < TOTAL_STEPS ? '다음' : '완료',
        onPress: handleNext,
        disabled: !isStepValid(),
      }}
    >
      <View>{renderStep()}</View>
    </FormLayout>
  );
}
