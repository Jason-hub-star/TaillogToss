/**
 * 토스 Ads SDK 2.0 설정 — placement별 ad unit ID 매핑 + SDK 인터페이스
 * 사업자등록 후 실제 ID로 교체. 현재 테스트 ID 사용.
 * Parity: AD-001
 */
import type { AdPlacement } from 'types/ads';

/** Ad Unit ID 매핑 (사업자등록 후 Developers Console에서 발급) */
const AD_UNIT_IDS: Record<AdPlacement, string> = {
  R1: 'ait-ad-test-rewarded-id', // survey-result
  R2: 'ait-ad-test-rewarded-id', // dashboard/analysis
  R3: 'ait-ad-test-rewarded-id', // coaching-result
};

export function getAdUnitId(placement: AdPlacement): string {
  return AD_UNIT_IDS[placement];
}

/**
 * 토스 Ads SDK 추상 인터페이스 — 실제 SDK 연결 시 구현체 교체
 * 현재는 mock 구현. SDK import 시 아래 인터페이스 기준으로 어댑터 작성.
 */
export interface TossAdsSdk {
  loadRewardedAd(unitId: string): Promise<void>;
  showRewardedAd(): Promise<{ rewarded: boolean }>;
  isLoaded(): boolean;
}

/** Mock SDK — 1초 후 보상 지급 시뮬레이션 */
export function createMockAdsSdk(): TossAdsSdk {
  let loaded = false;

  return {
    async loadRewardedAd(_unitId: string) {
      await delay(300);
      loaded = true;
    },
    async showRewardedAd() {
      if (!loaded) throw new Error('Ad not loaded');
      loaded = false;
      await delay(700);
      return { rewarded: true };
    },
    isLoaded() {
      return loaded;
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * SDK 싱글턴 — 사업자등록 후 실제 토스 Ads SDK로 교체
 * TODO: import TossAds from '@toss/ads-sdk'; 후 실구현체 반환
 */
let sdkInstance: TossAdsSdk | null = null;

export function getAdsSdk(): TossAdsSdk {
  if (!sdkInstance) {
    sdkInstance = createMockAdsSdk();
  }
  return sdkInstance;
}
