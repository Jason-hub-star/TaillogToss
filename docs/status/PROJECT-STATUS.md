# TaillogToss Project Status

Last Updated: 2026-02-28 22:34 (KST)
Owner Doc: `CLAUDE.md` (슬림 인덱스), 본 문서는 상태/이력 상세 전용.

## Edge Function 상태

| 함수 | 버전 | verify_jwt | 상태 |
|------|------|-----------|------|
| `login-with-toss` | v13 | false | Sandbox 실기기 200 + 실패 400 증적 확보 |
| `verify-iap-order` | v12 | false | 실기기 `POST 200` + `toss_orders` 영속화(5건) 확인 |
| `send-smart-message` | v9 | true | mock mTLS, 우회차단 검증 완료 |
| `grant-toss-points` | v9 | true | mock mTLS, 우회차단 검증 완료 |
| `legal` | v9 | false | 4종 HTML 서빙 |
| `toss-disconnect` | v10 | false | Basic Auth 동작, 콘솔 콜백 대기 |
| `generate-report` | v4 | true | mock/real 스위치, 우회차단 검증 완료 |

## Parity ID 추적 (요약)

| Parity ID | 도메인 | 상태 | 완료 항목 | 잔여 |
|-----------|--------|------|----------|------|
| AUTH-001 | 인증 | In Progress | login.tsx, AuthContext, usePageGuard, login-with-toss v13, 실기기 200/400 증적 | 실패 케이스 앱 화면 증적 정리 |
| APP-001 | 앱 셸 | In Progress | 23라우트, _app.tsx, 레이아웃 5종, 딥엔트리 3종 | 실기기 라우팅 완전 검증 |
| UI-001 | 디자인 | In Progress | 52컴포넌트, 토큰 중앙화 70+파일, Lottie 3종, 상태UI 8화면 | 실기기 비주얼 QA |
| LOG-001 | 행동 기록 | In Progress | 대시보드/빠른기록/상세기록/분석, backend-first 전환 | FastAPI 로그 API 실기기 E2E |
| AI-001 | AI 코칭 | In Progress | 6블록 코칭, 피드백, BE-P5 완료, backend-first 전환 | FastAPI 코칭 API 실연동 E2E |
| IAP-001 | 결제 | In Progress | 구독 화면, useIsPro, verifyAndGrant, Edge v12, iap.test 9케이스, 서버 3시나리오+복구 재검증 증적 + DB 영속(5건) 확인 | 실기기 결제 UI 3시나리오 증적 정리 |
| MSG-001 | 알림 | In Progress | Edge v9, 쿨다운, noti_history 영속, 우회차단, 테스트 통과 | Smart Message 신청/승인 완료 후 Sandbox 실발송 |
| AD-001 | 광고 | Done | 타입, mock SDK, useRewardedAd, R1/R2/R3 통합, test 5케이스 | 실 Ad Group ID 교체 + Sandbox 검증 |
| B2B-001 | B2B 운영 | In Progress | P1~P7, 스키마 정합, roleGuard test 8케이스, BE-P7 | 40마리 FlatList 성능, 공유 링크, B2C 회귀, verify_parent_phone RPC |
| REG-001 | 등록 | Done | legal, toss-disconnect, mTLS 구현, 약관 2종, 사업자등록/배포 완료 | 콘솔 테스트 콜백 검증 |

## Phase 진행 현황

| Phase | 상태 | 비고 |
|-------|------|------|
| 1~10 | Done | FE 전체 완료 |
| 11 | Done | 보안(mTLS, rate-limit, pii) 완료 |
| 12 | Done | 광고 SDK mock 적용 |
| 13 | In Progress | IAP/MSG/AD E2E 잔여 |
| B2B | Done | 코드/문서 정합 완료, 성능/실기기 검증 대기 |
| REG | Done | legal + toss-disconnect + 약관 페이지 완료 |
| BE | Done | BE-P1~P8 완료 (12모듈, 60+ endpoints, pytest 39 pass) |
| INFRA-1 | Done | DB 26->38 + RLS 적용 |

