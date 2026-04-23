# Toss Ads SDK 2.0 (통합 광고 SDK) 통합 레퍼런스

> 조사일: 2026-04-02 | 출처: 앱인토스 공식 문서 + 개발자 커뮤니티

## 1. 개요

공식 명칭: 인앱 광고 2.0 ver2 (통합 SDK)
구조: Toss Ads 우선 호출 → 인벤토리 없을 때 AdMob 자동 폴백
패키지: `@apps-in-toss/framework` (v2.0.5 이상)

## 2. 지원 광고 유형

| 유형 | 테스트 Ad Group ID | 규격 |
|------|-------------------|------|
| Interstitial (전면) | `ait-ad-test-interstitial-id` | 전체화면 |
| Rewarded (보상형) | `ait-ad-test-rewarded-id` | 전체화면 + 보상 |
| Banner — List | `ait-ad-test-banner-id` | 96px 권장 |
| Banner — Feed | `ait-ad-test-native-image-id` | 410px 권장 |

## 3. 최소 요구사항

- Fullscreen Ads: 토스앱 v5.247.0+ *(공식 2026-04-23 확인, 이전 로컬 기록 v5.244.1 → 갱신)*
- Banner Ads: 토스앱 v5.241.0+
- SDK: `@apps-in-toss/framework` v2.0.5+

### 지원 환경 사전 검사

```typescript
import { isSupported } from '@apps-in-toss/framework';
// v5.227.0 미만 → false. 광고 표시 전 차단 권장
if (!isSupported()) return null;
```

## 4. Fullscreen Ads API (Rewarded / Interstitial)

### 4-1. load → show 패턴

```typescript
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';

// Step 1: 사전 로드
const unsubLoad = loadFullScreenAd({
  options: { adGroupId: 'ait-ad-test-rewarded-id' },
  onEvent: (event) => {
    if (event.type === 'loaded') setAdReady(true);
  },
  onError: (err) => setAdReady(false),
});

// Step 2: loaded 후 표시
const unsubShow = showFullScreenAd({
  options: { adGroupId: 'ait-ad-test-rewarded-id' },
  onEvent: (event) => {
    switch (event.type) {
      case 'requested': break;
      case 'show': break;
      case 'impression': break;  // 수익 발생 시점
      case 'clicked': break;
      case 'dismissed':
        preloadNextAd();  // 다음 광고 사전 로드
        break;
      case 'failedToShow': break;
      case 'userEarnedReward':
        // 보상은 반드시 여기서만 지급
        grantReward(event.data.unitType, event.data.unitAmount);
        break;
    }
  },
  onError: (err) => console.error(err),
});
```

### 4-2. 이벤트 타입

```typescript
// loadFullScreenAd onEvent
type LoadEvent = { type: 'loaded' };

// showFullScreenAd onEvent
type ShowEvent =
  | { type: 'requested' }
  | { type: 'show' }
  | { type: 'impression' }
  | { type: 'clicked' }
  | { type: 'dismissed' }
  | { type: 'failedToShow' }
  | { type: 'userEarnedReward'; data: { unitType: string; unitAmount: number } };
```

### 4-3. 핵심 주의사항

- **동일 adGroupId**를 load/show에 사용
- **보상은 `userEarnedReward`에서만** (dismissed에서 지급 금지)
- 1개 adGroupId에 동시에 1개만 관리
- `dismissed` 직후 다음 `loadFullScreenAd` 호출 권장

## 5. Banner Ad API (InlineAd)

```tsx
import { InlineAd } from '@apps-in-toss/framework';

// List 형식 (96px)
<View style={{ width: '100%', height: 96, overflow: 'hidden' }}>
  <InlineAd
    adGroupId="ait-ad-test-banner-id"
    theme="auto"          // 'auto' | 'light' | 'dark'
    tone="blackAndWhite"  // 'blackAndWhite' | 'grey'
    variant="expanded"    // 'expanded' | 'card'
    onAdRendered={(p) => {}}
    onAdImpression={(p) => {}}
    onAdViewable={(p) => {}}
    onAdClicked={(p) => {}}
    onNoFill={(err) => {}}
    onAdFailedToRender={(err) => {}}
  />
</View>

// Feed 형식 (410px)
<View style={{ width: '100%', height: 410, overflow: 'hidden' }}>
  <InlineAd adGroupId="ait-ad-test-native-image-id" variant="card" />
</View>
```

노출 측정: `IOScrollView` 래핑 **필수** 또는 `impressFallbackOnMount={true}` 중 하나 반드시 선택.
미구현 시 impression 손실 → 광고 수익 저하.

## 6. Ad Group ID 발급 (프로덕션)

1. 콘솔 워크스페이스 Info → 사업자 정보 등록 + 정산 정보 입력
2. 심사 완료 대기 (2-3 영업일)
3. 광고 그룹 생성 → 유형 선택 → Rewarded는 보상명/수량 입력
4. 발급 후 AdMob 등록까지 최대 2시간
5. 테스트 ID → 실제 ID 교체

## 7. 광고 집행 전 필수 체크리스트

> 모든 기능 개발 완료 후, 광고 배치 확정 시 이 체크리스트를 순서대로 이행.

- [ ] `isSupported()` 호출로 v5.227.0 미만 기기 차단 처리
- [ ] AdGroup ID 콘솔 신청 (사업자 정보 + 정산 등록 → 심사 2-3 영업일)
- [ ] 테스트 ID로 load→show→impression→clicked→dismissed 플로우 검증
- [ ] 모든 `loadFullScreenAd`/`showFullScreenAd`에 `onError` 콜백 구현 확인
- [ ] 배너: `IOScrollView` 또는 `impressFallbackOnMount={true}` 적용
- [ ] noFill 폴백 동작 확인 (`unlock_on_no_fill=true` 또는 UI 조건 처리)
- [ ] 테스트 ID → 실 AdGroup ID 교체

## 8. 현재 프로젝트 갭 분석

| 항목 | 현재 (`config.ts`) | 공식 API | 갭 |
|------|-------------------|---------|-----|
| SDK 함수 | mock `createMockAdsSdk()` | `loadFullScreenAd` / `showFullScreenAd` | 전체 교체 필요 |
| 패턴 | Promise 기반 `.then()` | 이벤트 콜백 기반 `onEvent` | `useRewardedAd.ts` 리팩토링 필요 |
| Ad Group ID | 하드코딩 테스트 ID | 콘솔 발급 실제 ID | 콘솔 심사 후 교체 |
| 배너 | 미사용 | `InlineAd` 컴포넌트 | 광고 배치 확정 시 추가 |
| 환경 검사 | 없음 | `isSupported()` | 광고 표시 전 호출 필요 |
| 배너 노출 측정 | 미구현 | `IOScrollView` or `impressFallbackOnMount` | 배너 도입 시 반드시 구현 |

## Sources

- [인앱 광고 2.0 ver2 오픈](https://techchat-apps-in-toss.toss.im/t/2-0-ver2-sdk/2618)
- [IntegratedAd API 공식](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/IntegratedAd.html)
- [RN BannerAd API 공식](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B4%91%EA%B3%A0/RN-BannerAd.html)
- [광고 콘솔 가이드](https://developers-apps-in-toss.toss.im/ads/console.html)
