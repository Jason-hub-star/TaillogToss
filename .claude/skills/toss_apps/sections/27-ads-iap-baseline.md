Section-ID: toss_apps-27
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im

### 지원 광고 유형
| 유형 | 지원 | 용도 |
|------|------|------|
| Interstitial (전면) | ✓ | 미사용 (UX 방해) |
| **Rewarded (보상형)** | ✓ | R1/R2/R3 터치포인트 |
| Banner (배너) | ✓ | 미사용 (v1) |

### 제약 사항
- `react-native-google-mobile-ads` 직접 사용 **불가** → 토스 통합 SDK 필수
- 토스 광고 우선 노출. AdMob 폴백은 토스 SDK 공식 지원 범위에서만 허용 (미지원 시 무광고 폴백)
- 테스트 ID: `ait-ad-test-rewarded-id`

### 보상형 광고 터치포인트 (3개)
| ID | 화면 | CTA 텍스트 | 보상 |
|----|------|-----------|------|
| R1 | survey-result | "광고 보고 전체 분석 보기" | 상세 리포트 1회 해제 |
| R2 | dashboard | "광고 보고 코칭 열기" | 오늘의 코칭 1회 열기 |
| R3 | coaching-result | "광고 보고 오늘의 코칭 열기" | 잠긴 3블록(④⑤⑥) 1회 해제 |

### 전환 심리
Skeleton 블러 → TextButton("광고 보고 열기") → Rewarded 시청 → 1회 해제 → "매번 광고 귀찮다 → PRO 구독" 자연 전환

## 8. Toss + Supabase Integration Pattern
## 10. Ads SDK 2.0 ver2 — 공식 인터페이스 (2026-02 확인)

### 공식 함수 시그니처
```typescript
// 기존 v1: loadRewardedAd / showRewardedAd → 폐기
// 공식 ver2: loadFullScreenAd / showFullScreenAd + adGroupId + destroy
interface TossAdsSdk {
  loadFullScreenAd(options: { adGroupId: string }): Promise<void>;
  showFullScreenAd(): Promise<{ rewarded: boolean }>;
  isAdLoaded(): boolean;
  destroy(): void;  // cleanup — useEffect return에서 호출
}
```

- `adGroupId`: 콘솔에서 발급받는 광고 그룹 ID (기존 unitId 대체)
- `destroy()`: 광고 리소스 정리 — 컴포넌트 언마운트 시 필수 호출
- 테스트 adGroupId: `ait-ad-test-rewarded-id`

## 11. IAP SDK — 공식 결제 패턴 (2026-02 확인)

### createOneTimePurchaseOrder (일회성 구매)
```typescript
import { createOneTimePurchaseOrder } from '@apps-in-toss/framework';

const cleanup = createOneTimePurchaseOrder({
  options: { sku: 'pro_monthly' },
  processProductGrant: async (receipt) => {
    // Edge Function으로 서버 검증 + 상품 지급
    const result = await supabase.functions.invoke('verify-iap-order', {
      body: { orderId: receipt.orderId, productId: receipt.productId,
              transactionId: receipt.transactionId }
    });
    return result.data?.ok === true;  // true=완료, false=환불 트리거
  },
  onEvent: (event) => { /* PURCHASE_STARTED, PAYMENT_COMPLETED, GRANT_COMPLETED */ },
  onError: (error) => { /* 결제 에러 UI */ },
});
// cleanup() — 결제 프로세스 취소/정리
```

### 미완료 주문 복구 (앱 시작 시)
```typescript
import { getPendingOrders, completeProductGrant } from '@apps-in-toss/framework';

const pending = await getPendingOrders();
for (const order of pending) {
  await completeProductGrant(order.orderId);
}
```

### SUBSCRIPTION 상품 유형
- 토스 IAP가 **SUBSCRIPTION** 타입 공식 지원 (2026년~)
- PRO 월간을 `ONE_TIME` 반복 대신 `SUBSCRIPTION`으로 등록 가능
- 자동 갱신, 해지, 유예 기간 등 토스가 관리

### 주의
- `@apps-in-toss/framework` 패키지가 `@granite-js/react-native`에 포함인지 별도 설치인지 확인 필요
- 현재 프로젝트 package.json에 미포함 — 확인 전까지 Edge Function 직통 방식 유지

