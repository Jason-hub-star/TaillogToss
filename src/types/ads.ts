/**
 * 광고(토스 Ads SDK 2.0) 도메인 타입
 * Rewarded R1/R2/R3 · Banner B1/B2/B3 · Interstitial I1
 * Parity: UI-001
 */

// ─── Rewarded (보상형) ────────────────────────────────────────────────────────

export type AdPlacement = 'R1' | 'R2' | 'R3';

export interface AdPlacementConfig {
  screen: string;
  description: string;
}

export const AD_PLACEMENT_CONFIG: Record<AdPlacement, AdPlacementConfig> = {
  R1: { screen: 'survey-result',   description: '설문 결과 상세 리포트 해제' },
  R2: { screen: 'dashboard',       description: '대시보드 분석 인사이트 해제' },
  R3: { screen: 'coaching-result', description: 'AI 코칭 6블록 전체 열람' },
};

export type RewardedAdState =
  | 'idle' | 'loading' | 'ready' | 'showing' | 'rewarded' | 'error' | 'no_fill';

// ─── Banner (배너) ────────────────────────────────────────────────────────────

export type BannerPlacement = 'B1' | 'B2' | 'B3';

export interface BannerPlacementConfig {
  screen: string;
  /** expanded = List형 96px / card = Feed형 410px */
  variant: 'expanded' | 'card';
  dailyLimit: number;
  description: string;
}

export const BANNER_PLACEMENT_CONFIG: Record<BannerPlacement, BannerPlacementConfig> = {
  B1: { screen: 'dashboard',       variant: 'expanded', dailyLimit: 2, description: '대시보드 로그 목록 상단' },
  B2: { screen: 'quick-log',       variant: 'card',     dailyLimit: 2, description: '빠른 기록 완료 후 피드' },
  B3: { screen: 'training-detail', variant: 'expanded', dailyLimit: 2, description: '훈련 미션 체크리스트 상단' },
};

export type BannerAdState = 'idle' | 'rendered' | 'failed' | 'no_fill';

// ─── Interstitial (전면형) ────────────────────────────────────────────────────

export type InterstitialPlacement = 'I1';

export interface InterstitialPlacementConfig {
  screen: string;
  dailyLimit: number;
  description: string;
}

export const INTERSTITIAL_PLACEMENT_CONFIG: Record<InterstitialPlacement, InterstitialPlacementConfig> = {
  I1: { screen: 'training-academy', dailyLimit: 2, description: '훈련 커리큘럼 시작 직전' },
};

export type InterstitialAdState =
  | 'idle' | 'loading' | 'showing' | 'dismissed' | 'error' | 'no_fill';

// ─── 공통 정책 ────────────────────────────────────────────────────────────────

export interface AdFallbackPolicy {
  unlock_on_no_fill: boolean;
  timeout_ms: number;
  daily_limit: number;
}

export const DEFAULT_AD_FALLBACK: AdFallbackPolicy = {
  unlock_on_no_fill: true,
  timeout_ms: 5000,
  daily_limit: 10,
};
