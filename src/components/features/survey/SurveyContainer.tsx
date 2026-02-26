/**
 * SurveyContainer — 설문 7단계 상태 관리 컨테이너
 * DogCoach SurveyContainer 패턴 포팅. 단계별 유효성 검사 + 진행 상태 관리
 * Parity: AUTH-001
 */
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import type { SurveyData, SurveyStep1, SurveyStep2, SurveyStep3, SurveyStep4, SurveyStep5, SurveyStep6, SurveyStep7 } from 'types/dog';
import { Step1Basic } from './Step1Basic';
import { Step2Environment } from './Step2Environment';
import { Step3Behavior } from './Step3Behavior';
import { Step4Triggers } from './Step4Triggers';
import { Step5History } from './Step5History';
import { Step6Goals } from './Step6Goals';
import { Step7Preferences } from './Step7Preferences';

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  '기본 정보',
  '생활 환경',
  '행동 문제',
  '트리거/상황',
  '과거 시도',
  '목표 설정',
  'AI 코칭 선호',
];

export interface SurveyContainerProps {
  onComplete: (data: SurveyData) => void;
  onBack?: () => void;
}

export function SurveyContainer({ onComplete, onBack }: SurveyContainerProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<SurveyData>>({});

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      onComplete(data as SurveyData);
    }
  }, [step, data, onComplete]);

  const handlePrev = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      onBack?.();
    }
  }, [step, onBack]);

  const updateStep = useCallback(<K extends keyof SurveyData>(key: K, value: SurveyData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isStepValid = useCallback((): boolean => {
    switch (step) {
      case 1: return !!(data.step1_basic?.name && data.step1_basic?.breed);
      case 2: return !!data.step2_environment;
      case 3: return (data.step3_behavior?.primary_behaviors?.length ?? 0) > 0;
      case 4: return (data.step4_triggers?.triggers?.length ?? 0) > 0;
      case 5: return !!data.step5_history;
      case 6: return !!data.step6_goals?.priority_behavior;
      case 7: return !!data.step7_preferences;
      default: return false;
    }
  }, [step, data]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1Basic
            value={data.step1_basic}
            onChange={(v: SurveyStep1) => updateStep('step1_basic', v)}
          />
        );
      case 2:
        return (
          <Step2Environment
            value={data.step2_environment}
            onChange={(v: SurveyStep2) => updateStep('step2_environment', v)}
          />
        );
      case 3:
        return (
          <Step3Behavior
            value={data.step3_behavior}
            onChange={(v: SurveyStep3) => updateStep('step3_behavior', v)}
          />
        );
      case 4:
        return (
          <Step4Triggers
            value={data.step4_triggers}
            onChange={(v: SurveyStep4) => updateStep('step4_triggers', v)}
          />
        );
      case 5:
        return (
          <Step5History
            value={data.step5_history}
            onChange={(v: SurveyStep5) => updateStep('step5_history', v)}
          />
        );
      case 6:
        return (
          <Step6Goals
            value={data.step6_goals}
            onChange={(v: SurveyStep6) => updateStep('step6_goals', v)}
            availableBehaviors={data.step3_behavior?.primary_behaviors ?? []}
          />
        );
      case 7:
        return (
          <Step7Preferences
            value={data.step7_preferences}
            onChange={(v: SurveyStep7) => updateStep('step7_preferences', v)}
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
