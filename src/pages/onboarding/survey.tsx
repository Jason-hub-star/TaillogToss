/**
 * 온보딩 설문 화면 — SurveyContainer(7단계) 래핑
 * 설문 완료 → survey-result로 이동
 * Parity: AUTH-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { SurveyContainer } from 'components/features/survey/SurveyContainer';
import { useCreateDogFromSurvey } from 'lib/hooks/useDogs';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useSurvey } from 'stores/SurveyContext';
import type { SurveyData } from 'types/dog';

export const Route = createRoute('/onboarding/survey', {
  component: SurveyPage,
});

function SurveyPage() {
  const navigation = useNavigation();
  const { user, setOnboardingComplete } = useAuth();
  const { setSurveyData } = useSurvey();
  const createDog = useCreateDogFromSurvey();
  const { isReady } = usePageGuard({
    currentPath: '/onboarding/survey',
    skipOnboarding: true,
  });

  const handleComplete = useCallback((data: SurveyData) => {
    if (!user) {
      navigation.navigate('/login');
      return;
    }

    setSurveyData(data);
    createDog.mutate(
      { userId: user.id, survey: data },
      {
        onSuccess: () => {
          // 설문 저장 성공 시 즉시 온보딩 완료 상태를 반영해 후속 화면 회귀를 방지한다.
          setOnboardingComplete();
          navigation.navigate('/onboarding/survey-result');
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message.slice(0, 220)
              : '알 수 없는 오류';
          console.error('[AUTH-001] survey submit failed', error);
          Alert.alert('저장 실패', `설문 저장에 실패했어요.\n${message}`);
        },
      }
    );
  }, [createDog, navigation, setOnboardingComplete, setSurveyData, user]);

  const handleBack = useCallback(() => {
    navigation.navigate('/onboarding/welcome');
  }, [navigation]);

  if (!isReady) return null;

  return <SurveyContainer onComplete={handleComplete} onBack={handleBack} />;
}
