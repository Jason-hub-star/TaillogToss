# TaillogToss 진행도 체크리스트

> 생성: 2026-04-02 | 갱신: 2026-05-27 | 기준: SSOT 4종 + 05-26/05-27 실기기/AIT 증적 + 문서 정합성 점검
> 종합 완성도: **91%** (AI/IAP/Ads/B2B 최신 증적 반영, 잔여는 통합 E2E/콘솔 운영/자동화 stale)

---

## A. 크리티컬 블로커 (출시 차단)

- [x] ~~🔴 **SDK 2.x 마이그레이션**~~ — ✅ 2026-04-02 완료 (`2.4.1` + React 19.2.3 + RN 0.84.0 + TDS 2.0.2)
  - [x] `npm install @apps-in-toss/framework@^2.4.1` (2.4.1 설치)
  - [x] `ait migrate react-native-0-84-0` 코드모드 실행
  - [x] `package.json` 빌드 스크립트 `granite build` → `ait build`
  - [x] `checkoutPayment` API 시그니처 — 미사용 확인 (수정 불필요)
  - [x] `getTossShareLink` 2번째 인자 — 실호출 없음 확인 (수정 불필요)
  - [x] React 19.2.3 + TDS RN 2.0.2 호환성 확인
  - [x] 최소 토스앱 v5.232.0 대응 (SDK 2.4.1 기준)
- [x] ~~🔴 **mTLS 실 인증서 발급**~~ — ✅ 2026-04-02 완료 (인증서 발급 + Secrets 등록 + 4종 재배포)
  - [x] 콘솔 → 앱 → mTLS 인증서 탭 → 발급
  - [x] `mac_public.crt` + `mac_private.key` 다운로드
  - [x] Supabase secrets에 Base64 인코딩 등록 (`TOSS_CLIENT_CERT_BASE64`, `TOSS_CLIENT_KEY_BASE64`)
  - [x] Edge Function 4종 `resolveMtlsMode()` 자동 감지 + 재배포 (login-with-toss v18, verify-iap-order v17, send-smart-message v14, grant-toss-points v14)
  - [ ] 인증서 만료일 캘린더 등록
- [x] ~~🔴 **Backend 5개 모델-DB 정합성 수정**~~ — ✅ 2026-05-19 완료 (commit 2dc579b, 이후 production backend 운영 경로는 DigitalOcean)
  - [x] BUG-01: `BehaviorLog.daily_activity` String(50) → JSONB
  - [x] BUG-02: `StepFeedbackUpdate.reaction` str → `StepReaction(str, Enum)` (Pydantic 검증)
  - [x] BUG-03: Dog/AICoaching 관계 `passive_deletes=True` 추가
  - [x] BUG-04: B2B 8개 컬럼 `Enum(name=...)` → `String`
  - [x] BUG-05: `DailyReport.behavior_summary` Text→JSONB, `highlight_photo_urls` JSONB→ARRAY(String)
  - [x] pytest 74→75 passed (JSONB 회귀 테스트 추가)
- [x] ✅ **로컬 E2E 개발모드 완전 검증** — Wave 1~9 전체 기록 완료 (2026-05-19)
- [ ] 🔴 **실기기 E2E 통합 검증** — 핵심 플로우별 증적은 늘었지만 23화면 단일 sweep은 아직 미완료
  - [ ] managed route 20개 + intentionally unmanaged route 5개 sweep 결과를 한 번에 묶어 기록
  - [x] AIT fresh Toss Login 재검증: `/onboarding/welcome` → login-with-toss success → `/onboarding/survey` (2026-05-26)
  - [x] Ads R1/R2 실제 Toss AdActivity 진입 + R2 reward 후 `/coaching/result` 진입 PASS (2026-05-26)
  - [x] `/coaching/result` latest AIT에서 FREE 6블록 전체 열람 PASS (2026-05-27)
  - [ ] QR 테스트 최소 1회 (심사 요청 버튼 활성화 조건)
- [x] ~~🔴 **번들 크기 100MB 미만 확인**~~ — ✅ 4.9MB (100MB 한도 대비 5%)
- [x] ~~🟠 **Ads SDK 콜백 패턴 리팩토링**~~ — ✅ `loadFullScreenAd`/`showFullScreenAd` 이벤트 콜백 경로 확인 (2026-05-12)
- [x] ~~🟠 **IAP `completeProductGrant()` 호출 누락**~~ — ✅ 서버 grant 성공 후 `completeProductGrant()` 호출 확인 (2026-05-12)
- [x] ~~🟠 **Smart Message 템플릿 등록**~~ — ✅ `TAILLOG_BEHAVIOR_REMIND` 승인/실발송 확인. 추가 캠페인은 Phase 2+로 관리
- [ ] 🟡 **퍼블리싱 심사 준비** — `docs/ref/AIT-PUBLISHING-READINESS.md`
  - [x] 앱 로고 600x600 각진 정사각형 준비
  - [x] 탭 바/하단 네비게이션 구현 확인
  - [x] 개인정보처리방침 업데이트 (위탁 업체: Supabase, OpenAI 명시)
  - [x] AI 코칭 결과 "AI 생성물" 문구 명시 확인 (보안 심사 요건)
  - [ ] QR 테스트 최소 1회 완료 (심사 요청 버튼 활성화 조건)

