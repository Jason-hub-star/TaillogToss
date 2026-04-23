# 토스 IAP / Smart Message / 포인트 API 레퍼런스

> 조사일: 2026-04-02 | 출처: 앱인토스 공식 문서 + 개발자 커뮤니티

## 0. 공통 전제: mTLS + Base URL

- **모든 S2S API는 mTLS 필수** (`client.crt` + `client.key`)
- Base URL: `https://apps-in-toss-api.toss.im`
- 공통 prefix: `/api-partner/v1/apps-in-toss`
- Rate Limit: **3,000 QPM** (기본)

공통 응답:
```json
{ "resultType": "SUCCESS", "success": { ... } }
{ "resultType": "FAIL", "error": { "errorCode": "string", "reason": "string" } }
```

---

## 1. IAP (인앱결제)

### 1-1. 전체 플로우

```
클라이언트                    파트너 서버              토스 서버
  │ ① getProductItemList()     │                        │
  │ ② createOneTimePurchase    │                        │
  │   └ processProductGrant()  │                        │
  │         │ ③ 검증 요청      │                        │
  │         │─────────────────►│ ④ GET /iap/order (S2S) │
  │         │                  │────────────────────────►│
  │         │                  │◄────────────────────────│
  │         │ ⑤ return true    │                        │
  │         │◄─────────────────│                        │
  │ ⑥ 결제 완료               │                        │
  │ ⑦ getPendingOrders() [복원]│                        │
```

### 1-2. 클라이언트 SDK (5종)

#### getProductItemList()
```typescript
IAP.getProductItemList(): Promise<{ products: IapProductListItem[] } | undefined>

interface IapProductListItem {
  sku: string;
  displayName: string;
  displayAmount: string;  // "1,000원" (통화 포함)
  iconUrl: string;
  description: string;
}
```

#### createOneTimePurchaseOrder()
```typescript
IAP.createOneTimePurchaseOrder({
  sku: string,
  processProductGrant: (params: { orderId: string }) => boolean | Promise<boolean>,
  // 30초 이내 반환 필수. 초과 시 환불 안내
  onEvent: (event: { type: string; result: PurchaseResult }) => void,
  onError: (error: IapError) => void,
}): () => void  // cleanup 함수 — 반드시 호출 (메모리 누수 방지)
// 사용 예: const cleanup = IAP.createOneTimePurchaseOrder(...); return () => cleanup();
// ⚠ onEvent.result(PurchaseResult)는 PAYMENT_COMPLETED 이후 이벤트부터만 포함

interface PurchaseResult {
  orderId: string;
  displayName: string;
  displayAmount: string;
  amount: number;
  currency: string;
  fraction: number;
  miniAppIconUrl: string;
}
```

#### getPendingOrders() — 복원
```typescript
IAP.getPendingOrders(): Promise<{ orders: Order[] } | undefined>
// 최소: Android 5.235.0 / iOS 5.231.0

interface Order {
  orderId: string;
  sku: string;
  paymentCompletedDate: string;
}
```

#### completeProductGrant()
```typescript
IAP.completeProductGrant({ params: { orderId: string } }): Promise<boolean | undefined>
// 최소: Android 5.233.0 / iOS 5.233.0
```

#### getCompletedOrRefundedOrders()
```typescript
IAP.getCompletedOrRefundedOrders({ key?: string | null }): Promise<{
  hasNext: boolean;
  nextKey?: string;
  orders: { orderId: string; sku: string; status: 'COMPLETED' | 'REFUNDED' }[];
} | undefined>
// 페이지당 최대 50건. 최소: Android 5.231.0 / iOS 5.231.0
```

### 1-3. S2S 주문 상태 조회

```
POST /api-partner/v1/apps-in-toss/order/get-order-status
Headers: Content-Type: application/json, x-toss-user-key: {userKey}
Body: { "orderId": "uuid-v7" }
```

