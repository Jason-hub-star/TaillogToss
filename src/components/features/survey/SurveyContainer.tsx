/**
 * SurveyContainer — 설문 4단계 상태 관리 컨테이너 (UX 최종 개선 버전)
 * 중첩 스크롤 제거, 하드웨어 뒤로가기 대응, 유효성 가이드 추가
 * Parity: UIUX-004
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, BackHandler, StyleSheet, Text } from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import type { SurveyData } from 'types/dog';
import { Step1Profile } from './Step1Profile';
import { Step2Problem } from './Step2Problem';
import { Step3Goal } from './Step3Goal';
import { Step4Health } from './Step4Health';
import { colors, typography } from 'styles/tokens';

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  '반려견 프로필',
  '행동 고민 & 상황',
  '기질 & 보상',
  '건강 & 환경 스트레스',
];

const INITIAL_DATA: SurveyData = {
  step1_basic: { name: '', breed: '', age_months: 0, sex: 'MALE' },
  step2_environment: {
    household: { members_count: 1, has_children: false, has_other_pets: false, living_type: 'apartment' },
    daily_alone_hours: 0,
  },
  step3_behavior: { primary_behaviors: [], severity: {} as any, other_behavior_desc: '' },
  step4_triggers: { triggers: [], worst_time: 'random', custom_trigger: '' },
  step5_history: { past_attempts: [], professional_help: false },
  step6_goals: { goals: [], priority_behavior: 'anxiety' as any },
  step7_preferences: { 
    energy_score: 0, 
    social_score: 0, 
    mastered_commands: [], 
    rewards: { treats: 0, play: 0, praise: 0 },
    notification_consent: true 
  },
  step8_health_context: {
    health: { has_pain: false, has_allergy: false, is_overweight: false, notes: '' },
    environment_stress: { noise_sensitivity: 0, visitor_frequency: 'sometimes', walk_environment: 'normal' },
  }
};

export interface SurveyContainerProps {
  onComplete: (data: SurveyData) => void;
  onBack?: () => void;
}

export function SurveyContainer({ onComplete, onBack }: SurveyContainerProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SurveyData>(INITIAL_DATA);

  // 안드로이드 하드웨어 뒤로가기 처리
  useEffect(() => {
    const onBackPress = () => {
      if (step > 1) {
        setStep(s => s - 1);
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [step, onBack]);

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
      case 1: return !!(data.step1_basic.name.trim() && data.step1_basic.breed.trim() && data.step1_basic.age_months > 0);
      case 2: return data.step3_behavior.primary_behaviors.length > 0;
      case 3: return data.step7_preferences.energy_score > 0 && data.step7_preferences.social_score > 0;
      case 4: return true;
      default: return false;
    }
  }, [step, data]);

  const getValidationError = (): string | null => {
    if (isStepValid()) return null;
    switch (step) {
      case 1: return '이름, 나이, 품종을 모두 입력해주세요';
      case 2: return '고민되는 행동을 하나 이상 선택해주세요';
      case 3: return '기질 점수를 모두 선택해주세요';
      default: return null;
    }
  };

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
      case 4:
        return (
          <Step4Health
            value={data.step8_health_context}
            onChange={(v) => setData(prev => ({ ...prev, step8_health_context: v }))}
          />
        );
      default:
        return null;
    }
  };

  const errorMsg = getValidationError();

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
      <View style={styles.content}>
        {renderStep()}
        {!isStepValid() && errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  errorContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  errorText: {
    ...typography.detail,
    color: colors.primary,
    fontWeight: '700',
  },
});