---

## B. 페이지 완성도 (PAGE-UPGRADE-BOARD 기준)

### B1. Done (14/25)

- [x] `/onboarding/stage1-form`, `/onboarding/stage2-form`, `/onboarding/stage3-form`
- [x] `/onboarding/survey`, `/onboarding/survey-result`, `/onboarding/notification`
- [x] `/coaching/result`
- [x] `/dog/profile`, `/dog/add`, `/dog/switcher`
- [x] `/legal/terms`, `/legal/privacy`
- [x] `/ops/setup`, `/ops/dog-add`

### B2. QA (11/25)

- [ ] `/onboarding/welcome`
- [ ] `/dashboard`, `/dashboard/quick-log`, `/dashboard/analysis`
- [ ] `/training/academy`, `/training/detail`
- [ ] `/settings`, `/settings/subscription`
- [ ] `/ops/today`, `/ops/settings`, `/parent/reports`

> Source of truth: `docs/status/PAGE-UPGRADE-BOARD.md` as of 2026-05-21. `/ops/settings` logo upload is DEV_LOCAL PASS, but route remains QA until broader B2B share/performance/regression checks close.

---

## C. Feature Parity 완성도 (11-FEATURE-PARITY-MATRIX 기준)

### C1. Done / Closed

- [x] **REG-001** 등록 — legal + toss-disconnect + 약관 + 사업자등록/배포
- [x] **AI-001** AI 코칭 — async generation, production AIT recovery, FREE full-result ownership까지 최신 증적 확보
- [x] **IAP-001** 결제 — SDK order/grant/completeProductGrant 경로 및 latest paid success 증적 확보
- [x] **PRO-INTAKE-001** Pro 상담지 — Stage 3 상담지 + AI 프롬프트 반영 완료
- [x] **UI-TRAINING-DETAIL-001** 훈련 상세 UX — attempt/reaction/history 경로 완료
- [x] **AI-COACHING-ANALYTICS-001** 코칭 행동 분석 — backend/frontend 통합 완료

### C2. QA / In Progress — 잔여 TODO

- [ ] **AUTH-001** 인증
  - [x] login.tsx appLogin 연동
  - [x] AuthContext + useAuth
  - [x] authGuard + onboardingGuard + usePageGuard 19페이지
  - [x] login-with-toss v13 배포 + Sandbox 200/400 증적
  - [x] rateLimiter/piiGuard/pepperRotation
  - [x] auth.test.ts 7케이스
  - [x] fresh AIT login happy-path 재증적 (2026-05-26)
  - [ ] 콘솔 콜백/negative path 최종 운영 증적 정리

- [ ] **APP-001** 앱 셸
  - [x] 23라우트 + _app.tsx 프로바이더
  - [x] 레이아웃 5종 + 딥엔트리 3종
  - [x] SurveyContext
  - [x] dog/profile + dog/add 실구현
  - [x] Sandbox 앱 로컬 진입/라우팅 검증
  - [ ] 실기기 라우팅 완전 검증

- [ ] **UI-001** 디자인
  - [x] TDS-ext 6 + shared 8 + features 38 = 52컴포넌트
  - [x] 23개 화면 전체 빌드 + tsc 0 에러
  - [x] 디자인 토큰 중앙화 70+ 파일
  - [x] Lottie 3종 + 상태UI 8화면 + UX 라이팅
  - [ ] 실기기 비주얼 QA (23화면)

- [ ] **LOG-001** 행동 기록
  - [x] 대시보드 + 빠른기록 + 상세기록 + 분석
  - [x] ABCForm + QuickLogForm
  - [x] log API backend-first + supabase fallback
  - [ ] FastAPI 로그 API 실기기 E2E 검증

- [ ] **MSG-001** 알림
  - [x] send-smart-message Edge v9 + 쿨다운 정책
  - [x] noti_history 실DB 연동 + fail-open 멱등
  - [x] 우회 차단 + 429 QUIET_HOURS 확인
  - [x] `TAILLOG_BEHAVIOR_REMIND` 승인 + current user HTTP 200 + `noti_history.success=true`
  - [ ] coaching_ready/training_reminder/streak_alert/surge_alert/promo 추가 캠페인 등록

