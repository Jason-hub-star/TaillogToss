---
name: toss-monetization-ops
description: Toss 수익화 운영 스킬 — Ads/IAP/TossPay 콘솔 설정, 샌드박스 시나리오, QA 증적 수집을 표준화.
---

# Toss Monetization Ops

인앱 광고(Ads), 인앱결제(IAP), 토스페이(TossPay)를
출시 전/운영 중 기준으로 점검하고 문서 증적까지 정리하는 스킬.

## 언제 사용하나
- “광고/IAP/TossPay 실운영 준비 상태를 점검해줘”
- “콘솔 설정부터 QA까지 누락 없이 체크리스트로 진행해줘”
- “샌드박스 결과를 게이트 문서에 동기화해줘”

## 공식 문서 (최신 우선)
- Ads Intro: `https://developers-apps-in-toss.toss.im/ads/intro.html`
- Ads Console: `https://developers-apps-in-toss.toss.im/ads/console.html`
- Ads Develop: `https://developers-apps-in-toss.toss.im/ads/develop.html`
- Ads QA: `https://developers-apps-in-toss.toss.im/ads/qa.html`
- IAP Intro: `https://developers-apps-in-toss.toss.im/iap/intro.html`
- IAP Console: `https://developers-apps-in-toss.toss.im/iap/console.html`
- IAP Develop: `https://developers-apps-in-toss.toss.im/iap/develop.html`
- IAP QA: `https://developers-apps-in-toss.toss.im/iap/qa.html`
- TossPay Intro: `https://developers-apps-in-toss.toss.im/tosspay/intro.html`
- TossPay Console: `https://developers-apps-in-toss.toss.im/tosspay/console.html`
- TossPay Develop: `https://developers-apps-in-toss.toss.im/tosspay/develop.html`
- Payment API: `https://developers-apps-in-toss.toss.im/api/makePayment.html`, `https://developers-apps-in-toss.toss.im/api/executePayment.html`, `https://developers-apps-in-toss.toss.im/api/getPaymentStatus.html`, `https://developers-apps-in-toss.toss.im/api/refundPayment.html`
- IAP Status API: `https://developers-apps-in-toss.toss.im/api/getIapOrderStatus.html`
- Framework Overview: `https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0/overview.html`
- API Integration Process(mTLS): `https://developers-apps-in-toss.toss.im/development/integration-process.html`

## 운영 순서
1. 콘솔 선행조건 확인(사업자/정산/키)
2. API 통신 선행조건 확인(mTLS/S2S)
3. 샌드박스 테스트(Ads/IAP/TossPay 분리)
4. 필수 실패 시나리오 검증
5. 로그/DB/스크린샷 증적 수집
6. 상태 문서 동기화

## 통신 선행조건 (필수)
- 앱인토스 API는 파트너 서버 -> 앱인토스 서버 구조로 호출한다.
- 토스 로그인/토스페이/IAP/기능성 메시지/프로모션은 **mTLS 기반 S2S 통신 필수**.
- BaseURL:
  - `https://apps-in-toss-api.toss.im` (로그인/프로모션/메시지 계열)
  - `https://pay-apps-in-toss-api.toss.im` (결제/환불 계열)

## Ads 체크리스트

### 콘솔/정산
- 사업자 등록 완료
- 정산 정보 검토 요청(영업일 2~3일)
- 광고 그룹 생성 후 **ID 전파 최대 2시간** 대기 고려

### 개발/정책
- 테스트 시 **테스트 ID만 사용**:
  - 전면형: `ait-ad-test-interstitial-id`
  - 보상형: `ait-ad-test-rewarded-id`
- standalone `.ait`에서는 AIT Runtime이 `process.env`를 빈 객체로 재설정한다. 실 광고 검증 빌드는 `src/lib/ads/config.ts`에 live `adGroupId` 상수 fallback을 두고, 업로드 전 `unzip -p taillog-app.ait bundle.android.0_84_0.js | rg -o "ait-ad-test-[a-z-]+-id" | wc -l` 이 `0`인지 확인한다.
- 보상형은 완료 이벤트에서만 지급
- 과노출 방지(빈도 제한/쿨다운)
- 핵심 플로우(가입/로그인/결제) 중 노출 금지

