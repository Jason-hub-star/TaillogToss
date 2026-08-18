/**
 * 토스 Ads SDK 2.0 ver2 설정
 * Rewarded R1/R2/R3 · Banner B1/B2/B3 · Interstitial I1
 * 환경변수 미설정 시 테스트 ID로 자동 fallback
 * Parity: AD-001
 */
import type { AdPlacement, BannerPlacement, InterstitialPlacement } from 'types/ads';

type AllPlacement = AdPlacement | BannerPlacement | InterstitialPlacement;
type Cleanup = () => void;

// AIT Runtime resets process.env at launch. Keep console-issued adGroupIds as
// public runtime fallbacks so standalone .ait builds do not fall back to test IDs.
const LIVE_AD_GROUP_IDS: Record<AllPlacement, string> = {
  R1: 'ait.v2.live.2f60e3d012a8440e',
  R2: 'ait.v2.live.b2cbe7034b754c70',
  R3: 'ait.v2.live.7c28f7438e144887',
  B1: 'ait.v2.live.e93e93f42ff840cb',
  B2: 'ait.v2.live.350eee8c0ed34726',
  B3: 'ait.v2.live.f5dfef1b87cf4698',
  I1: 'ait.v2.live.bfe771c947b5421d',
};

const AD_GROUP_IDS: Record<AllPlacement, string> = {
  // Rewarded
  R1: process.env.AIT_AD_R1 || LIVE_AD_GROUP_IDS.R1,
  R2: process.env.AIT_AD_R2 || LIVE_AD_GROUP_IDS.R2,
  R3: process.env.AIT_AD_R3 || LIVE_AD_GROUP_IDS.R3,
  // Banner
  B1: process.env.AIT_AD_B1 || LIVE_AD_GROUP_IDS.B1,
  B2: process.env.AIT_AD_B2 || LIVE_AD_GROUP_IDS.B2,
  B3: process.env.AIT_AD_B3 || LIVE_AD_GROUP_IDS.B3,
  // Interstitial
  I1: process.env.AIT_AD_I1 || LIVE_AD_GROUP_IDS.I1,
};

export const TEST_AD_GROUP_PREFIX = ['ait', 'ad', 'test'].join('-') + '-';

export function getAdGroupId(placement: AllPlacement): string {
  return AD_GROUP_IDS[placement];
}

/** 테스트 ID 사용 중 여부 — BannerAd 목업 전환에 사용 */
export function isMockMode(placement: AllPlacement): boolean {
  return AD_GROUP_IDS[placement].startsWith(TEST_AD_GROUP_PREFIX);
}

// ─── Fullscreen SDK 인터페이스 (Rewarded + Interstitial 공용) ─────────────────

export interface AdLoadCallbacks {
  onLoaded: () => void;
  onError: (error: unknown) => void;
}

export interface AdShowCallbacks {
  onImpression?: () => void;
  onRewarded: () => void;
  onClosed: () => void;
  onError: (error: unknown) => void;
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
    showFullScreenAd({ onImpression, onRewarded, onError }) {
      if (!loaded) { onError(new Error('Ad not loaded')); return; }
      loaded = false;
      setTimeout(() => {
        try {
          onImpression?.();
          onRewarded();
        }
        catch (err) { onError(err instanceof Error ? err : new Error(String(err))); }
      }, 700);
    },
    isAdLoaded() { return loaded; },
    destroy() { loaded = false; },
  };
}

export function createFrameworkAdsSdk(): TossAdsSdk {
  let loaded = false;
  let loadedAdGroupId: string | null = null;
  let loadCleanup: Cleanup | null = null;
  let showCleanup: Cleanup | null = null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { loadFullScreenAd, showFullScreenAd } = require('@apps-in-toss/framework') as {
    loadFullScreenAd: {
      (params: {
        options: { adGroupId: string };
        onEvent: (event: { type: 'loaded' }) => void;
        onError: (error: unknown) => void;
      }): Cleanup;
      isSupported?: () => boolean;
    };
    showFullScreenAd: {
      (params: {
        options: { adGroupId: string };
        onEvent: (event: { type: 'userEarnedReward' | 'dismissed' | 'failedToShow' | 'requested' | 'show' | 'impression' | 'clicked' }) => void;
        onError: (error: unknown) => void;
      }): Cleanup;
      isSupported?: () => boolean;
    };
  };

  return {
    loadFullScreenAd({ adGroupId, onLoaded, onError }) {
      if (loadFullScreenAd.isSupported?.() === false) {
        onError(new Error('Full screen ads are not supported in this Toss app version'));
        return;
      }
      loadCleanup?.();
      loaded = false;
      loadedAdGroupId = null;
      loadCleanup = loadFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            loaded = true;
            loadedAdGroupId = adGroupId;
            onLoaded();
          }
        },
        onError: (error) => {
          loaded = false;
          loadedAdGroupId = null;
          onError(error);
        },
      });
    },
    showFullScreenAd({ onImpression, onRewarded, onClosed, onError }) {
      if (!loaded || !loadedAdGroupId) {
        onError(new Error('Ad not loaded'));
        return;
      }
      if (showFullScreenAd.isSupported?.() === false) {
        onError(new Error('Full screen ads are not supported in this Toss app version'));
        return;
      }
      showCleanup?.();
      showCleanup = showFullScreenAd({
        options: { adGroupId: loadedAdGroupId },
        onEvent: (event) => {
          if (event.type === 'requested') {
            loaded = false;
            loadedAdGroupId = null;
            return;
          }
          if (event.type === 'impression') onImpression?.();
          if (event.type === 'userEarnedReward') onRewarded();
          if (event.type === 'dismissed' || event.type === 'failedToShow') onClosed();
        },
        onError: (error) => {
          loaded = false;
          loadedAdGroupId = null;
          onError(error);
        },
      });
    },
    isAdLoaded() { return loaded; },
    destroy() {
      loadCleanup?.();
      showCleanup?.();
      loadCleanup = null;
      showCleanup = null;
      loaded = false;
      loadedAdGroupId = null;
    },
  };
}

let sdkInstance: TossAdsSdk | null = null;

export function getAdsSdk(): TossAdsSdk {
  if (!sdkInstance) sdkInstance = createFrameworkAdsSdk();
  return sdkInstance;
}
