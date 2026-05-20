# TaillogToss 진행도 체크리스트

> 생성: 2026-04-02 | 갱신: 2026-05-19 | 기준: SSOT 4종 + 코드 스캔 + 토스 SDK 공식 문서 대조
> 종합 완성도: **89%** (Backend 5개 버그 수정 + E2E Wave 1~9 로컬 완료 + 신규 skill 생성)

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
- [x] ~~🔴 **Backend 5개 모델-DB 정합성 수정**~~ — ✅ 2026-05-19 완료 (commit 2dc579b, Railway 배포)
  - [x] BUG-01: `BehaviorLog.daily_activity` String(50) → JSONB
  - [x] BUG-02: `StepFeedbackUpdate.reaction` str → `StepReaction(str, Enum)` (Pydantic 검증)
  - [x] BUG-03: Dog/AICoaching 관계 `passive_deletes=True` 추가
  - [x] BUG-04: B2B 8개 컬럼 `Enum(name=...)` → `String`
  - [x] BUG-05: `DailyReport.behavior_summary` Text→JSONB, `highlight_photo_urls` JSONB→ARRAY(String)
  - [x] pytest 74→75 passed (JSONB 회귀 테스트 추가)
- [x] ✅ **로컬 E2E 개발모드 완전 검증** — Wave 1~9 전체 기록 완료 (2026-05-19)
- [ ] 🔴 **실기기 E2E 통합 검증** — 23화면 + 핵심 플로우 실기기 테스트 (**검증예정** 2026-05-19, ADB R3CXB0QH0LY 연결됨)
  - [ ] dev 모드 20개 화면 adb screencap 루프 (AIT 불필요 화면)
  - [ ] AIT 전용 3개 — 실Toss로그인(`/onboarding/welcome`), 광고render(`/dashboard`·`/training/academy`·`/training/detail`), IAP(`/settings/subscription`)
  - [ ] PRELAUNCH-QA 8개 핫픽스 실기기 재확인 (LOCAL PASS → 기기 미검증)
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

### B1. Done (20/20 = 100%)

- [x] `/onboarding/welcome` — AUTH-001, UIUX-004 | 2026-04-20
- [x] `/onboarding/survey` — UIUX-004 | 2026-03-02
- [x] `/onboarding/survey-result` — UI-001 | 2026-04-02
- [x] `/onboarding/notification` — APP-001 | 2026-04-20
- [x] `/dashboard` — UIUX-001 | 2026-03-01
- [x] `/dashboard/quick-log` — LOG-001 | 2026-05-19 (QA hotfix: intensity/occurrence/time UX)
- [x] `/dashboard/analysis` — UIUX-001 | 2026-05-19 (QA hotfix: Korean labels/occurrence charts/share)
- [x] `/coaching/result` — UIUX-005, AI-001 | 2026-04-20
- [x] `/training/academy` — UIUX-002, UIUX-003 | 2026-03-01
- [x] `/training/detail` — UIUX-005 | 2026-04-20
- [x] `/dog/profile` — UIUX-006 | 2026-03-02
- [x] `/dog/add` — APP-001 | 2026-04-02
- [x] `/dog/switcher` — UIUX-006 | 2026-04-02
- [x] `/settings` — APP-001 | 2026-03-02
- [x] `/settings/subscription` — IAP-001 | 2026-04-02
- [x] `/legal/terms` — APP-001 | 2026-04-02
- [x] `/legal/privacy` — APP-001 | 2026-04-02
- [x] `/ops/today` — B2B-001 | 2026-04-20
- [x] `/parent/reports` — B2B-001 | 2026-04-21 (FlatList 목록+선택 상세 개선)
- [x] `/ops/settings` — B2B-001, B2B-002 | 2026-04-21 (센터정보수정+강아지현황+멤버관리+플랜카드 실데이터)

---

## C. Feature Parity 완성도 (11-FEATURE-PARITY-MATRIX 기준)

### C1. Done (2/11 = 18%)

- [x] **AD-001** 광고 — real SDK wrapper + live ID fallback + R/B/I 슬롯 통합 + test 통과
- [x] **REG-001** 등록 — legal + toss-disconnect + 약관 + 사업자등록/배포

### C2. In Progress (9/11 = 82%) — 잔여 TODO

- [ ] **AUTH-001** 인증
  - [x] login.tsx appLogin 연동
  - [x] AuthContext + useAuth
  - [x] authGuard + onboardingGuard + usePageGuard 19페이지
  - [x] login-with-toss v13 배포 + Sandbox 200/400 증적
  - [x] rateLimiter/piiGuard/pepperRotation
  - [x] auth.test.ts 7케이스
  - [ ] fresh authCode로 happy-path 200 재증적 (실기기)

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

- [ ] **AI-001** AI 코칭
  - [x] 코칭 6블록 (Free 3 + PRO 3)
  - [x] 피드백 별점 useSubmitFeedback
  - [x] Backend BE-P5 완료 (AI 6블록 생성 + 예산 게이팅 + 룰 폴백)
  - [x] Backend 12모듈 60+ endpoints
  - [x] coaching API backend-first + supabase fallback
  - [x] coaching/result P0 업그레이드
  - [ ] FastAPI 코칭 API 실 연동 검증