## 현재 상태판

| 도메인 | 상태 | 남은 것 |
|--------|------|---------|
| FE->BE 연결 | 완료 | LAN IP direct 성공, 307 trailing slash 수정 |
| AUTH | 진행 | 실기기 200/400 증적 확보, 문서/스크린샷 정리 |
| IAP | 진행 | 앱 UI 기준 결제/복구/실패 3시나리오 증적 정리 |
| MSG | 진행 | Smart Message 신청/승인 대기 + Sandbox 실발송 미검증 |
| AD | 진행 | 실 Ad Group ID 교체 + 실노출 미검증 |
| UI | 진행 | 실기기 비주얼 QA |
| Edge 7종 | 진행 | happy-path payload 실검증 잔여 |
| BE (FastAPI) | 완료 | - |
| DB (INFRA-1) | 완료 | - |
| mTLS | 진행 | real 인증서/콘솔 등록 필요 |

## Mock/Placeholder 목록

| 항목 | 위치 | 전환 필요 |
|------|------|----------|
| Ads SDK | `src/lib/ads/config.ts` | 실 Ad Group ID 교체 |
| IAP 래퍼 | `src/lib/api/iap.ts` | 실 SDK 교체 |
| generate-report | `supabase/functions/generate-report/` | `REPORT_AI_MODE=real` + 실 OpenAI 키 |
| verify-iap-order | `supabase/functions/verify-iap-order/` | real mTLS 전환 |
| send-smart-message | `supabase/functions/send-smart-message/` | real mTLS 전환 |
| grant-toss-points | `supabase/functions/grant-toss-points/` | real mTLS 전환 |
| IAP 복원 | `src/lib/api/subscription.ts:62` | Toss IAP 복원 API 공개 대기 |

## 테스트 현황

| 구분 | 상태 | 수치 |
|------|------|------|
| FE 단위 | 완료 | 77 tests, 21 suites |
| BE 단위 | 완료 | pytest 39 tests |
| Edge 단위 | 완료 | 30 tests, 12 suites |
| BE<->DB 통합 | 미구현 | FastAPI + 실 Supabase 연결 테스트 필요 |
| E2E | 부분 | 로그인 + Edge smoke, IAP/AD happy-path 미검증 |
| 성능 | 미구현 | 40마리 FlatList, API p95 < 300ms |

## 크리티컬 패스 블로커

### CRITICAL
1. Edge Function real mTLS (INFRA-3): 인증서 발급/등록

### HIGH
2. IAP E2E 테스트 (Sandbox 결제 플로우)
3. B2B RPC 함수 (`verify_parent_phone_last4`)
4. Ads 실 Ad Group ID 교체 + 검증

## 최신 AUTH 증적 (2026-02-28)

- Success (v13): `POST 200`, request id `7d1d5729-3f4c-40d6-b36b-5ccbde2fd1ea`
- Failure (v13): `POST 400`, `sb-request-id: 019ca3c4-574a-7404-a9ae-35eb88927194`
- Failure body: `VALIDATION_ERROR`, `nonce must be at least 8 chars`
- 관련 로그 ID: `4e0bd4f2-989f-4b95-b3f7-4a740d161531`

## 최신 IAP 증적 (2026-02-28)

- Success (verify-iap-order v9): `POST 200`, `sb-request-id: 019ca3c9-3303-7426-a038-a4fafddefd8d`
  - payload 결과: `toss_status=PAYMENT_COMPLETED`, `grant_status=granted`
  - 로그 ID: `8cc19186-67ff-4eea-ab40-006c21ea2aad`
- Failure (verify-iap-order v9): `POST 200`, `sb-request-id: 019ca3c9-5c85-70f6-aebd-2bc1650e6819`
  - payload 결과: `toss_status=FAILED`, `grant_status=grant_failed`, `error_code=IAP_VERIFY_FAILED`
  - 로그 ID: `c0432d8d-5b32-400e-bc11-bbd9f2eb87e4`
