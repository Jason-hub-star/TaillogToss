/**
 * useBannerAd — 배너 광고 일일 노출 한도 관리
 * InlineAd 컴포넌트에 넘길 이벤트 핸들러와 canShow 상태를 반환
 * Parity: AD-001
 */
import { useState, useCallback } from 'react';
import type { BannerPlacement } from 'types/ads';
import { BANNER_PLACEMENT_CONFIG } from 'types/ads';
import { tracker } from 'lib/analytics/tracker';

const dailyCounts: Record<string, { date: string; count: number }> = {};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCount(placement: BannerPlacement): number {
  const e = dailyCounts[placement];
  return e?.date === todayKey() ? e.count : 0;
}

function increment(placement: BannerPlacement): void {
  const today = todayKey();
  const e = dailyCounts[placement];
  dailyCounts[placement] = (!e || e.date !== today)
    ? { date: today, count: 1 }
    : { date: today, count: e.count + 1 };
}

export interface UseBannerAdReturn {
  canShow: boolean;
  onAdRendered: () => void;
  onAdImpression: () => void;
  onAdClicked: () => void;
  onNoFill: () => void;
  onAdFailedToRender: () => void;
}

export function useBannerAd(placement: BannerPlacement): UseBannerAdReturn {
  const limit = BANNER_PLACEMENT_CONFIG[placement].dailyLimit;
  const [impressions, setImpressions] = useState(getCount(placement));

  const canShow = impressions < limit;

  const onAdRendered = useCallback(() => {
    tracker.adLoaded(placement);
  }, [placement]);

  const onAdImpression = useCallback(() => {
    increment(placement);
    setImpressions(prev => prev + 1);
    tracker.adImpression(placement);
  }, [placement]);

  const onAdClicked = useCallback(() => {}, []);

  const onNoFill = useCallback(() => {
    tracker.adNoFill(placement, 'no_fill');
  }, [placement]);

  const onAdFailedToRender = useCallback(() => {
    tracker.adError(placement);
  }, [placement]);

  return { canShow, onAdRendered, onAdImpression, onAdClicked, onNoFill, onAdFailedToRender };
}
