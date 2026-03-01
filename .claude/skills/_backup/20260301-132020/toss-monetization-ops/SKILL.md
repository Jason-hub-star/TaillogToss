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

### 샌드박스 필수 3시나리오
1. 결제 성공
2. 결제 성공 + 서버 지급 실패(복원)
3. 에러(네트워크/취소/내부오류/지급실패)

### QA
- 결제창 금액과 앱 주문 금액 일치
- 비소모품 복원 경로(재설치/기기변경) 보장
- 중복 구매/중복 지급 방지(멱등)
- 앱 재시작/백그라운드 복귀 상태 일관성

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
