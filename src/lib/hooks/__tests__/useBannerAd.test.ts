import { act, renderHook } from '@testing-library/react-native';
import { useBannerAd } from '../useBannerAd';

jest.mock('lib/analytics/tracker', () => ({
  tracker: {
    adRequested: jest.fn(),
    adLoaded: jest.fn(),
    adImpression: jest.fn(),
    adNoFill: jest.fn(),
    adError: jest.fn(),
  },
}));

describe('useBannerAd', () => {
  it('keeps B1 eligible across repeated dashboard impressions', () => {
    const { result } = renderHook(() => useBannerAd('B1'));

    expect(result.current.canShow).toBe(true);

    act(() => {
      result.current.onAdImpression({ source: 'test-1' });
      result.current.onAdImpression({ source: 'test-2' });
      result.current.onAdImpression({ source: 'test-3' });
    });

    expect(result.current.canShow).toBe(true);
  });

  it('still applies daily limits to non-dashboard banner placements', () => {
    const { result } = renderHook(() => useBannerAd('B2'));

    expect(result.current.canShow).toBe(true);

    act(() => {
      result.current.onAdImpression({ source: 'test-1' });
      result.current.onAdImpression({ source: 'test-2' });
    });

    expect(result.current.canShow).toBe(false);
  });
});