| 상태 | 의미 |
|------|------|
| `PURCHASED` | 결제 + 지급 완료 |
| `PAYMENT_COMPLETED` | 결제 완료, 지급 미완료 |
| `FAILED` | 결제 실패 |
| `REFUNDED` | 환불 |
| `ORDER_IN_PROGRESS` | 처리 중 |
| `NOT_FOUND` | 주문 없음 |

### 1-4. SDK 에러 코드

| 코드 | 설명 |
|------|------|
| `INVALID_PRODUCT_ID` | 미등록 SKU |
| `PAYMENT_PENDING` | 진행 중인 결제 있음 |
| `USER_CANCELED` | 사용자 취소 |
| `PRODUCT_NOT_GRANTED_BY_PARTNER` | 파트너 서버 지급 실패 |
| `NETWORK_ERROR` | 네트워크 오류 |
| `TOSS_SERVER_VERIFICATION_FAILED` | 서버 검증 실패 |

### 1-5. 구독 API

별도 구독 전용 API 공개 명세 없음. 콘솔에서 SKU 등록 시 상품 유형(소모성/비소모성/구독) 구분. 동일 `createOneTimePurchaseOrder` 플로우 사용.

### 1-6. 복원 플로우

```
① getPendingOrders() → 미지급 주문 목록
② 각 orderId 서버 측 지급 처리
③ completeProductGrant({ params: { orderId } })

⚠ Sandbox에서는 getPendingOrders() 후 completeProductGrant()해도
  주문이 남아있을 수 있음 (SDK 2.0.5 알려진 현상). 프로덕션 정상.
```

---

## 2. Smart Message

### 2-1. 신청/승인 프로세스

```
콘솔 → 워크스페이스 → 미니앱 → 스마트 발송
→ 템플릿 등록 (templateSetCode 발급)
→ 검토 요청 (2-3 영업일)
→ 승인 후 발송 가능
```

- 워크스페이스당 **10만 건/회** 상한
- 광고성: 오전 5시 전 활성화 → 오전 8시 테스트, 오후 3시 본 발송

### 2-2. 기능성 메시지 발송 API

```
POST /api-partner/v1/apps-in-toss/messenger/send-message
Headers: Content-Type: application/json, x-toss-user-key: {userKey}
```

```json
{
  "templateSetCode": "vivarepublica_hello_world",
  "context": {
    "storeName": "비바리퍼블리카",
    "greetDate": "2025년 01월 20일 15시 30분"
  }
}
```

- `userName`은 자동 주입 (별도 입력 불필요)

응답:
```json
{
  "resultType": "SUCCESS",
  "result": {
    "msgCount": 1,
    "sentPushCount": 1,
    "sentInboxCount": 0,
    "sentSmsCount": 0,
    "detail": { "sentPush": [{ "contentId": "toss:PUSH~~~~" }] },
    "fail": { "sentPush": [] }
  }
}
```

---

## 3. 토스 포인트 지급

### 3-1. 3-step 플로우

```
Step 1. Grant Key 발급
  POST /points/grant-key → { grantKey, expiresAt }
  ⚠ grantKey는 1회만 사용 가능

Step 2. 포인트 지급
  POST /points/grant → { executionId }
  body: { grantKey, userId, points, reasonCode }

Step 3. 결과 조회
  GET /points/grant-result/{executionId}
  → { status: 'SUCCESS'|'FAILED', transactionId }
```

### 3-2. 게임 미니앱 SDK 방식

```typescript
grantPromotionRewardForGame({
  params: { promotionCode: string, amount: number }
}): Promise<{ key: string } | { errorCode: string; message: string } | 'ERROR' | undefined>
// 최소: 토스앱 v5.232.0
```

### 3-3. 에러 코드

| 코드 | 의미 |
|------|------|
| `4100` | 프로모션 정보 없음 |
| `4109` | 키 재사용 또는 미실행 |
| `4112` | 예산 부족 |
| `4114` | 1회 한도 초과 (최대 **5,000포인트/회**) |
| `4116` | 최대 지급 한도 초과 |

---

