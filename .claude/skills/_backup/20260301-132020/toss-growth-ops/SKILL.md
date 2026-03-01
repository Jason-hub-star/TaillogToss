---
name: toss-growth-ops
description: Toss Growth 운영 스킬 — Smart Message/Segment/Promotion/Reward/OG 설정, QA 체크, 증적 수집을 표준 순서로 수행.
---

# Toss Growth Ops

Smart Message, Segment, Promotion(토스 포인트), Reward(공유 리워드), OG 이미지를
실운영 관점에서 빠르게 점검/실행/기록하는 스킬.

## 언제 사용하나
- “스마트 발송/세그먼트/프로모션/리워드/OG를 운영 가능한 상태로 맞춰줘”
- “콘솔에서 뭘 먼저 만들고 뭘 검증해야 해?”
- “QA 체크리스트 기준으로 누락 없이 점검해줘”

## 공식 문서 (항상 최신 기준 재확인)
- Smart Message Intro: `https://developers-apps-in-toss.toss.im/smart-message/intro.html`
- Smart Message Console: `https://developers-apps-in-toss.toss.im/smart-message/console.html`
- Smart Message Develop: `https://developers-apps-in-toss.toss.im/smart-message/develop.html`
- Smart Message QA: `https://developers-apps-in-toss.toss.im/smart-message/qa.html`
- Smart Message API: `https://developers-apps-in-toss.toss.im/api/sendTestMessage.html`, `https://developers-apps-in-toss.toss.im/api/sendMessage.html`, `https://developers-apps-in-toss.toss.im/api/sendBulkMessage.html`
- Promotion QA: `https://developers-apps-in-toss.toss.im/promotion/qa.html`
- Promotion API: `https://developers-apps-in-toss.toss.im/api/getExecutionResult.html`, `https://developers-apps-in-toss.toss.im/api/executePromotion.html`, `https://developers-apps-in-toss.toss.im/api/getKey.html`
- Reward Intro: `https://developers-apps-in-toss.toss.im/reward/intro.html`
- Reward Console: `https://developers-apps-in-toss.toss.im/reward/console.html`
- Segment Intro: `https://developers-apps-in-toss.toss.im/segment/intro.html`
- Segment Console: `https://developers-apps-in-toss.toss.im/segment/console.html`
- OG: `https://developers-apps-in-toss.toss.im/marketing/open-graph.html`
- Framework Overview: `https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0/overview.html`

## 운영 순서 (권장)
1. Segment 생성/저장
2. Smart Message 캠페인 생성/검토요청/활성화
3. Smart Message API 실발송 검증
4. Promotion/Reward QA 시나리오 검증
5. OG 이미지 규격/정책 검증
6. 증적을 상태 문서(`PROJECT-STATUS`, `PARITY`, `MISSING`)로 동기화

## 핵심 체크포인트

### 1) Segment
- 조건 카테고리: 거래정보/유저정보/유저활동/유저프로파일.
- AND/OR 조합 가능.
- 예측 세그먼트는 정확도(일반적으로 50%+)와 모수 트레이드오프를 함께 기록.
- **세그먼트명은 삭제 후 재사용 불가**이므로 네이밍 규칙을 먼저 확정.
- 고정 모수 저장 여부(스냅샷 vs 최신화)를 의도적으로 선택.

### 2) Smart Message
- 캠페인 유형(광고성/기능성) 분리 운영.
- 기능성은 템플릿 코드 기반 서버 발송(API) 경로로 검증.
- 템플릿 검수 리드타임(영업일 2~3일) 고려.
- 활성화 후 테스트 발송->본발송 순서를 일정표와 함께 기록.
- API 기준:
  - 단건 발송: `sendMessage` (개발 가이드 기준 Endpoint: `/api-partner/v1/apps-in-toss/messenger/send-message`)
  - 테스트 발송: `sendTestMessage`
  - 대량 발송: `sendBulkMessage`
- QA 항목:
  - 필수 변수 치환
  - 길이/톤(타이틀 13자, 본문 20자 권장)
  - 수신 해제 경로
  - 중복 방지(멱등/쿨다운)
  - 딥링크 진입/백스택
  - 장애 복구(재시도+중복 방지)

### 3) Promotion (토스 포인트)
- QA 기준 핵심 플로우: `getKey -> executePromotion -> getExecutionResult`.
- Endpoint 매핑(개발 가이드 기준):
  - KEY 발급: `POST /api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key`
  - 지급 실행: `POST /api-partner/v1/apps-in-toss/promotion/execute-promotion`
  - 결과 조회: `POST /api-partner/v1/apps-in-toss/promotion/execution-result`
- `x-toss-user-key` 누락/변조, KEY 만료(1시간), 예산 소진, 한도 초과를 실패 시나리오로 포함.
- 동시성(연속 클릭/멀티탭)에서 1회 지급 보장 확인.
- 로깅 필드(`userKey/promotionCode/amount/txId/status`) 남기기.

### 3.1) API 안전 실행 원칙
- `/api/*.html` 레퍼런스는 문서 렌더링 방식이 자주 바뀌므로, 호출 전 `develop` 문서와 교차검증한다.
- 호출 로그에는 `templateSetCode`(메시지), `promotionCode`(프로모션), `idempotency key`(서버 내부)를 함께 남긴다.
- `resultType`이 `SUCCESS`가 아니면 즉시 재시도하지 말고 원인코드 분기 후 재실행한다.

### 4) Reward (공유 리워드)
- 리워드 이름은 운영/정산 식별 가능한 내부명으로 작성.
- 지급 단위/수량 정확히 입력.
- **리워드 ID 기준 1유저 1일 1회 발송 제한**을 QA 케이스에 포함.
- 현금성/사행성 보상 제외 정책 확인.

### 5) OG
- 규격: **1200 x 600**.
- 저화질, 과도한 텍스트, 민감/부적절 표현 금지.
- 링크 공유 노출 결과(썸네일/문구) 스크린샷 증적 확보.

## 실행 결과 기록 포맷
```
Date:
Scope: SEG/MSG/PROMO/REWARD/OG

Segment:
- name:
- logic: AND/OR
- fixed_population: true/false

SmartMessage:
- campaign_type: 광고성|기능성
- template_code:
- send_result: 200/4xx/5xx
- evidence: request_id, screenshot

Promotion:
- success_flow: pass/fail
- key_expiry: pass/fail
- duplicate_guard: pass/fail

Reward:
- reward_id:
- daily_limit: pass/fail

OG:
- size_1200x600: pass/fail
- policy_check: pass/fail

Risks:
Next Action:
```

## 문서 동기화 규칙
- 최신 증적은 `docs/PROJECT-STATUS.md`를 우선 갱신.
- 상세 로그/케이스는 `docs/11-FEATURE-PARITY-MATRIX.md`에 누적.
- 미완료/차단 항목은 `docs/MISSING-AND-UNIMPLEMENTED.md`에 단일 기준으로 반영.