- [ ] **AD-001** 광고
  - [x] real SDK wrapper + live Ad Group ID 7종 fallback
  - [x] R1/R2 actual Toss AdActivity 진입 및 R2 reward flow PASS (2026-05-26)
  - [ ] Apps in Toss console impression 갱신 확인

- [ ] **B2B-001** B2B 운영
  - [x] P1~P7 전체 코드 (타입/가드/API/훅/UI/설정)
  - [x] SCHEMA-B2B.md ↔ b2b.ts 100% 일치
  - [x] BE-P7 완료 (org 14 + report 9 endpoints)
  - [x] B2B IAP 공식 패턴 + roleGuard test 8케이스
  - [x] `/ops/settings` center logo upload/display/save DEV_LOCAL PASS + remote `org-logos` bucket/RLS applied
  - [x] 40마리 `/ops/today` DEV_LOCAL + Metro-off actual Toss 렌더/성능 증적
  - [x] 공유 링크 actual Toss 공유시트 + DB 저장 증적
  - [x] B2B/B2C 전환 회귀 2회 반복 PASS
  - [x] `verify_parent_phone_last4` FastAPI endpoint + `/parent/reports?token` DEV_LOCAL 진입 PASS
  - [ ] B2B route board는 `/ops/today`, `/ops/settings`, `/parent/reports` 최종 manual QA가 남아 `QA` 유지

- [ ] **GROWTH-001** Viral Reward
  - [x] contactsViral native UI 진입 + 공유자 PRO_DAY_PASS 지급 확인
  - [ ] day-pass-only 계정 gate/만료 복귀 QA
  - [ ] 지인 recipient 지급은 referral claim endpoint가 필요하면 별도 구현

---

## D. 토스 SDK 연동 (공식 문서 vs 구현)

### D1. 구현 완료

- [x] Toss Login OAuth → login-with-toss v13
- [x] IAP `createOneTimePurchaseOrder` / `getPendingOrders` → iap.ts 래퍼
- [x] 파일 기반 라우팅 → granite-js plugin-router 23라우트
- [x] 딥엔트리 (deepEntry) → 3종 구현
- [x] TDS RN 컴포넌트 → 52개 적용
- [x] 이벤트 트래킹 → tracker 구현 (광고 5종 + 코칭 2종)
- [x] 텍스트/링크 공유 → coaching 공유 구현

### D2. Mock/부분 구현 (20%)

- [x] 광고 Ads SDK 2.0 → 실 SDK wrapper + live Ad Group ID fallback 적용
  - [x] R1/R2 rewarded actual Toss AdActivity 진입 확인
  - [ ] Apps in Toss console impression 갱신 확인
- [x] ~~send-smart-message → mock mTLS~~ → ✅ real mTLS (v14)
- [x] ~~grant-toss-points → mock mTLS~~ → ✅ real mTLS (v14)
- [x] ~~verify-iap-order → mock mTLS~~ → ✅ real mTLS (v17)
- [x] DogPhotoPicker/PhotoPicker → Android Photo Picker 기반 프로필 사진 및 센터 로고 업로드 DEV_LOCAL/AIT 증적 확보
- [ ] IAP 구독/복원 → Toss IAP 복원 API 공개 대기

### D3. 미구현 (25% → 17%)

- [x] ~~**SDK 2.x 마이그레이션**~~ (`@apps-in-toss/framework` 1.3 → 2.4.1) ✅ 2026-04-02
- [ ] Toss Pay (`checkoutPayment`) — 현재 IAP만 사용
- [ ] 위치정보 (현재 불필요)
- [ ] Toss Cert (개인정보 암복호화) — 현재 자체 PII 구현
- [ ] 네이티브 스토리지 — 현재 Supabase 사용
- [ ] 바이럴 공유 리워드 (PRD 9.8, Phase 2+)
- [ ] Pepper 회전 스케줄러 (PRD 9.1)
- [ ] 재연결 시나리오 (toss-disconnect 후 복구)

---

## E. Backend 완성도 (95%)

### E1. FastAPI (BE-P1~P8)

- [x] BE-P1 스캐폴딩 + config
- [x] BE-P2 SQL 마이그레이션 (26→38테이블)
- [x] BE-P3 모델 + 스키마 (27모델 + 22 enum)
- [x] BE-P4 Dogs + Log CRUD (5 feature 모듈)
- [x] BE-P5 AI 코칭 엔진 (6블록 + 예산 게이팅)
- [x] BE-P6 Training + Settings
- [x] BE-P7 B2B Org + Report
- [x] BE-P8 테스트 (pytest 57 pass, 2026-05-12)
- [ ] BE↔DB 통합 테스트 (FastAPI + 실 Supabase 연결)