- Recovery/Retry (verify-iap-order v9): `POST 200`, `sb-request-id: 019ca3c9-924d-70e3-95a3-d236dc9ceaab`
  - payload 결과: `toss_status=PAYMENT_COMPLETED`, `grant_status=granted` (retry-500 패턴 복구)
  - 로그 ID: `00e8cf39-b76e-4b25-9eee-06ad0519fe18`
- 코드 보정: `src/lib/api/iap.ts` `verifyAndGrant()`가 Edge envelope(`data.grant_status`)를 우선 해석하도록 수정, `grant_failed`를 실패로 판정.
- 실기기 재검증 이슈: `2026-02-28 19:33~19:34 KST` 앱 구매 직후 `verify-iap-order` `POST 401` 4건 확인
  - 로그 ID: `b68b5d55-4f87-4dc0-99f3-6dae74012730`, `dbc59d87-c701-4da0-ab28-170ea9b38762`, `68a4d398-8519-461a-a1e5-3d2e699a90a8`, `f7add8f7-e277-40a0-a98b-a67b1d385f70`
  - 조치: `verify-iap-order` 호출에 Authorization 헤더 명시 + 401 시 세션 refresh 후 1회 재시도 로직 적용 (`src/lib/api/iap.ts`, `src/lib/api/subscription.ts`)
- 실기기 재검증 이슈(2차): `2026-02-28 19:35:40~19:35:45 KST`에도 `verify-iap-order` `POST 401` 3건 재발
  - 직전 `login-with-toss`는 `2026-02-28 19:35:31 KST` `POST 200` 성공
  - 로그 ID: `3b634bf1-5bc4-4404-8421-a410ac7dd33a`, `f59eae8e-167c-4fc4-ac49-74029903385e`, `aaef0f90-9a12-44a1-8769-d0cfca8fe6a8`
  - DB 확인: `public.toss_orders` 최신 조회 결과 `[]` (주문 반영 없음)
- 실기기 재검증 이슈(3차): `2026-02-28 19:51:36~19:51:44 KST`에도 `verify-iap-order` `POST 401` 6건 재발
  - 직전 `login-with-toss`는 `2026-02-28 19:51:26 KST` `POST 200` 성공
  - 로그 ID: `fc267cb5-6370-4447-aba9-c3d3e0f548d9`, `05143802-211c-40e7-8f53-b029208ebc77`, `4f042658-c507-40b0-b87f-dcce7f40b96f`, `9dd35795-6e88-4552-9a70-066151534b59`, `b88626a2-d379-4835-9920-78cc5c7ed36f`, `bc74c1a7-cf38-4272-bb65-79058d1995b1`
  - 조치 추가: invoke 2회 연속 401 시 직접 `fetch`(apikey + Authorization 명시) fallback 적용 (`src/lib/api/iap.ts`, `src/lib/api/subscription.ts`)
- 실기기 재검증 이슈(4차): 앱에서 `401 error payload invalid jwt` 확인
  - 원인 가정: 세션 JWT 누락/비정상 상태에서 `verify_jwt=true` 함수 호출
  - 조치 추가: 호출 전 JWT 형식 검증(3-segment) + 세션이 없거나 비정상이면 호출 자체 차단 (`IAP_AUTH_SESSION_MISSING_OR_INVALID_JWT`)
- 실기기 재검증 이슈(5차): `2026-02-28 20:14:22~20:14:41 KST`에도 `login-with-toss` `POST 200` 직후 `verify-iap-order` `POST 401` 반복
  - 로그인 로그 ID: `37420b58-7f13-41bc-85e3-6f43356c6a92`
  - 401 로그 ID(예): `743ca296-21b2-46f2-8a33-78f007ebf3c1`, `7450c601-6f2a-4a2d-8276-6620c73d1eca`, `cde511ee-793d-430a-b5db-8786c35e7891`, `9732098c-cccb-4cb1-a77e-e0bd3c2ec573`, `78ec772a-33c9-44fa-b7f8-b19374160442`
  - DB 확인: `public.toss_orders` 집계 결과 `order_count=0`, `latest_created_at=null`
  - 조치 추가: 401 재시도에서 `refreshedToken`을 그대로 쓰지 않고 JWT 형식 + `supabase.auth.getUser()` 검증 통과 시에만 사용, 실패 시 1차 검증 토큰만 재사용하도록 수정 (`src/lib/api/iap.ts`, `src/lib/api/subscription.ts`)
