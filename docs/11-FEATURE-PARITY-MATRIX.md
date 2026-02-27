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
| AUTH-001 | Auth | Supabase OAuth + guest | Toss Login bridge + Supabase session | rewrite | In Progress | integration/e2e | High | `[x] login.tsx mock` `[x] AuthContext + useAuth` `[x] authGuard + onboardingGuard` `[x] usePageGuard 11개 페이지 적용` `[x] login-with-toss Edge Function(mock)` `[x] rateLimiter/piiGuard/pepperRotation` `[ ] mTLS 인증서` `[ ] Toss Sandbox E2E` |
| APP-001 | App Shell | Next.js App Router | RN file-based routing app shell | rewrite | In Progress | unit/manual | Medium | `[x] 16라우트 + _app.tsx 프로바이더` `[x] 레이아웃 5종` `[x] 딥엔트리 3종` `[x] SurveyContext` `[ ] Sandbox 앱 검증` |
| UI-001 | Design System | Tailwind/Radix/Framer Motion | TDS React Native | rewrite | In Progress | visual/manual | High | `[x] TDS-ext 6 + shared 6 + features 21 = 33컴포넌트` `[x] 16개 화면 전체 빌드` `[x] tsc 통과` `[ ] 실기기 비주얼 QA` |
| LOG-001 | Behavior Log | ABC 기록 폼(웹) | RN 기록 화면 + 바텀시트 | adapt | In Progress | unit/manual | Medium | `[x] 대시보드 + 빠른기록 + 상세기록 + 분석` `[x] ABCForm + QuickLogForm` `[ ] Supabase API 실 연동` |
| AI-001 | AI Coaching | 기존 FastAPI 코칭 API | RN API client + hook 재사용 | adapt | In Progress | unit/integration | Medium | `[x] 코칭 6블록 (Free 3 + PRO 3)` `[x] 피드백 별점 useSubmitFeedback` `[ ] FastAPI 코칭 API 실 연동` |
| IAP-001 | Billing | Stripe placeholder | Toss IAP + verify-iap-order | rewrite | In Progress | integration/e2e | High | `[x] 구독 화면 + useIsPro` `[x] featureGuard (PRO + 멀티독)` `[x] verify-iap-order Edge Function(mock)` `[x] grant-toss-points Edge Function(mock)` `[ ] 결제 E2E` |
| MSG-001 | Notification | 미구현 | Smart Message Edge Function | new | In Progress | integration | High | `[x] send-smart-message Edge Function(mock)` `[x] 쿨다운 정책(10분/일3회/22~08)` `[x] noti_history 실DB 연동(확장 컬럼+service_role insert)` `[x] DB 기록 실패 시 fail-open 멱등 보강(중복 발송 방지)` `[x] Jest app/edge 분리로 timeout 해소` `[ ] Sandbox 실발송 검증` `[ ] Edge runtime invoke 로그(앱 수동호출)` |
| AD-001 | Ads | 없음 | 토스 Ads SDK 2.0 Rewarded 광고 3터치포인트 | new | Done | unit/manual | Medium | `[x] types/ads.ts 타입 정의` `[x] lib/ads/config.ts SDK 인터페이스+mock` `[x] useRewardedAd 훅 (라이프사이클+타임아웃+일일한도)` `[x] RewardedAdButton 훅 기반 리팩터` `[x] R1(survey-result) R2(analysis) R3(coaching) 페이지 통합` `[x] tracker 광고 이벤트 5종` `[x] useRewardedAd 테스트 5케이스` `[ ] 사업자등록 후 실제 Ad Unit ID 교체` `[ ] Sandbox 광고 검증` |
| B2B-001 | Ops Queue | 없음 | Today Ops Queue (RN FlatList) | new | Not Started | manual/perf | High | 빈 타입 10개만 존재. Wave 3 이전 |

## 3) 사용 규칙

1. 코드 작업 전 반드시 대응 `Parity ID`를 선택한다.
2. 상태 변경 시 검증 결과를 `Notes`에 남긴다.
3. `Done`은 테스트/검증 근거가 있어야만 가능하다.