### E2. Edge Functions (7종)

| Function | 버전 | 상태 | 잔여 |
|----------|------|------|------|
| login-with-toss | v18 | ✅ | fresh authCode 재증적 |
| verify-iap-order | v17 | ✅ | ✅ real mTLS 완료 |
| send-smart-message | v14 | ✅ | ✅ real mTLS 완료 |
| grant-toss-points | v14 | ✅ | ✅ real mTLS 완료 |
| legal | v13 | ✅ | - |
| toss-disconnect | v17 | ✅ | 콘솔 콜백 검증 |
| generate-report | v8 | ⚠️ | real OpenAI 키 검증 + B2B 공유 CTA device proof |

### E3. DB / Infra

- [x] INFRA-1: Supabase 38테이블 + RLS 30+ 정책
- [ ] INFRA-2: Edge Function Secrets drift 점검
- [x] ~~INFRA-3: 토스 콘솔 등록 + mTLS 인증서~~ → ✅ 완료 (2026-04-02)

---

## F. 테스트 커버리지 (65%)

- [x] FE 단위 테스트: 101 tests, 16 suites (2026-05-12)
- [x] BE 단위 테스트: pytest 57 tests (2026-05-12)
- [x] Edge 단위 테스트: 45 tests, 13 suites (2026-05-12)
- [ ] BE↔DB 통합 테스트
- [ ] E2E 테스트 (로그인→기록→코칭→결제 풀플로우)
- [x] B2B 40마리 `/ops/today` device 성능 스모크
- [ ] API p95 < 300ms 별도 계측
- [x] 주요 Edge role-header 우회 차단 + mTLS real mode 문서/배포 증적
- [ ] secrets drift/만료 캘린더 운영 점검

---

## G. 퍼블리싱 준비도 (45%)

### G1. 토스 콘솔 심사 요건

- [x] 사업자등록 완료
- [x] 앱 배포 완료 (2026-02-27)
- [x] **SDK 2.x 적용** ✅ 2026-04-02 (2.4.1 + ait build 4.9MB)
- [ ] 운영 심사 서류 준비
- [ ] 기능 심사 — 앱 내 오류 없는 동작
- [ ] 디자인 심사 — TDS 가이드라인 준수
- [ ] 보안 심사 — 개인정보/데이터 보호

### G2. Mock→Real 전환 (5/7)

- [x] `@apps-in-toss/framework` 1.3 → 2.4.1 ✅
- [x] Ads SDK mock → 실 SDK wrapper + live Ad Group ID fallback
- [x] ~~verify-iap-order mock mTLS → real~~ ✅
- [x] ~~send-smart-message mock mTLS → real~~ ✅
- [x] ~~grant-toss-points mock mTLS → real~~ ✅
- [ ] generate-report mock → `REPORT_AI_MODE=real`
- [ ] IAP 복원 DB 대체 → Toss IAP 복원 API

---

## H. Phase 2+ 기능 (미착수, 출시 후)

- [ ] 리텐션 자동화 (PRD 9.7) — 세그먼트 5종 + 스케줄러
- [ ] 바이럴 공유 리워드 (PRD 9.8) — share_token + referral
- [ ] 트레이너 마켓플레이스 (PRD 9.9) — KYC + 매칭 + 정산
- [ ] Pepper 회전 프로토콜 + PII 마이그레이션
- [ ] 오프라인 큐 (네트워크 끊김 시 로컬 저장)
- [ ] 데이터 내보내기 (CSV/PDF)
- [ ] 강아지 프로필 사진 (카메라 브릿지)
- [ ] 주간 리포트 알림

---

## I. 코드 품질 지표

| 지표 | 수치 | 판정 |
|------|------|------|
| TypeScript 에러 | 0 | ✅ 2026-05-27 `/coaching/result` 세션 기준 |
| TODO 잔존 | 2건 | ✅ 런타임 출시 차단 아님 |
| FIXME/HACK | 0건 | ✅ |
| Mock 코드 (테스트 외) | 2곳+ | ⚠️ Dev/local 또는 report/marketing 실모드 전환 대상 |
| 페이지 파일 | 24개 | ✅ |
| 컴포넌트 파일 | 84개 | ✅ |
| API 모듈 | 16개 | ✅ |
| Custom Hooks | 18개 | ✅ |
| 테스트 파일 | 11개 (FE) | ⚠️ 추가 필요 |

---

*다음 갱신: 작업 진행 시 해당 섹션 체크박스 업데이트*
*연동: PAGE-UPGRADE-BOARD.md, 11-FEATURE-PARITY-MATRIX.md, MISSING-AND-UNIMPLEMENTED.md*