## 4. mTLS 엔드포인트 전체 목록

| API | 경로 | Method |
|-----|------|--------|
| 토큰 발급 | `/user/oauth2/generate-token` | POST |
| 사용자 정보 | `/user/oauth2/login-me` | GET |
| IAP 주문 검증 | `/iap/verify-order` | POST |
| IAP 주문 조회 | `/order/get-order-status` | POST |
| Smart Message | `/messenger/send-message` | POST |
| 포인트 Key | `/points/grant-key` | POST |
| 포인트 지급 | `/points/grant` | POST |
| 포인트 결과 | `/points/grant-result/{id}` | GET |

---

## 5. IAP 집행 전 필수 체크리스트

> 퍼블리싱 전 반드시 이행. 교차검증일: 2026-04-23 (Opus).

- [ ] `createOneTimePurchaseOrder()` cleanup 함수 호출 여부 코드 확인 (`src/lib/api/iap.ts`)
- [ ] Sandbox 3종 시나리오 테스트:
  - 테스트1: 결제 성공 + 지급 완료 (happy path)
  - 테스트2: 결제 성공 + 서버 지급 실패 → `getPendingOrders` 복원 + `completeProductGrant`
  - 테스트3: 에러 처리 (네트워크 오류, 사용자 취소, 타임아웃)
- [ ] 기기 변경 후 구매내역 보존 확인 (Toss Login 기반 주문 상태 영구 유지)
- [ ] mTLS 실 인증서 전환 (`verify-iap-order` Edge Function)

## 6. TaillogToss 구현 갭

> Last updated: 2026-04-23

| 항목 | 현재 구현 | 공식 API | 갭 | 상태 |
|------|----------|---------|-----|------|
| IAP verify | mock mTLS (`buildVerificationResponse`) | S2S `POST /iap/verify-order` | mTLS 실 인증서로 전환 | 🔴 미완 |
| IAP restore | `getPendingOrders` → DB 대체 | `getPendingOrders` → `completeProductGrant` | `completeProductGrant()` 호출 추가 (IAP-001-REV2) | 🔴 미완 |
| Smart Message 경로 | ~~`/smart-message/send`~~ → `/messenger/send-message` | S2S `POST /messenger/send-message` | ✅ 수정 완료 (2026-04-21) | ✅ |
| Smart Message 기타 | mock mTLS, 쿨다운 구현 완료 | 템플릿 승인 필요 | 템플릿 승인 + mTLS 전환 | 🔴 미완 |
| 포인트 지급 | mock 3-step | S2S grant-key → grant → result | mTLS 전환 | 🔴 미완 |
| processProductGrant 30초 타임아웃 | ~~무제한 대기~~ | 30초 이내 반환 필수 | ✅ index.ts 25s + main.ts 29s 타임아웃 추가 (2026-04-21) | ✅ |
| SDK 시그니처 정렬 | ~~options.sku, (receipt), onEvent(string)~~ | `sku`, `{ orderId }`, `{ type, result }` | ✅ 수정 완료 (2026-04-21) | ✅ |
| `onEvent.result` | ~~없음~~ | `PurchaseResult` 포함 | ✅ mock PurchaseResult 추가 (2026-04-21) | ✅ |

## Sources

- [IAP 공식](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EC%9D%B8%EC%95%B1%20%EA%B2%B0%EC%A0%9C/IAP.html)
- [IAP 개발하기](https://developers-apps-in-toss.toss.im/iap/develop.html)
- [API 사용하기](https://developers-apps-in-toss.toss.im/api/overview.html)
- [Smart Message 이해하기](https://developers-apps-in-toss.toss.im/smart-message/intro.html)
- [Smart Message 콘솔](https://developers-apps-in-toss.toss.im/smart-message/console.html)
- [Smart Message 개발하기](https://developers-apps-in-toss.toss.im/smart-message/develop.html)
- [grantPromotionRewardForGame](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EA%B2%8C%EC%9E%84/grantPromotionRewardForGame.html)
