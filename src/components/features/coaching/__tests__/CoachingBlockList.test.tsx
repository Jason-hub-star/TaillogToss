import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CoachingBlockList } from '../CoachingBlockList';
import type { CoachingBlocks } from 'types/coaching';

const blocks: CoachingBlocks = {
  insight: {
    title: '혼자 있는 시간이 조금 어려워요',
    summary: '최근 기록에서 보호자 이탈 상황에 불안 신호가 반복됐어요.',
    key_patterns: ['문 앞 대기', '짖음 증가'],
    trend: 'stable',
  },
  action_plan: {
    title: '오늘의 실행 계획',
    items: [
      {
        id: 'a1',
        description: '문 손잡이를 만지는 짧은 연습부터 시작해요.',
        priority: 'high',
        is_completed: false,
      },
    ],
  },
  dog_voice: {
    message: '갑자기 혼자가 되면 조금 불안해요.',
    emotion: 'anxious',
  },
  next_7_days: {
    days: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      day_number: day,
      focus: `${day}일차 초점`,
      tasks: [`${day}일차 짧은 연습`, `${day}일차 보상 기록`],
      session_duration_minutes: 5,
      environment: '조용한 현관',
      progression_rule: '3회 연속 차분하면 다음 단계로 가요.',
    })),
  },
  risk_signals: {
    overall_risk: 'medium',
    signals: [
      {
        type: '불안 누적',
        description: '짧은 이탈에도 짖음이 길어지면 속도를 낮춰야 해요.',
        severity: 'medium',
        recommendation: '반복되면 행동 전문가에게 현재 루틴을 보여주세요.',
      },
    ],
  },
  consultation_questions: {
    recommended_specialist: 'behaviorist',
    questions: ['혼자 있기 연습 시간을 얼마나 천천히 늘려야 할까요?'],
  },
};

describe('CoachingBlockList result ownership', () => {
  it('shows all generated result blocks to free users without replacing them with locks', () => {
    const { getByText, queryByText } = render(
      <CoachingBlockList blocks={blocks} isPro={false} generatedAt="2026-05-27T00:00:00Z" />,
    );

    expect(getByText('7일 맞춤 플랜')).toBeTruthy();
    expect(getByText('1일차')).toBeTruthy();
    expect(queryByText('PRO 전용 콘텐츠')).toBeNull();

    fireEvent.press(getByText('위험 신호 분석'));
    expect(getByText('전체 위험도')).toBeTruthy();
    expect(getByText('불안 누적')).toBeTruthy();

    fireEvent.press(getByText('전문가 상담 질문'));
    expect(getByText('상담 시 질문 리스트')).toBeTruthy();
    expect(getByText('혼자 있기 연습 시간을 얼마나 천천히 늘려야 할까요?')).toBeTruthy();
  });
});
