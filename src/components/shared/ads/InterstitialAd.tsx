/**
 * InterstitialAd — 전면형 광고 render-prop 래퍼
 * 광고가 끝나면 onProceed()를 자동 호출, 한도 초과 시 광고 없이 즉시 진행
 * Parity: AD-001
 *
 * 사용 예:
 *   <InterstitialAd placement="I1" onProceed={navigateToDetail}>
 *     {({ showAd, isLoading }) => (
 *       <Button onPress={showAd} loading={isLoading}>훈련 시작</Button>
 *     )}
 *   </InterstitialAd>
 */
import React, { type ReactNode } from 'react';
import type { InterstitialPlacement, InterstitialAdState } from 'types/ads';
import { useInterstitialAd } from 'lib/hooks/useInterstitialAd';

export interface InterstitialAdChildProps {
  /** 광고를 표시하거나 (한도 초과 시) 즉시 onProceed 실행 */
  showAd: () => void;
  isLoading: boolean;
  isLimitReached: boolean;
  adState: InterstitialAdState;
}

export interface InterstitialAdProps {
  placement: InterstitialPlacement;
  onProceed: () => void;
  onError?: () => void;
  children: (props: InterstitialAdChildProps) => ReactNode;
}

export function InterstitialAd({
  placement,
  onProceed,
  onError,
  children,
}: InterstitialAdProps) {
  const { adState, showAd, isDailyLimitReached } = useInterstitialAd(
    placement,
    onProceed,
    onError,
  );

  return (
    <>
      {children({
        showAd: isDailyLimitReached ? onProceed : showAd,
        isLoading: adState === 'loading' || adState === 'showing',
        isLimitReached: isDailyLimitReached,
        adState,
      })}
    </>
  );
}