### QA
- 사전 로드 -> 지연 없는 재생 -> 정상 복귀
- 광고 재생 중 오디오 일시정지/복귀
- 중복 보상 방지(재요청/새로고침)
- 네트워크 실패 재시도/대체 플로우
- 로그-대시보드-정산 식별자 정합

## IAP 체크리스트

### 콘솔/상품
- 현금성/환가성 또는 토스포인트 결합 상품 금지
- 상품 이미지 `1024x1024`
- 공급가 범위 `400~1,400,000`, `10원 단위`
- 환불 정책 Android/iOS 차이 운영정책 반영

### 개발 핵심
- 결제: `createOneTimePurchaseOrder`
- 복원: `getPendingOrders` -> 지급 -> `completeProductGrant`
- 조회: `getCompletedOrRefundedOrders` + 서버 API(`/api-partner/v1/apps-in-toss/order/get-order-status`)
- 주문키 `orderId` 단건-단결제 원칙, 서버 영구 저장
- API 레퍼런스: `getIapOrderStatus.html`
- `processProductGrant`가 `false`를 반환하면 SDK 최종 `onEvent`를 기다리지 말고 즉시 앱 이벤트 `GRANT_FAILED`를 방출해 버튼 pending/loading을 해제한다. 이후 SDK `onEvent`가 늦게 와도 중복 방출하지 않도록 `settled` guard를 둔다.

### 샌드박스 필수 3시나리오
1. 결제 성공
2. 결제 성공 + 서버 지급 실패(복원)
3. 에러(네트워크/취소/내부오류/지급실패)

### QA
- 결제창 금액과 앱 주문 금액 일치
- 비소모품 복원 경로(재설치/기기변경) 보장
- 중복 구매/중복 지급 방지(멱등)
- 앱 재시작/백그라운드 복귀 상태 일관성
- 서버 지급 실패/프록시 실패 시 버튼이 `...` 또는 `처리 중...`으로 남지 않고 실패 피드백으로 복귀

## AI 코칭 한도/토큰 QA 패턴

AI 코칭은 수익화 정책과 직접 연결되므로 AIT 배포 전후로 FREE/토큰/PRO 계정을 분리해 검증한다.

### 정책 기준

| 사용자 상태 | 기대 limit | 기대 동작 |
|---|---:|---|
| FREE, 토큰 없음 | 1 | 첫 1회 생성 가능, 다음 생성은 한도 차단/구매 유도 |
| FREE, 토큰 N개 | `1 + min(N, 7)` | 기본 1회 초과 생성 성공 시 `ai_tokens_remaining` 1 차감 |
| PRO | 10 | PRO 블록 ④⑤⑥ 잠금 해제, PRO CTA 미노출 |

### 로컬 DEV 검증

1. FastAPI를 새 코드로 `--reload` 실행한다.
2. Metro가 로컬 FastAPI를 보는지 확인한다. `.env`가 Railway URL이면 로컬 수정이 반영되지 않을 수 있다.
3. ADB 화면의 `/coaching/result` 하단에 `오늘 0/1회 사용`이 보이는지 확인한다.
4. FastAPI 로그에 `GET /api/v1/coaching/usage/daily 200 OK`가 찍혀야 로컬 검증으로 인정한다.
5. `PRO로 더 정밀하게 보기` CTA가 무료 사용자에게 보이고, 문구가 `무료 코칭은 일반 설문과 기록 기반`이라고 안내하는지 확인한다.

### AIT/프로덕션 검증

