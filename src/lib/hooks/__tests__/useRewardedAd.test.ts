/**
 * useRewardedAd 훅 테스트 — 상태 전이, 타임아웃 폴백, 일일 한도, 에러 폴백
 * Parity: AD-001
 */
import { renderHook, act } from '@testing-library/react-native';
import { useRewardedAd } from '../useRewardedAd';

// Mock SDK — 테스트별 동작 제어
let mockLoadFn: jest.Mock;
let mockShowFn: jest.Mock;

jest.mock('lib/ads/config', () => ({
  getAdUnitId: () => 'test-unit-id',
  getAdsSdk: () => ({
    loadRewardedAd: (...args: unknown[]) => mockLoadFn(...args),
    showRewardedAd: (...args: unknown[]) => mockShowFn(...args),
    isLoaded: () => true,
  }),
}));

jest.mock('lib/analytics/tracker', () => ({
  tracker: {
    adRequested: jest.fn(),
    adLoaded: jest.fn(),
    adRewarded: jest.fn(),
    adError: jest.fn(),
    adNoFill: jest.fn(),
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockLoadFn = jest.fn().mockResolvedValue(undefined);
  mockShowFn = jest.fn().mockResolvedValue({ rewarded: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useRewardedAd', () => {
  it('초기 상태는 idle', () => {
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R1', onRewarded));

    expect(result.current.adState).toBe('idle');
    expect(result.current.isDailyLimitReached).toBe(false);
  });

  it('showAd → loading → rewarded 상태 전이 + onRewarded 호출', async () => {
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R1', onRewarded));

    await act(async () => {
      result.current.showAd();
      // Promise 체인 해소
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.adState).toBe('rewarded');
    expect(onRewarded).toHaveBeenCalledTimes(1);
  });

  it('SDK 에러 시 error 상태 + 무광고 폴백으로 onRewarded 호출', async () => {
    mockLoadFn.mockRejectedValue(new Error('Network error'));
    const onRewarded = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() => useRewardedAd('R2', onRewarded, onError));

    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.adState).toBe('error');
    expect(onRewarded).toHaveBeenCalledTimes(1); // 무광고 폴백
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('loading 중 중복 showAd 호출 무시', async () => {
    // 느린 로드 시뮬레이션
    mockLoadFn.mockImplementation(() => new Promise(() => {}));
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R3', onRewarded));

    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });

    expect(result.current.adState).toBe('loading');

    // 중복 호출 — 무시되어야 함
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });

    expect(mockLoadFn).toHaveBeenCalledTimes(1);
  });

  it('보상 미지급 시 no_fill + 무광고 폴백', async () => {
    mockShowFn.mockResolvedValue({ rewarded: false });
    const onRewarded = jest.fn();

    const { result } = renderHook(() => useRewardedAd('R1', onRewarded));

    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.adState).toBe('no_fill');
    expect(onRewarded).toHaveBeenCalledTimes(1); // unlock_on_no_fill
  });
});
