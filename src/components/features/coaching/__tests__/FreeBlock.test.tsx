import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ActionPlanBlockView, DogVoiceBlockView } from '../FreeBlock';

describe('DogVoiceBlockView', () => {
  const advanceTyping = (message: string) => {
    act(() => {
      jest.advanceTimersByTime(message.length * 30 + 30);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders dog voice title and typed message', () => {
    const message = '나도 천천히 배워볼게요.';
    const { getByText, queryByText } = render(
      <DogVoiceBlockView
        dogName="메이"
        data={{ message, emotion: 'hopeful' }}
      />,
    );

    expect(getByText('메이의 마음')).toBeTruthy();
    expect(queryByText(message)).toBeNull();

    fireEvent.press(getByText('열기'));
    advanceTyping(message);

    expect(getByText(message)).toBeTruthy();
  });

  it('keeps the dog voice block visible when backend message is empty', () => {
    const fallbackMessage = '지금 제 마음을 천천히 읽어보고 있어요.';
    const { getByText } = render(
      <DogVoiceBlockView
        dogName="메이"
        data={{ message: '', emotion: 'hopeful' }}
      />,
    );

    fireEvent.press(getByText('열기'));
    advanceTyping(fallbackMessage);

    expect(getByText('메이의 마음')).toBeTruthy();
    expect(getByText(fallbackMessage)).toBeTruthy();
  });
});

describe('ActionPlanBlockView', () => {
  it('shows Pro deep action details with easy labels', () => {
    const handleNavigateToTraining = jest.fn();
    const { getByText, queryByText } = render(
      <ActionPlanBlockView
        isPro
        onNavigateToTraining={handleNavigateToTraining}
        data={{
          title: '행동 개선 계획',
          items: [
            {
              id: 'a1',
              description: '문 손잡이를 만지는 것부터 시작해요.',
              priority: 'high',
              is_completed: false,
              technique: '짧은 이탈 연습',
              psychological_principle: '안전하다는 예측을 다시 배워요.',
              tools: ['high-value treats', 'video log'],
              environment_setup: '조용한 현관',
              steps: ['문 손잡이를 1초 만져요.', '조용하면 바로 간식을 줘요.'],
              success_criteria: '3회 연속 짖지 않아요.',
              stop_criteria: '짖거나 문을 긁으면 멈춰요.',
              plan_b: '문에서 더 멀리 시작해요.',
              plan_c: '손잡이를 보기만 해요.',
              evidence_from_intake: '보호자 이탈 때 불안해요.',
              reference_curriculum_ids: ['separation_anxiety'],
            },
          ],
        }}
      />,
    );

    expect(getByText('자세히 보기')).toBeTruthy();
    expect(queryByText('멈출 신호')).toBeNull();

    fireEvent.press(getByText('자세히 보기'));

    expect(getByText('방법')).toBeTruthy();
    expect(getByText('이유')).toBeTruthy();
    expect(getByText('준비물')).toBeTruthy();
    expect(getByText('멈출 신호')).toBeTruthy();
    expect(getByText('짖거나 문을 긁으면 멈춰요.')).toBeTruthy();
    expect(getByText('좋아하는 간식, 영상 기록')).toBeTruthy();
    expect(getByText('분리불안 완화 훈련')).toBeTruthy();

    fireEvent.press(getByText('관련 훈련 바로 시작하기'));
    expect(handleNavigateToTraining).toHaveBeenCalledWith('separation_anxiety');
  });
});