- MCP 재검증(2026-02-28 20:58:36 KST):
  - `verify-iap-order` 현재 배포 버전은 `v10`, 설정은 `verify_jwt=false` (gateway JWT 검증 우회 후 함수 내부 검증 방식).
  - 같은 시각 Edge `verify-iap-order` `POST 401` 1건은 Auth 로그에서 `/auth/v1/user` `403 bad_jwt` (`invalid claim: missing sub claim`)와 1:1 매칭됨.
  - 해석: v10 401 1건은 사용자 세션 JWT가 아닌 잘못된 bearer(진단 호출) 케이스로 확인됨. 아직 실기기 구매 트래픽의 v10 호출 증적(200/403)은 추가 확보 필요.
- 실기기 재검증 이슈(6차): `2026-02-28 21:03:25~21:05:12 KST` 구간 `verify-iap-order v10` `POST 403` 반복
  - 직전 `login-with-toss`는 `POST 200` 유지, Auth `/auth/v1/user`도 `200` 유지(세션 JWT 유효)
  - 원인: JWT role이 `authenticated`인데 함수는 앱 역할(`user/trainer/org_owner/org_staff/service_role`)만 허용해 권한 거부
  - 조치: `verify-iap-order v11` 배포(2026-02-28 21:11 KST)
    - `authenticated` 세션 허용(단, `orgId`/`trainerUserId` 포함 요청은 계속 403 차단)
    - 요청 body `userId` 무시, 검증된 JWT 사용자 id만 주문 사용자로 사용
    - 설정 유지: `verify_jwt=false`, 함수 내부 `/auth/v1/user` 검증
  - 상태: v11 ACTIVE 확인 완료, v11 실기기 호출 증적(200/403) 추가 수집 필요
- 조치 추가(2026-02-28 21:15 KST): `verify-iap-order v12` 배포
  - `toss_orders` REST upsert 추가(`on_conflict=idempotency_key`, `resolution=merge-duplicates`)
  - 호출 JWT(사용자 토큰)로 RLS(`user_id=auth.uid`)를 통과해 주문 이력 영속화
  - 응답도 DB 저장 결과(`id/created_at/updated_at`) 기준으로 반환하도록 변경
  - 상태: v12 ACTIVE 확인 완료, 배포 직후 기준 `order_count=0`
- MCP 재검증(2026-02-28 21:17 KST):
  - `verify-iap-order v12` 실기기 호출 `POST 200` 2건 확인 (로그 ID: `606b960d-729a-49aa-a425-77867e7eadd5`, `e9edb63f-d893-483d-9a45-93bd94833afa`)
  - DB 집계: `public.toss_orders` `order_count=2`, `latest_order_at=2026-02-28 21:17:26 KST`
  - 해석: 서버 검증/영속 경로 정상 동작 확인. 잔여는 앱 UI 증적(결제/복구/실패) 정리.
- MCP 재검증(2026-02-28 22:31 KST):
  - `verify-iap-order v12` 추가 `POST 200` 3건 확인 (로그 ID: `2af98cee-4c5d-488a-b9f2-252ad69d2005`, `868dd7a9-1f02-4f32-b22a-5a8fd8684c86`, `52192480-adc5-45a6-931f-c94cfe499231`)
  - DB 집계: `public.toss_orders` `order_count=5`, `latest_order_at=2026-02-28 22:31:22 KST`
  - 해석: 복구 시나리오 포함 서버 검증/영속 경로 정상. 잔여는 앱 UI 3시나리오 증적 정리.

## 비고

- 세션 운영 원칙: 완료된 상세 항목은 `CLAUDE.md`에 장문으로 누적하지 않고 본 문서 또는 도메인 기록 문서로 이동한다.
