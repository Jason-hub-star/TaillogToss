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

  it('shows dog-specific async wait copy', () => {
    const { getByText } = render(<CoachingGenerationLoader dogName="우디" />);

    expect(getByText('lottie:perrito-corriendo')).toBeTruthy();
    expect(getByText('우디의 코칭을 만들고 있어요')).toBeTruthy();
    expect(getByText('보통 30~60초 정도 걸려요. 화면을 나가도 생성 상태를 다시 확인할 수 있어요.')).toBeTruthy();
    expect(getByText('완료되면 최신 결과로 바로 보여드릴게요.')).toBeTruthy();
  });

  it('falls back to a generic dog name', () => {
    const { getByText } = render(<CoachingGenerationLoader />);

    expect(getByText('우리 강아지의 코칭을 만들고 있어요')).toBeTruthy();
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
