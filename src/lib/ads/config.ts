/**
 * 토스 Ads SDK 2.0 ver2 설정
 * Rewarded R1/R2/R3 · Banner B1/B2/B3 · Interstitial I1
 * 환경변수 미설정 시 테스트 ID로 자동 fallback
 * Parity: AD-001
 */
import type { AdPlacement, BannerPlacement, InterstitialPlacement } from 'types/ads';

type AllPlacement = AdPlacement | BannerPlacement | InterstitialPlacement;

const AD_GROUP_IDS: Record<AllPlacement, string> = {
  // Rewarded
  R1: process.env.AIT_AD_R1 ?? 'ait-ad-test-rewarded-id',
  R2: process.env.AIT_AD_R2 ?? 'ait-ad-test-rewarded-id',
  R3: process.env.AIT_AD_R3 ?? 'ait-ad-test-rewarded-id',
  // Banner
  B1: process.env.AIT_AD_B1 ?? 'ait-ad-test-banner-id',
  B2: process.env.AIT_AD_B2 ?? 'ait-ad-test-native-image-id',
  B3: process.env.AIT_AD_B3 ?? 'ait-ad-test-banner-id',
  // Interstitial
  I1: process.env.AIT_AD_I1 ?? 'ait-ad-test-interstitial-id',
};

export function getAdGroupId(placement: AllPlacement): string {
  return AD_GROUP_IDS[placement];
}

/** 테스트 ID 사용 중 여부 — BannerAd 목업 전환에 사용 */
export function isMockMode(placement: AllPlacement): boolean {
  return AD_GROUP_IDS[placement].startsWith('ait-ad-test-');
}

// ─── Fullscreen SDK 인터페이스 (Rewarded + Interstitial 공용) ─────────────────

export interface AdLoadCallbacks {
  onLoaded: () => void;
  onError: (error: Error) => void;
}

export interface AdShowCallbacks {
  onRewarded: () => void;
  onClosed: () => void;
  onError: (error: Error) => void;
}

export interface TossAdsSdk {
  loadFullScreenAd(options: { adGroupId: string } & AdLoadCallbacks): void;
  showFullScreenAd(callbacks: AdShowCallbacks): void;
  isAdLoaded(): boolean;
  destroy(): void;
}

export function createMockAdsSdk(): TossAdsSdk {
  let loaded = false;
  return {
    loadFullScreenAd({ onLoaded, onError }) {
      setTimeout(() => {
        try { loaded = true; onLoaded(); }
        catch (err) { onError(err instanceof Error ? err : new Error(String(err))); }
      }, 300);
    },
    showFullScreenAd({ onRewarded, onError }) {
      if (!loaded) { onError(new Error('Ad not loaded')); return; }
      loaded = false;
      setTimeout(() => {
        try { onRewarded(); }
        catch (err) { onError(err instanceof Error ? err : new Error(String(err))); }
      }, 700);
    },
    isAdLoaded() { return loaded; },
    destroy() { loaded = false; },
  };
}

let sdkInstance: TossAdsSdk | null = null;

export function getAdsSdk(): TossAdsSdk {
  if (!sdkInstance) sdkInstance = createMockAdsSdk();
  return sdkInstance;
}