- [ ] **IAP-001** 결제
  - [x] 구독 화면 Card Stack + useIsPro + usePurchaseIAP
  - [x] verify-iap-order v12 + DB 영속(5건)
  - [x] iap.test 8케이스 + usePendingOrderRecovery
  - [x] subscription API backend-first 전환
  - [ ] 결제 E2E (앱 UI 3시나리오 증적)
  - [x] mock orderId 제거 → 실 SDK 교체

- [ ] **MSG-001** 알림
  - [x] send-smart-message Edge v9 + 쿨다운 정책
  - [x] noti_history 실DB 연동 + fail-open 멱등
  - [x] 우회 차단 + 429 QUIET_HOURS 확인
  - [ ] Smart Message 신청/승인 완료
  - [ ] Sandbox 실발송 검증

- [ ] **B2B-001** B2B 운영
  - [x] P1~P7 전체 코드 (타입/가드/API/훅/UI/설정)
  - [x] SCHEMA-B2B.md ↔ b2b.ts 100% 일치
  - [x] BE-P7 완료 (org 14 + report 9 endpoints)
  - [x] B2B IAP 공식 패턴 + roleGuard test 8케이스
  - [ ] 40마리 FlatList 성능 실측
  - [ ] 공유 링크 실기기 검증
  - [ ] B2C 회귀 테스트
  - [ ] verify_parent_phone_last4 RPC 서버 구현

---

## D. 토스 SDK 연동 (공식 문서 vs 구현)

### D1. 구현 완료 (55%)

- [x] Toss Login OAuth → login-with-toss v13
- [x] IAP `createOneTimePurchaseOrder` / `getPendingOrders` → iap.ts 래퍼
- [x] 파일 기반 라우팅 → granite-js plugin-router 23라우트
- [x] 딥엔트리 (deepEntry) → 3종 구현
- [x] TDS RN 컴포넌트 → 52개 적용
- [x] 이벤트 트래킹 → tracker 구현 (광고 5종 + 코칭 2종)
- [x] 텍스트/링크 공유 → coaching 공유 구현

### D2. Mock/부분 구현 (20%)

- [ ] 광고 Ads SDK 2.0 → `createMockAdsSdk()` 사용 중
  - [ ] 실 Ad Group ID 교체 **⏸ 보류** — 계좌사본 미비, 사업자 광고 심사 불가. ENV 구조(AIT_AD_R1/R2/R3 + babel inline) 준비 완료
  - [ ] Rewarded/Interstitial/Banner 실 검증
- [x] ~~send-smart-message → mock mTLS~~ → ✅ real mTLS (v14)
- [x] ~~grant-toss-points → mock mTLS~~ → ✅ real mTLS (v14)
- [x] ~~verify-iap-order → mock mTLS~~ → ✅ real mTLS (v17)
- [ ] DogPhotoPicker → 카메라/앨범 브릿지 미연결
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
| login-with-toss | v13 | ✅ | fresh authCode 재증적 |
| verify-iap-order | v17 | ✅ | ✅ real mTLS 완료 |
| send-smart-message | v14 | ✅ | ✅ real mTLS 완료 |
| grant-toss-points | v14 | ✅ | ✅ real mTLS 완료 |
| legal | v9 | ✅ | - |
| toss-disconnect | v10 | ✅ | 콘솔 콜백 검증 |
| generate-report | v4 | ⚠️ | real OpenAI 키 검증 |

### E3. DB / Infra

- [x] INFRA-1: Supabase 38테이블 + RLS 30+ 정책
- [ ] INFRA-2: Edge Function Secrets drift 점검
- [x] ~~INFRA-3: 토스 콘솔 등록 + mTLS 인증서~~ → ✅ 완료 (2026-04-02)

---

## F. 테스트 커버리지 (60%)

- [x] FE 단위 테스트: 101 tests, 16 suites (2026-05-12)
- [x] BE 단위 테스트: pytest 57 tests (2026-05-12)
- [x] Edge 단위 테스트: 45 tests, 13 suites (2026-05-12)
- [ ] BE↔DB 통합 테스트
- [ ] E2E 테스트 (로그인→기록→코칭→결제 풀플로우)
- [ ] 성능 테스트 (40마리 FlatList, API p95 < 300ms)
- [ ] 보안 테스트 (mTLS real mode 검증)

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
| TypeScript 에러 | 0 | ✅ |
| TODO 잔존 | 2건 | ✅ 런타임 출시 차단 아님 |
| FIXME/HACK | 0건 | ✅ |
| Mock 코드 (테스트 외) | 3곳 | ⚠️ Dev/local 또는 B2B report 실모드 전환 대상 |
| 페이지 파일 | 24개 | ✅ |
| 컴포넌트 파일 | 84개 | ✅ |
| API 모듈 | 16개 | ✅ |
| Custom Hooks | 18개 | ✅ |
| 테스트 파일 | 11개 (FE) | ⚠️ 추가 필요 |

---

*다음 갱신: 작업 진행 시 해당 섹션 체크박스 업데이트*
*연동: PAGE-UPGRADE-BOARD.md, 11-FEATURE-PARITY-MATRIX.md, MISSING-AND-UNIMPLEMENTED.md*
