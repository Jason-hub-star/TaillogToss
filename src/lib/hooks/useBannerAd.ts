/**
 * useBannerAd — 배너 광고 일일 노출 한도 관리
 * InlineAd 컴포넌트에 넘길 이벤트 핸들러와 canShow 상태를 반환
 * Parity: AD-001
 */
import { useState, useCallback, useEffect } from 'react';
import type { BannerPlacement } from 'types/ads';
import { BANNER_PLACEMENT_CONFIG } from 'types/ads';
import { tracker } from 'lib/analytics/tracker';
import { buildAdDiagnostics } from 'lib/ads/diagnostics';
import { useFullscreenAdActive } from 'lib/ads/adCoordination';

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
  onAdRendered: (details?: unknown) => void;
  onAdImpression: (details?: unknown) => void;
  onAdClicked: () => void;
  onNoFill: (details?: unknown) => void;
  onAdFailedToRender: (details?: unknown) => void;
}

export function useBannerAd(placement: BannerPlacement): UseBannerAdReturn {
  const limit = BANNER_PLACEMENT_CONFIG[placement].dailyLimit;
  const [impressions, setImpressions] = useState(getCount(placement));

  // AIT 2026-07-10: 전면/보상형 로드·표시 중에는 배너 렌더를 억제해 Android 동시로드 이벤트 실패를 피한다.
  const fullscreenActive = useFullscreenAdActive();
  const canShow = impressions < limit && !fullscreenActive;

  useEffect(() => {
    if (!canShow) return;
    tracker.adRequested(placement, buildAdDiagnostics(placement, 'inline_mount'));
  }, [canShow, placement]);

  const onAdRendered = useCallback((details?: unknown) => {
    tracker.adLoaded(placement, buildAdDiagnostics(placement, 'inline_rendered', details));
  }, [placement]);

  const onAdImpression = useCallback((details?: unknown) => {
    increment(placement);
    setImpressions(prev => prev + 1);
    tracker.adImpression(placement, buildAdDiagnostics(placement, 'inline_impression', details));
  }, [placement]);

  const onAdClicked = useCallback(() => {}, []);

  const onNoFill = useCallback((details?: unknown) => {
    tracker.adNoFill(placement, 'no_fill', buildAdDiagnostics(placement, 'inline_no_fill', details));
  }, [placement]);

  const onAdFailedToRender = useCallback((details?: unknown) => {
    tracker.adError(placement, buildAdDiagnostics(placement, 'inline_failed_to_render', details));
  }, [placement]);

  return { canShow, onAdRendered, onAdImpression, onAdClicked, onNoFill, onAdFailedToRender };
}
