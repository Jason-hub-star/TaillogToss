<!-- DogCoach -> Toss RN 기능 이식 추적 매트릭스 -->
<!-- 모든 구현 작업은 Parity ID 기준으로 추적한다. -->
# 11. Feature Parity Matrix

## 1) 상태 정의

- `Not Started`
- `In Progress`
- `Blocked`
- `Done`
- `Deferred`

## 1.1) 공통 계약

- `UserRole` 표준: `user | trainer | org_owner | org_staff`
- 광고 배치 계약: `R1=survey-result`, `R2=dashboard`, `R3=coaching-result`
- 하나의 Phase에서 여러 Parity를 동시에 진행할 수 있으나, `Done` 판정은 Parity ID별 검증 근거로 개별 처리한다.

## 2) 매트릭스

| Parity ID | Domain | DogCoach Source | TaillogToss Target | Change Type | Status | Test Scope | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Auth | Supabase OAuth + guest | Toss Login bridge + Supabase session | rewrite | In Progress | integration/e2e | High | `[x] login.tsx appLogin 연동` `[x] AuthContext + useAuth` `[x] authGuard + onboardingGuard` `[x] usePageGuard 19개 페이지 적용` `[x] login-with-toss Edge Function(real/mock 전환) + v11 deploy` `[x] rateLimiter/piiGuard/pepperRotation` `[x] PII 복호화 키 secret 등록` `[x] mTLS cert/key secret 등록(digest 일치)` `[x] Toss Sandbox E2E (실 authCode 200, req: f52019d7..., 92de76c2...)` `[x] auth.test.ts 7케이스 (loginWithToss 실패 경로 + setSessionFromBridgeResponse)` `[x] 2026-02-28 uuid user_id 블로커 수정 (session bridge + public.users upsert + dogs/dog_env RLS write)` `[x] login-with-toss v12 재배포 완료 (MCP)` `[x] stale authCode 실패증적(POST 502 invalid_grant, sb-request-id: 019ca2e9-6ed2-75a6-acfc-ce361eb9f6eb)` `[ ] fresh authCode로 happy-path 200 재증적 (실기기)` |
| APP-001 | App Shell | Next.js App Router | RN file-based routing app shell | rewrite | In Progress | unit/manual | Medium | `[x] 23라우트 + _app.tsx 프로바이더(Granite.registerApp)` `[x] 레이아웃 5종` `[x] 딥엔트리 3종` `[x] SurveyContext` `[x] dog/profile.tsx 실 구현 (TextField×4+Switch+Accordion×3+삭제)` `[x] dog/add.tsx 실 구현 (이름/품종/성별 + 멀티독)` `[x] Sandbox 앱 로컬 진입/라우팅 검증(로그: /_404,/login,/onboarding/welcome,/onboarding/survey)` |
| UI-001 | Design System | Tailwind/Radix/Framer Motion | TDS React Native | rewrite | In Progress | visual/manual | High | `[x] TDS-ext 6 + shared 8 + features 38 = 52컴포넌트` `[x] 23개 화면 전체 빌드` `[x] tsc 통과` `[x] ChartWebView 실제 @granite-js/native/react-native-webview 연결` `[ ] 실기기 비주얼 QA` |
| LOG-001 | Behavior Log | ABC 기록 폼(웹) | RN 기록 화면 + 바텀시트 | adapt | In Progress | unit/manual | Medium | `[x] 대시보드 + 빠른기록 + 상세기록 + 분석` `[x] ABCForm + QuickLogForm` `[x] log API backend-first + supabase fallback 전환` `[ ] FastAPI 로그 API 실기기 E2E 검증` |
| AI-001 | AI Coaching | 기존 FastAPI 코칭 API | RN API client + hook 재사용 | adapt | In Progress | unit/integration | High | `[x] 코칭 6블록 (Free 3 + PRO 3)` `[x] 피드백 별점 useSubmitFeedback` `[x] Backend BE-P5 완료 (AI 6블록 생성 + 예산 게이팅 + 룰 폴백)` `[x] Backend 12모듈 60+ endpoints (BE-P1~P8 전체 완료)` `[x] Supabase DB 38테이블 마이그레이션 적용 (INFRA-1)` `[x] FE→BE HTTP 클라이언트 연결 (backend.ts)` `[x] coaching API backend-first + supabase fallback 전환` `[ ] FastAPI 코칭 API 실 연동 검증` |
| IAP-001 | Billing | Stripe placeholder | Toss IAP + verify-iap-order | rewrite | In Progress | integration/e2e | High | `[x] 구독 화면 Card Stack (PRO+토큰+비교표)` `[x] useIsPro + usePurchaseIAP + useRestoreSubscription` `[x] featureGuard (PRO + 멀티독)` `[x] verify-iap-order Edge Function(mock)` `[x] grant-toss-points Edge Function(mock)` `[x] iap.ts 공식 패턴 래퍼 (createOneTimePurchaseOrder + getPendingOrders)` `[x] usePendingOrderRecovery (_app.tsx 자동 복구)` `[x] verifyAndGrant B2B context 확장 + iap.test.ts 8케이스` `[x] subscription API backend-first + supabase fallback 전환` `[x] 권한 우회 차단 패치(v8): 위조 x-user-role 헤더 POST 403 검증(verify-iap-order/grant-toss-points)` `[ ] 결제 E2E` |
| MSG-001 | Notification | 미구현 | Smart Message Edge Function | new | In Progress | integration | High | `[x] send-smart-message Edge Function(mock)` `[x] 쿨다운 정책(10분/일3회/22~08)` `[x] noti_history 실DB 연동(확장 컬럼+service_role insert)` `[x] DB 기록 실패 시 fail-open 멱등 보강(중복 발송 방지)` `[x] Jest app/edge 분리로 timeout 해소` `[x] Edge runtime invoke 로그(성공/실패 8건, 2026-02-27)` `[x] 런타임 DB 영속 성공 검증(FK 유효 user_id, error_code=null)` `[x] 권한 우회 차단 패치(v8): 위조 x-user-role 헤더 POST 403 검증` `[ ] Sandbox 실발송 검증` |
| AD-001 | Ads | 없음 | 토스 Ads SDK 2.0 Rewarded 광고 3터치포인트 | new | Done | unit/manual | Medium | `[x] types/ads.ts 타입 정의` `[x] lib/ads/config.ts SDK 인터페이스+mock` `[x] useRewardedAd 훅 (라이프사이클+타임아웃+일일한도)` `[x] RewardedAdButton 훅 기반 리팩터` `[x] R1(survey-result) R2(dashboard) R3(coaching) 페이지 통합` `[x] tracker 광고 이벤트 5종` `[x] useRewardedAd 테스트 5케이스` `[ ] 실제 Ad Group ID 교체` `[ ] Sandbox 광고 검증` |
| B2B-001 | B2B Ops | 없음 | B2B 확장 레이어 (7 Phase + 정합성 수정) | new | In Progress | manual/perf | High | `[x] P1~P7 전체 코드 구현 (타입/가드/API/훅/UI/설정)` `[x] tsc --noEmit 전체 통과` `[x] SCHEMA-B2B.md↔b2b.ts 100% 일치 검증 (10테이블 99컬럼)` `[x] SCHEMA-B2B.md↔마이그레이션 SQL 정합 검증` `[x] router.gen.ts 23라우트 정합 검증 (APP-001과 공유)` `[x] PRD 정합성 검증 6건 갭 수정: todayLogCount 실데이터JOIN, entitlement검증, 전화번호인증, 토스/비토스 2경로 공유, PII 암호화, 통계 연결` `[x] B2B IAP 공식 패턴 정렬 (usePurchaseB2BIAP + usePendingOrderRecoveryB2B)` `[x] roleGuard.test.ts 8케이스 (역할 가드 + evaluatePageGuard B2B 통합)` `[x] Backend BE-P7 완료 (org 14 endpoints + report 9 endpoints)` `[x] Supabase B2B 10테이블 + RLS 30+정책 적용 (INFRA-1)` `[x] org dogs API backend-first + supabase fallback 전환` `[x] report API backend-first + supabase fallback 전환` `[x] generate-report v3 배포 + mock/real 스위치(OPENAI_API_KEY, REPORT_AI_MODE) + 위조 x-user-role POST 403(v3)` `[ ] B2C 회귀 테스트` `[ ] 40마리 FlatList 성능 실측` `[ ] 공유 링크 실기기 검증` `[ ] verify_parent_phone_last4 RPC 서버 구현` |
| REG-001 | Registration | 없음 | 토스 콘솔 등록 준비 (법적문서 + 콜백 + mTLS + 앱내약관) | new | Done | manual/deploy | Medium | `[x] legal Edge Function 4종 HTML 서빙` `[x] toss-disconnect 콜백 (Basic Auth, referrer 3종, 응답 검증)` `[x] RealMTLSClient 구현 (7메서드, Deno.createHttpClient)` `[x] 앱 내 약관 페이지 2종 + login.tsx 링크 연결` `[x] toss_apps 스킬 Section 9 추가` `[x] self-review 3건 수정 (응답검증, NaN체크, 이메일불일치)` `[x] Edge Function deploy + URL 접근 확인` `[x] Supabase secrets 등록 (callback auth, PII key, mTLS mode)` `[x] Supabase secrets 등록 (mTLS cert/key)` `[x] 사업자등록 완료 + 앱 배포 완료 (2026-02-27, 사용자 보고)` `[ ] 콘솔 테스트 버튼 콜백 검증` |

## 3) 사용 규칙

1. 코드 작업 전 반드시 대응 `Parity ID`를 선택한다.
2. 상태 변경 시 검증 결과를 `Notes`에 남긴다.
3. `Done`은 테스트/검증 근거가 있어야만 가능하다.
