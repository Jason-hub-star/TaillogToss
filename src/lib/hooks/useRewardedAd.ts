/**
 * useRewardedAd — 보상형 광고 라이프사이클 훅
 * load → show → reward/error/no_fill 상태 관리 + 타임아웃 폴백 + 일일 한도
 * Parity: AD-001
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AdPlacement, RewardedAdState } from 'types/ads';
import { DEFAULT_AD_FALLBACK } from 'types/ads';
import { getAdUnitId, getAdsSdk } from 'lib/ads/config';
import { tracker } from 'lib/analytics/tracker';

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
    };
  }, []);

  const isDailyLimitReached = getDailyCount(placement) >= DEFAULT_AD_FALLBACK.daily_limit;

  const showAd = useCallback(() => {
    if (adState === 'loading' || adState === 'showing' || adState === 'rewarded') return;

    // 일일 한도 초과 시 무광고 폴백
    if (getDailyCount(placement) >= DEFAULT_AD_FALLBACK.daily_limit) {
      setAdState('no_fill');
      tracker.adNoFill(placement, 'daily_limit');
      if (DEFAULT_AD_FALLBACK.unlock_on_no_fill) onRewarded();
      return;
    }

    setAdState('loading');
    tracker.adRequested(placement);

    const sdk = getAdsSdk();
    const unitId = getAdUnitId(placement);

    // 타임아웃 폴백
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setAdState('no_fill');
      tracker.adNoFill(placement, 'timeout');
      if (DEFAULT_AD_FALLBACK.unlock_on_no_fill) onRewarded();
    }, DEFAULT_AD_FALLBACK.timeout_ms);

    sdk
      .loadRewardedAd(unitId)
      .then(() => {
        if (!mountedRef.current) return;
        tracker.adLoaded(placement);
        setAdState('showing');
        return sdk.showRewardedAd();
      })
      .then((result) => {
        if (!mountedRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (result?.rewarded) {
          incrementDailyCount(placement);
          setAdState('rewarded');
          tracker.adRewarded(placement);
          onRewarded();
        } else {
          setAdState('no_fill');
          tracker.adNoFill(placement, 'no_reward');
          if (DEFAULT_AD_FALLBACK.unlock_on_no_fill) onRewarded();
        }
      })
      .catch(() => {
        if (!mountedRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setAdState('error');
        tracker.adError(placement);

        // 에러 시에도 무광고 폴백
        if (DEFAULT_AD_FALLBACK.unlock_on_no_fill) onRewarded();
        onError?.();
      });
  }, [adState, placement, onRewarded, onError]);

  return { adState, showAd, isDailyLimitReached };
}
