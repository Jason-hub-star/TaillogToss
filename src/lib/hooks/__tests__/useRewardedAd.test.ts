/**
 * useRewardedAd 훅 테스트 — 상태 전이, 타임아웃 폴백, 에러 폴백
 * Parity: AD-001
 *
 * SDK 인터페이스: 콜백 기반 (onLoaded / onRewarded / onClosed / onError)
 * → mock은 callbacks를 동기 호출로 시뮬레이션
 */
import { renderHook, act } from '@testing-library/react-native';
import { useRewardedAd } from '../useRewardedAd';

type LoadOpts = { adGroupId: string; onLoaded: () => void; onError: (e: Error) => void };
type ShowOpts = { onRewarded: () => void; onClosed: () => void; onError: (e: Error) => void };

// 콜백 캡처용 — 각 테스트에서 직접 트리거 가능
let capturedLoadOpts: LoadOpts | null = null;
let capturedShowOpts: ShowOpts | null = null;

jest.mock('lib/ads/config', () => ({
  getAdGroupId: () => 'test-ad-group-id',
  getAdsSdk: () => ({
    loadFullScreenAd: (opts: LoadOpts) => {
      capturedLoadOpts = opts;
    },
    showFullScreenAd: (opts: ShowOpts) => {
      capturedShowOpts = opts;
    },
    isAdLoaded: () => true,
    destroy: jest.fn(),
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
  capturedLoadOpts = null;
  capturedShowOpts = null;
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

  it('showAd → loading → showing → rewarded 상태 전이 + onRewarded 호출', async () => {
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R1', onRewarded));

    // showAd 호출 → loading 상태 + loadFullScreenAd 콜백 캡처
    await act(async () => {
      result.current.showAd();
    });
    expect(result.current.adState).toBe('loading');
    expect(capturedLoadOpts).not.toBeNull();

    // onLoaded 트리거 → showing 상태 + showFullScreenAd 콜백 캡처
    await act(async () => {
      capturedLoadOpts!.onLoaded();
    });
    expect(result.current.adState).toBe('showing');
    expect(capturedShowOpts).not.toBeNull();

    // onRewarded 트리거 → rewarded 상태
    await act(async () => {
      capturedShowOpts!.onRewarded();
    });
    expect(result.current.adState).toBe('rewarded');
    expect(onRewarded).toHaveBeenCalledTimes(1);
  });

  it('SDK loadFullScreenAd 에러 시 error 상태로 전환하고 보상은 지급하지 않음', async () => {
    const onRewarded = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() => useRewardedAd('R2', onRewarded, onError));

    await act(async () => {
      result.current.showAd();
    });
    expect(capturedLoadOpts).not.toBeNull();

    // load 에러 트리거
    await act(async () => {
      capturedLoadOpts!.onError(new Error('Network error'));
    });

    expect(result.current.adState).toBe('error');
    expect(onRewarded).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('광고 타임아웃은 no_fill 처리하지만 보상 콜백을 호출하지 않음', async () => {
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R2', onRewarded));

    await act(async () => {
      result.current.showAd();
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.adState).toBe('no_fill');
    expect(onRewarded).not.toHaveBeenCalled();
  });

  it('loading 중 중복 showAd 호출 무시', async () => {
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R3', onRewarded));

    // 첫 번째 showAd → loading (콜백 미트리거로 유지)
    await act(async () => {
      result.current.showAd();
    });
    expect(result.current.adState).toBe('loading');

    // 두 번째 showAd → 무시 (loading 상태이므로)
    const prevLoadOpts = capturedLoadOpts;
    await act(async () => {
      result.current.showAd();
    });

    // loadFullScreenAd가 한 번만 호출됐는지 확인 (capturedLoadOpts 동일)
    expect(capturedLoadOpts).toBe(prevLoadOpts);
    expect(result.current.adState).toBe('loading');
  });

  it('보상 미지급(onClosed) 시 no_fill 처리하고 리워드는 지급하지 않음', async () => {
    const onRewarded = jest.fn();
    const { result } = renderHook(() => useRewardedAd('R1', onRewarded));

    await act(async () => {
      result.current.showAd();
    });
    await act(async () => {
      capturedLoadOpts!.onLoaded();
    });
    expect(result.current.adState).toBe('showing');

    // 보상 없이 닫기 → no_fill
    await act(async () => {
      capturedShowOpts!.onClosed();
    });

    expect(result.current.adState).toBe('no_fill');
    expect(onRewarded).not.toHaveBeenCalled();
  });
});