1. 백엔드 배포가 먼저 반영됐는지 확인한다. 백엔드가 구버전이면 새 AIT도 `/coaching/result`에서 `0/3`을 표시할 수 있다.
2. 새 `.ait` 빌드/업로드 후 Metro off 상태로 정확한 `deploymentId`를 실행한다.
3. FREE 계정에서 `오늘 0/1회 사용` 확인.
4. 토큰 보유 FREE 계정에서 `오늘 0/(1+토큰)` 확인 및 추가 생성 후 DB 토큰 차감 확인.
5. PRO 계정에서 `오늘 0/10회 사용`, 블록 ④⑤⑥ 잠금 해제, PRO CTA 미노출 확인.
6. `/settings/subscription`에서 `AI 코칭 하루 10회`, `상담지 기반 정밀 코칭`, `하루 1회 + 토큰 충전`, `결제 복원` 문구를 확인한다.

## TossPay 체크리스트
- 앱인토스 전용 TossPay 키 사용(기존 일반 키 금지)
- 주문번호 중복 금지
- 계약 리드타임(영업일 7~14일) 일정 반영
- 테스트 키는 결제 생성만 가능(실승인 불가) 한계 명시

### TossPay API 매핑 (개발 기준)
- 결제 생성: `POST /api-partner/v1/apps-in-toss/pay/make-payment`
- 결제 실행: `executePayment` 레퍼런스 기준으로 분리 검증
- 결제 상태 조회: `getPaymentStatus` 레퍼런스 기준으로 폴링/조회 정책 정의
- 환불: `POST /api-partner/v1/apps-in-toss/pay/refund-payment`
- 공통 주의:
  - 요청 헤더에 `x-toss-user-key` 포함
  - `orderNo`는 파트너사 내 유일값(중복 금지)
  - 테스트 거래는 `isTestPayment=true`, 운영은 `false`

## 증적 포맷
```
Date:
Scope: ADS-001 / IAP-001 / PAY-001

Ads:
- ad_group_id:
- placement: R1/R2/R3
- result: success/fail
- evidence: screenshot, log id

IAP:
- order_id:
- success: pass/fail
- recovery: pass/fail
- error: pass/fail
- evidence: request id, DB row

TossPay:
- merchant_key_type: ait_dedicated
- order_id_uniqueness: pass/fail
- sandbox_limit_checked: pass/fail

Risks:
Next Action:
```

## 문서 반영 규칙
- 상태 요약: `docs/PROJECT-STATUS.md`
- 상세 증적: `docs/11-FEATURE-PARITY-MATRIX.md`
- 차단/미완료: `docs/MISSING-AND-UNIMPLEMENTED.md`

## Failure Modes
<!-- enrich:57c3e8f1b412 -->
- IAP 상품 이미지가 `1024x1024` 미충족이거나 현금성/환가성+토스포인트 결합 상품 등록 시 콘솔 심사에서 차단되므로, 상품 등록 전 정책 요건을 사전 점검한다.
- TossPay 테스트 키는 결제 생성만 가능하고 실승인이 불가하므로, 실 결제 플로우 E2E 검증은 운영 키 발급(영업일 7~14일) 후에만 수행 가능하다.
- Ads 광고 그룹 ID 전파는 최대 2시간 소요되므로, 그룹 생성 직후 SDK 호출 시 광고가 노출되지 않을 수 있으며 이를 결함으로 오판하지 않는다.
- Ads live ID가 `.env`와 번들 안에 보여도 런타임에서 test ID fallback될 수 있다. 실기기에서 `[광고 미리보기]`가 보이면 업로드된 `.ait`가 live 상수 fallback 빌드인지 먼저 확인한다.
- IAP Sandbox 성공 테스트에서 서버 검증이 실패하면 Toss SDK가 별도 최종 이벤트를 주지 않는 케이스가 있다. 이때 `processProductGrant=false` 시점에 직접 `GRANT_FAILED`를 emit하지 않으면 React Query mutation이 pending으로 남아 버튼 로딩이 풀리지 않는다.
- mTLS 인증서 미설정 또는 만료 시 토스 로그인/IAP/프로모션/기능성 메시지 전 계열의 S2S 호출이 연결 단계에서 실패하므로, 인증서 교체 일정을 운영 캘린더에 등록한다. (source: https://developers-apps-in-toss.toss.im/development/integration-process.html)
