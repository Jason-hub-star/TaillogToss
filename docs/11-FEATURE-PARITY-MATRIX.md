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
| AUTH-001 | Auth | Supabase OAuth + guest | Toss Login bridge + Supabase session | rewrite | In Progress | integration/e2e | High | `appLogin` + `login-with-toss` |
| APP-001 | App Shell | Next.js App Router | RN file-based routing app shell | rewrite | Not Started | unit/manual | Medium | nav/layout baseline |
| UI-001 | Design System | Tailwind/Radix/Framer Motion | TDS React Native | rewrite | Not Started | visual/manual | High | UI 전면 교체 |
| LOG-001 | Behavior Log | ABC 기록 폼(웹) | RN 기록 화면 + 바텀시트 | adapt | Not Started | unit/manual | Medium | 프리셋 우선 |
| AI-001 | AI Coaching | 기존 FastAPI 코칭 API | RN API client + hook 재사용 | adapt | Not Started | unit/integration | Medium | BE 변경 최소화 |
| IAP-001 | Billing | Stripe placeholder | Toss IAP + verify-iap-order | rewrite | Not Started | integration/e2e | High | 상태 2축 관리 + R1/R2/R3 광고 잠금 해제 계약 + Edge Function contract test 연계 |
| MSG-001 | Notification | 미구현 | Smart Message Edge Function | new | Not Started | integration | High | 빈도 제한 정책 + Edge Function contract test(쿨다운/일일 제한) 필수 |
| B2B-001 | Ops Queue | 없음 | Today Ops Queue (RN FlatList) | new | Not Started | manual/perf | High | 40마리 기준 + Wave 3 게이트 전에는 타입/테이블 스텁만 허용 |

## 3) 사용 규칙

1. 코드 작업 전 반드시 대응 `Parity ID`를 선택한다.
2. 상태 변경 시 검증 결과를 `Notes`에 남긴다.
3. `Done`은 테스트/검증 근거가 있어야만 가능하다.
