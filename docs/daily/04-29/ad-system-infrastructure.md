# 인앱 광고 7슬롯 인프라 (2026-04-29)

Parity: AD-001

## 완료 항목

- [x] `src/types/ads.ts` — BannerPlacement B1/B2/B3, InterstitialPlacement I1, BANNER_PLACEMENT_CONFIG, INTERSTITIAL_PLACEMENT_CONFIG 추가
- [x] `src/lib/ads/config.ts` — 전 슬롯(R1~R3, B1~B3, I1) adGroupId 매핑, `isMockMode()` 신규
- [x] `src/lib/hooks/useBannerAd.ts` — 신규 (일일 한도, impression 추적)
- [x] `src/lib/hooks/useInterstitialAd.ts` — 신규 (load→show→dismissed, handled 플래그, 타임아웃 폴백)
- [x] `src/components/shared/ads/BannerAd.tsx` — 신규 (InlineAd 래퍼, 테스트 ID → 목업 자동 전환)
- [x] `src/components/shared/ads/InterstitialAd.tsx` — 신규 (render-prop 패턴)
- [x] `src/components/shared/ads/index.ts` — barrel export
- [x] `src/lib/analytics/tracker.ts` — `ad_impression`, `ad_dismissed` 이벤트 추가
- [x] `docs/ref/AIT-ADS-CONSOLE-GUIDE.md` — 콘솔 등록 가이드 신규
- [x] `docs/ref/AIT-ADS-SDK-REFERENCE.md` — 섹션 8 현황 갱신

## 슬롯 연결 현황

- [x] R2: `analysis.tsx` — `<RewardedAdButton placement="R2" />` (2026-04-29 완료)
- [x] B1: `dashboard/index.tsx` — `<BannerAd placement="B1" />` (2026-04-29 완료)
- [ ] B2: `quick-log.tsx` — `<BannerAd placement="B2" />` (⏳ 대기)
- [ ] B3: `training/detail.tsx` — `<BannerAd placement="B3" />` (⏳ 대기)
- [ ] I1: `training/academy.tsx` — `<InterstitialAd placement="I1" onProceed={...}>` (⏳ 대기)

## 콘솔 등록 대기 슬롯

| 슬롯 | 그룹명 | 환경변수 |
|---|---|---|
| R1 | 보상형-설문결과 | `AIT_AD_R1` |
| R2 | 보상형-분석대시보드 | `AIT_AD_R2` |
| R3 | 보상형-코칭결과 | `AIT_AD_R3` |
| B1 | 배너-대시보드홈 | `AIT_AD_B1` |
| B2 | 배너-빠른기록 | `AIT_AD_B2` |
| B3 | 배너-훈련상세 | `AIT_AD_B3` |
| I1 | 전면형-훈련시작 | `AIT_AD_I1` |

## 검증

- tsc: 0 errors
- 자기리뷰: MUST 0건, SHOULD 3건 모두 수정 완료
