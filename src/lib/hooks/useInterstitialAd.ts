/**
 * useInterstitialAd — 전면형 광고 라이프사이클 훅
 * Rewarded와 동일한 load→show 패턴, 보상 없이 dismissed 콜백만 처리
 * Parity: AD-001
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { InterstitialPlacement, InterstitialAdState } from 'types/ads';
import { INTERSTITIAL_PLACEMENT_CONFIG, DEFAULT_AD_FALLBACK } from 'types/ads';
import { getAdGroupId, getAdsSdk } from 'lib/ads/config';
import { tracker } from 'lib/analytics/tracker';

const dailyCounts: Record<string, { date: string; count: number }> = {};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCount(placement: InterstitialPlacement): number {
  const e = dailyCounts[placement];
  return e?.date === todayKey() ? e.count : 0;
}

function increment(placement: InterstitialPlacement): void {
  const today = todayKey();
  const e = dailyCounts[placement];
  dailyCounts[placement] = (!e || e.date !== today)
    ? { date: today, count: 1 }
    : { date: today, count: e.count + 1 };
}

export interface UseInterstitialAdReturn {
  adState: InterstitialAdState;
  /** 광고를 표시한다. 한도 초과 시 onDismissed를 즉시 호출 */
  showAd: () => void;
  isDailyLimitReached: boolean;
}

export function useInterstitialAd(
  placement: InterstitialPlacement,
  onDismissed?: () => void,
  onError?: () => void,
): UseInterstitialAdReturn {
  const [adState, setAdState] = useState<InterstitialAdState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const limit = INTERSTITIAL_PLACEMENT_CONFIG[placement].dailyLimit;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      getAdsSdk().destroy();
    };
  }, []);

  const isDailyLimitReached = getCount(placement) >= limit;

  const showAd = useCallback(() => {
    if (adState === 'loading' || adState === 'showing') return;

    if (getCount(placement) >= limit) {
      setAdState('no_fill');
      tracker.adNoFill(placement, 'daily_limit');
      onDismissed?.();
      return;
    }

    setAdState('loading');
    tracker.adRequested(placement);

    const sdk = getAdsSdk();
    const adGroupId = getAdGroupId(placement);

    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setAdState('no_fill');
      tracker.adNoFill(placement, 'timeout');
      onDismissed?.();
    }, DEFAULT_AD_FALLBACK.timeout_ms);

    sdk.loadFullScreenAd({
      adGroupId,
      onLoaded: () => {
        if (!mountedRef.current) return;
        tracker.adLoaded(placement);
        setAdState('showing');

        let handled = false;

        const handleDismiss = () => {
          if (!mountedRef.current || handled) return;
          handled = true;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          increment(placement);
          setAdState('dismissed');
          tracker.adDismissed(placement);
          onDismissed?.();
        };

        sdk.showFullScreenAd({
          onRewarded: handleDismiss,
          onClosed: handleDismiss,
          onError: () => {
            if (!mountedRef.current || handled) return;
            handled = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setAdState('error');
            tracker.adError(placement);
            onError?.();
          },
        });
      },
      onError: () => {
        if (!mountedRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setAdState('error');
        tracker.adError(placement);
        onError?.();
      },
    });
  }, [adState, placement, limit, onDismissed, onError]);

  return { adState, showAd, isDailyLimitReached };
}
