import React from 'react';
import { act, render } from '@testing-library/react-native';
import { CoachingGenerationLoader } from '../CoachingGenerationLoader';

jest.mock('components/shared/LottieAnimation', () => ({
  LottieAnimation: ({ asset }: { asset: string }) => {
    const { Text } = require('react-native');
    return <Text>{`lottie:${asset}`}</Text>;
  },
}));

describe('CoachingGenerationLoader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows dog-specific wait copy and non-background guarantee copy', () => {
    const { getByText } = render(<CoachingGenerationLoader dogName="우디" />);

    expect(getByText('lottie:perrito-corriendo')).toBeTruthy();
    expect(getByText('우디의 기록을 분석하고 있어요')).toBeTruthy();
    expect(getByText('보통 10~30초 정도 걸려요. 결과가 나올 때까지 이 화면을 유지해주세요.')).toBeTruthy();
    expect(getByText('화면을 나가면 생성 완료를 보장하기 어려워요.')).toBeTruthy();
  });

  it('falls back to a generic dog name', () => {
    const { getByText } = render(<CoachingGenerationLoader />);

    expect(getByText('우리 강아지의 기록을 분석하고 있어요')).toBeTruthy();
  });

  it('advances generation steps over time', () => {
    const { getByText } = render(<CoachingGenerationLoader dogName="우디" />);

    expect(getByText('최근 기록 확인 중')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByText('반복 패턴 찾는 중')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(getByText('맞춤 코칭 작성 중')).toBeTruthy();
  });
});
