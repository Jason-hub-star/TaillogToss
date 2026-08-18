/**
 * useRewardedAd — 보상형 광고 라이프사이클 훅
 * load → show → reward/error/no_fill 상태 관리 + 타임아웃 폴백 + 일일 한도
 * Parity: AD-001
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AdPlacement, RewardedAdState } from 'types/ads';
import { DEFAULT_AD_FALLBACK } from 'types/ads';
import { getAdGroupId, getAdsSdk } from 'lib/ads/config';
import { setFullscreenAdActive } from 'lib/ads/adCoordination';
import { tracker } from 'lib/analytics/tracker';
import { buildAdDiagnostics } from 'lib/ads/diagnostics';

/** 일일 광고 노출 카운트 (인메모리, 앱 재시작 시 리셋) */
const dailyCounts: Record<string, { date: string; count: number }> = {};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyCount(placement: AdPlacement): number {
  const entry = dailyCounts[placement];
  if (!entry || entry.date !== getTodayKey()) return 0;
  return entry.count;
}

function incrementDailyCount(placement: AdPlacement): void {
  const today = getTodayKey();
  const entry = dailyCounts[placement];
  if (!entry || entry.date !== today) {
    dailyCounts[placement] = { date: today, count: 1 };
  } else {
    entry.count += 1;
  }
}

export interface UseRewardedAdReturn {
  adState: RewardedAdState;
  /** 광고 로드+표시 한번에 실행 */
  showAd: () => void;
  /** 일일 한도 도달 여부 */
  isDailyLimitReached: boolean;
}

export function useRewardedAd(
  placement: AdPlacement,
  onRewarded: () => void,
  onError?: () => void,
): UseRewardedAdReturn {
  const [adState, setAdState] = useState<RewardedAdState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // 공식 SDK cleanup 패턴
      setFullscreenAdActive(false);
      getAdsSdk().destroy();
    };
  }, []);

  const isDailyLimitReached = getDailyCount(placement) >= DEFAULT_AD_FALLBACK.daily_limit;

  const showAd = useCallback(() => {
    if (adState === 'loading' || adState === 'showing' || adState === 'rewarded') return;

    // 일일 한도 초과 시 무광고 폴백
    if (getDailyCount(placement) >= DEFAULT_AD_FALLBACK.daily_limit) {
      setAdState('no_fill');
      tracker.adNoFill(placement, 'daily_limit', buildAdDiagnostics(placement, 'daily_limit'));
      return;
    }

    setAdState('loading');
    // AIT 2026-07-10: 로드 시작 시 배너를 억제해 Android 동시로드 이벤트 실패를 피한다.
    setFullscreenAdActive(true);
    tracker.adRequested(placement, buildAdDiagnostics(placement, 'fullscreen_load_requested'));

    const sdk = getAdsSdk();
    const adGroupId = getAdGroupId(placement);

    // 타임아웃 폴백
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setFullscreenAdActive(false);
      setAdState('no_fill');
      tracker.adNoFill(placement, 'timeout', buildAdDiagnostics(placement, 'fullscreen_load_timeout'));
    }, DEFAULT_AD_FALLBACK.timeout_ms);

    sdk.loadFullScreenAd({
      adGroupId,
      onLoaded: () => {
        if (!mountedRef.current) return;
        tracker.adLoaded(placement, buildAdDiagnostics(placement, 'fullscreen_loaded'));
        setAdState('showing');

        let rewardHandled = false;

        sdk.showFullScreenAd({
          onImpression: () => {
            if (!mountedRef.current || rewardHandled) return;
            tracker.adImpression(placement, buildAdDiagnostics(placement, 'fullscreen_impression'));
          },
          onRewarded: () => {
            if (!mountedRef.current || rewardHandled) return;
            rewardHandled = true;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setFullscreenAdActive(false);
            incrementDailyCount(placement);
            setAdState('rewarded');
            tracker.adRewarded(placement, buildAdDiagnostics(placement, 'fullscreen_rewarded'));
            onRewarded();
          },
          onClosed: () => {
            if (!mountedRef.current || rewardHandled) return;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setFullscreenAdActive(false);
            setAdState('no_fill');
            tracker.adNoFill(
              placement,
              'closed_without_reward',
              buildAdDiagnostics(placement, 'fullscreen_closed_without_reward'),
            );
          },
          onError: (error) => {
            if (!mountedRef.current || rewardHandled) return;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setFullscreenAdActive(false);
            setAdState('error');
            tracker.adError(placement, buildAdDiagnostics(placement, 'fullscreen_show_error', error));
            onError?.();
          },
        });
      },
      onError: (error) => {
        if (!mountedRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setFullscreenAdActive(false);
        setAdState('error');
        tracker.adError(placement, buildAdDiagnostics(placement, 'fullscreen_load_error', error));
        onError?.();
      },
    });
  }, [adState, placement, onRewarded, onError]);

  return { adState, showAd, isDailyLimitReached };
}
