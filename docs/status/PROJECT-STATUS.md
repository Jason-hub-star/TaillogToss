# TaillogToss Project Status

Last Updated: 2026-04-27 (KST) — Free/Pro UX 3종 + 구독 페이지 버그픽스: `useProUpgradeSheet()` 훅 신규(SheetNode useMemo 포함), `VariantSelector` Plan B/C `proOnly:true`+`onProCTA` prop, academy/detail `useProUpgradeSheet` 전환, `CoachingPreviewCard` 일일 사용량 배지(dailyUsed/dailyLimit), `subscription.tsx` DetailLayout `headerShown:false` 추가(백버튼 중복 해소), `onSuccess(granted)` 체크(`ProUpgradeSheet`+`subscription.tsx`) — GRANT_FAILED 오경보 버그 수정, `devPlanOverride.ts` 신규+`DevMenu` 플랜 전환 토글, `Backend/training/deps.py` Pro 커리큘럼 게이트, `AI_LLM_TIMEOUT_SEC` 30→120. tsc 0 errors.

Previous: Fine-tuning 배치 복구 + Backend Pro 커리큘럼 게이트 + DevMenu 플랜 전환 UI: `AI_LLM_TIMEOUT_SEC` 30→120(OpenAI timeout 근본 원인 해결), `Backend/app/features/training/deps.py` 신규(Pro 커리큘럼 6개 upsert 게이트), `training/router.py` Pro 검증 추가, `src/lib/devPlanOverride.ts` 신규(devGuardBypass 패턴 복제), `useIsPro()` 개발 오버라이드 지원, `DevMenu` 플랜 전환 토글(📱→🆓→💎 순환). `.mcp.json` project-ref `kvknerzsqgmmdmyxlorl`→`gxvtgrcqkbdibkyeqyil`(본선 SSOT 정렬) + 신규 토큰 교체. FastAPI uvicorn 4→1 프로세스 단일화(PID 11755). tsc 0 errors.

Previous: Pro 기능 인터셉트 + mTLS 버그픽스: `ProUpgradeSheet` 신규(시도 이력 Pro 게이트), `detail.tsx` "시도 이력 보기" `!isPro` 인터셉트, `coaching/result.tsx` 잔여 Pro 넛지 제거, `privacy.tsx` Supabase 위탁업체 명시(보안 심사 대응), `ProUpgradeBanner` 토큰 하드코딩 수정(`spacing.lg/md`), `mTLSClient.sendSmartMessage` Toss API 필드명 불일치 버그 수정(`templateSetCode`+`context`+`x-toss-user-key`). tsc 0 errors.

Previous: 수익화 재설계 완료 (monetization-redesign): Pro 블록 잠금 전면 제거 → 광고 제거(무료 R3광고 삽입) + `/coaching/insights` 심화 리포트(Pro 전용) 모델로 전환. `CoachingBlockList` 6블록 전체 공개(`isUnlocked=true`), `result.tsx` 856→436줄 분리(`CoachingDetailContent.tsx` 추출), `InsightReportHeader`/`useInsightReport` 신규, `ProUpgradeBanner` 문구 갱신, `router.gen.ts` `/coaching/insights` 추가. tsc 0 errors, Jest 115/115 PASS. 이전: 앱인토스 콘솔 앱정보 신청 완료 (앱이름/영문명/키워드/카테고리/스크린샷 세로3장+가로1장). Analysis 화면 풍성화(UIUX-001): 브랜드 리네임(꼬리일기→테일로그), 차트 내부 타이틀 추가(Bar/Radar/Heatmap), `heatmapPeakHour()` 신규, `buildAnalysisShareText` 종합 리포트 형식으로 전면 개편(topBehaviors Top3+trainingEffects+peakHour+DogEnv 생활환경·건강), TRIGGER_LABELS/HEALTH_LABELS 한국어 로컬라이징, Bar+Radar 이중 Supabase Storage 업로드 → 두 URL 공유, `useDogEnv` 분석화면 연결, `ChartWebView.onCapture` 확장, `behaviorIcons.ts` 신규. tsc 0 errors. 이전: 코드 리뷰: UI-TRAINING-PERSONALIZATION-001 + UI-TRAINING-DETAIL-001 실데이터 연결 완료 확인.

Previous: 훈련 커리큘럼 철학 재정의 완료 (플랜 A/B/C): `PlanPhilosophy` 타입+`planMeta` 전체 7개 커리큘럼 적용, altB/C 전체 109스텝 100% 채우기(fear_desensitization 포함), `variant_notes` C 레이블 커리큘럼별 갱신(35개), `VariantSelector` 철학 뱃지 UI, `detail.tsx` 5개 컴포넌트 분리(CurriculumHeroCard/DayProgressIndicator/DayTabBar/CelebrationModal/AttemptHistorySheet), `recommendPlan(DogPlanSignals)` 엔진 추가(노령·대형견→C, 불안·반응성→B, 기본→A), `detail.tsx` 훈련 첫 시작 시 dogEnv 기반 자동 Plan 설정, `training-data-maintenance.prompt.md` 자동화 등록. tsc 0 errors.

Previous: 훈련 UX QA 버그픽스 + 아이콘 에셋 교체: ModalLayout SafeArea(iOS 홈인디케이터 34pt) + backdrop dismiss 추가, `GET /step-attempts` 엔드포인트 + `useStepAttempts` hook으로 StepAttemptHistory 실데이터 연결, `getRecommendationsV2` secondary null 폴백 수정(단일 후보 시 미완료 커리큘럼 fallback), RecordModal 훈련탭 footer 조건부, detail.tsx ReactionTrendBar+StreakBadge 렌더링, 커리큘럼 제목 불필요 텍스트 제거([세상 밖 소리], [괜찮아,조금씩!]), `curriculumIconAssets.ts` base64 URI 방식으로 재작성(Granite.js require() 미지원), CurriculumCard/ShowcaseCard/detail heroIcon → `source={{ uri }}` 패턴 교체. tsc 0 errors.

Previous: AI 코칭 강화 + 훈련 추천 개인화 + 시행착오 기록 시스템 완료 (AI-COACHING-ANALYTICS-001, UI-TRAINING-PERSONALIZATION-001, UI-TRAINING-DETAIL-001): `training_step_attempts` DB 마이그레이션 remote 적용, `/behavior-analytics` FastAPI 엔드포인트, `getRecommendationsV2` ScoreBand 엔진, academy 3섹션 UX, StepCompletionSheet 2경로, AnalysisBadge, ReactionTrendBar, StreakBadge, StepAttemptHistory, RecommendedCurriculumCard, RelatedCurriculumCarousel, detail.tsx useSubmitStepAttempt 연결, RecordModal B2B 훈련이력 탭, pytest 5/5 PASS, tsc 0 errors. 실주행 확인: "최근 기록 23개 분석 결과" 실데이터 연결 확인.

Previous: 헤더 통일화: ListLayout에 `style`/`contentContainerStyle` 오버라이드 prop 추가, settings 페이지 로컬 TopBar 제거 → ListLayout 교체(로딩/에러/정상 3경로), TabLayout에 `headerLeft` prop 추가, 대시보드 헤더에 강아지 아이콘 로고 적용(ICONS['ic-stage-adult'] base64 URI 방식). tsc PASS.

Previous: DogPhotoPicker 실 SDK 연동(fetchAlbumPhotos 권한 3단계+갤러리 선택), DogCard 대시보드에 profile_image_url 조건부 렌더링(이모지→실사진), IAP completeProductGrant 실 SDK 연결, coaching/result AI 생성물 disclaimer 추가, Supabase dog-profiles 버킷 생성+진돗개 사진 업로드. tokens.ts dev 전용 토큰 추가, DevMenu 하드코딩 색상 토큰화, tsc PASS.

Previous: ops/settings 실데이터 업그레이드(B2B-002): 센터정보수정(OrgInfoEditForm+useUpdateOrg), 강아지현황카드(DogQuotaCard), 멤버초대피드백(Alert), 플랜카드(PlanCard), B2B_IAP_PRODUCTS 키 케이스 불일치 수정. OrgContext isOrgLoading 추가, OrgBootstrap role체크 제거 → org null 버그 해결. ops/dog-add isOrgLoading 대기+ops/setup 리디렉트. dogs 테이블 vet_name/animal_reg_no/parent_address 컬럼 추가 migration, org_dogs.parent_phone_last4 명문 저장 + verify_parent_phone_last4 RPC 수정. 128/128 테스트 통과.

Previous: Supabase 프로젝트 정합성 복구: CLI를 올바른 프로젝트(`gxvtgrcqkbdibkyeqyil`)에 재연결, `assign-b2b-role` Edge Function 재배포(verify_jwt=false), `create_organization`+`verify_parent_phone_last4` RPC 신규 프로젝트에 적용, `behavior_logs.org_id` 미삽입 버그 수정(QuickLogInput+createQuickLog+ops/today). 전체 40개 테이블 스키마 비교 완료.
Owner Doc: `CLAUDE.md` (슬림 인덱스), 본 문서는 상태/이력 상세 전용.

## Mac 마이그레이션 (2026-04-02)

Windows → Mac 개발 환경 전환 완료:
- **경로 갱신**: `CLAUDE.md` Repo Boundary + `.claude/settings.json` 경로 전부 Mac 기준으로 수정
- **의존성**: npm install 완료 (1521 packages, TypeScript 5.9.3), Supabase CLI 2.75.0 → 2.84.2 업그레이드
- **연결 검증**: Supabase 38 테이블 / 전체 RLS 확인, post-edit typecheck hook Mac 정상 동작 확인
- **MCP 이슈**: `.mcp.json` 로컬 토큰 auth 오류 미해결 → `claude_ai_Supabase` (Anthropic 내장) 우회 운영 중
- **Backend 세팅**: Python 3.14.3 venv + pip install 완료, FastAPI `uvicorn :8000` 정상 가동 (`/health` 200 OK)
- **Android 연결**: `adb` (v37.0.0) 설치, `adb reverse tcp:8081/5173/8000` 포트 포워딩, 기기 `R3CXB0QH0LY` 인식
- **Sandbox 진입**: `intoss://taillog-app` 스킴 연결 확인, LogBox 오버레이 비활성화 (SafeArea 충돌 해결)
- **LAN→adb**: `backend.ts` DEV_LAN_BACKEND_URL → `adb reverse` 방식으로 전환 (`127.0.0.1:8000`)

## SDK 2.x 마이그레이션 (2026-04-02)

`@apps-in-toss/framework` 1.14.1 → 2.4.1 메이저 업그레이드 완료:
- **패키지**: React 18.2→19.2.3, RN 0.72→0.84.0, TDS 1.3.8→2.0.2, Granite 0.1.34→1.0.4
- **빌드**: `granite build` → `ait build` (코드모드 `ait migrate react-native-0-84-0` 실행)
- **코드 수정**: `BackHandler.removeEventListener` → `subscription.remove()`, `URL.pathname` read-only 대응
- **검증**: tsc 0 에러, 114 tests 통과 (FE 83 + Edge 31), `ait build` → `taillog-app.ait` 4.9MB
- **`brick-module@0.5.0`** 코드모드에 의해 자동 추가

## 운영 하네스 (2026-04-02)

vibehub-media 하네스 이식 완료:
- **Commands**: `/learn`, `/doc-update`, `/self-review`, `/token-lint` (`.claude/commands/`)
- **Hook**: `post-edit-typecheck` — src/ 편집 시 `tsc --noEmit` 자동 실행 (`.claude/hooks/`)
- **MCP**: `code-review-graph` 서버 등록 (346 files, 1269 nodes, 6580 edges)
- **Config**: `.claude/settings.json`에 PostToolUse hook 등록, `.code-review-graphignore` 추가

## Edge Function 상태

| 함수 | 버전 | verify_jwt | mTLS | 상태 |
|------|------|-----------|------|------|
| `login-with-toss` | v18→재배포 | false | **real** | 신규 프로젝트 재배포, 신규 mTLS 인증서 적용 |
| `verify-iap-order` | v17→재배포 | true | **real** | 신규 프로젝트 재배포 |
| `send-smart-message` | v14→재배포 | true | **real** | 신규 프로젝트 재배포 |
| `grant-toss-points` | v14→재배포 | true | **real** | 신규 프로젝트 재배포 |
| `legal` | v13→재배포 | false | — | 신규 프로젝트 재배포 |
| `toss-disconnect` | v17→ping수정 | false | — | ping(빈 body) 200 pong 처리 추가, 콘솔 콜백 검증 대기 |
| `generate-report` | v8→재배포 | true | — | 신규 프로젝트 재배포 |
| `withdraw-user` | v3 | false | — | 신규 배포: verify_jwt=false + 내부 Admin API JWT검증(ES256 호환), public/auth 실삭제 |
| `assign-b2b-role` | v2 | false | **real** | 재배포(2026-04-21): 올바른 프로젝트(gxvtgrcqkbdibkyeqyil)에 배포, verify_jwt=false + 내부 JWT 수동 검증 |

> **신규 프로젝트**: `gxvtgrcqkbdibkyeqyil` (2026-04-20 이전, Toss 미니앱 전용)

## Parity ID 추적 (요약)

| Parity ID | 도메인 | 상태 | 완료 항목 | 잔여 |
|-----------|--------|------|----------|------|
| AUTH-001 | 인증 | Done | login.tsx 토큰화, AuthContext, usePageGuard, login-with-toss v18 real mTLS, 실기기 200/400 증적 + withdraw-user Edge(v3, ES256 호환) | — |
| APP-001 | 앱 셸 | In Progress | 23라우트, _app.tsx, 레이아웃 5종, 딥엔트리 3종 | 실기기 라우팅 완전 검증 |
| UI-001 | 디자인 | In Progress | 52컴포넌트, 토큰 중앙화 70+파일, Lottie 3종, 상태UI 8화면 | 실기기 비주얼 QA |
| LOG-001 | 행동 기록 | In Progress | 대시보드/빠른기록/상세기록/분석, backend-first 전환 + useDeleteLog 낙관적 삭제 훅 + LogCard 롱프레스 UI (2026-04-20) | FastAPI 로그 API 실기기 E2E |
| AI-001 | AI 코칭 | In Progress | 6블록 코칭, 피드백, BE-P5, backend-first, 실연동 E2E 완료(2026-04-20): subscriptions drift 수정, max_tokens 1800, ownership 검증, CoachingGenerationLoader 5단계, FreeBlock Plan C | 실기기 QA (typing/Lottie/bg-flash 시각 확인) |
| AI-COACHING-ANALYTICS-001 | 코칭 행동 분석 | Done | `_build_behavior_analytics_text()`, Behavior Analytics 프롬프트 섹션, `analytics_metadata` 반환, AnalysisBadge 프론트 통합, `/behavior-analytics` API, pytest 5/5 | — |
| UI-TRAINING-PERSONALIZATION-001 | 훈련 추천 개인화 | QA | `getRecommendationsV2` ScoreBand, `useBehaviorAnalytics` useQuery, academy 3섹션(AI추천/관련훈련/전체), cold start fallback, RecommendedCurriculumCard, RelatedCurriculumCarousel, StreakBadge, `useStepAttempts`+`AttemptHistorySheet` 실데이터 연결 완료(2026-04-23), tsc 0 errors | 실기기 시각 QA (AttemptHistorySheet 렌더 + InsightSummaryBar 애니) |
| UI-TRAINING-DETAIL-001 | 훈련 상세 UX | QA | `training_step_attempts` DB 마이그레이션+RLS, StepCompletionSheet 2경로, StepAttemptHistory(PRO), ReactionTrendBar(PRO), detail.tsx useSubmitStepAttempt 연결, RecordModal B2B 훈련이력 탭, StreakBadge/ReactionTrendBar/AttemptHistorySheet 실데이터 배치 완료(2026-04-23), tsc 0 errors | 실기기 시각 QA (StreakBadge Day2+ 확인, 반응 그래프, 이력 시트) |
| AI-TRAIN-001 | 훈련 데이터 플라이휠 | InProgress | 합성 생성(synthetic.py) + 품질 태깅(training.py) + admin API 3개(ADMIN_API_KEY 인증) + migration(training_candidate/quality_score/approved/synthetic 컬럼) + 자동화 2개(daily 08:00 / weekly 일 09:00) | Supabase Edge Function 포팅, ADMIN_API_KEY .env 값 설정, pg_cron 스케줄 등록 |
| IAP-001 | 결제 | In Progress | 구독 화면, useIsPro, verifyAndGrant, Edge v12, iap.test 9케이스, 서버 3시나리오+복구 재검증 증적 + DB 영속(5건) 확인 | 실기기 결제 UI 3시나리오 증적 정리 |
| MSG-001 | 알림 | In Progress | Edge v9, 쿨다운, noti_history 영속, 우회차단, 테스트 통과, Sandbox 실발송 완료(2026-04-20, A/B안 발송됨) | 토스팀 검토 승인 후 FastAPI 연동(templateCode: taillog-app-TAILLOG_BEHAVIOR_REMIND) |
| AD-001 | 광고 | Done | 타입, mock SDK, useRewardedAd, R1/R2/R3 통합, test 5케이스 | 실 Ad Group ID 교체 + Sandbox 검증 |
| B2B-001 | B2B 운영 | In Progress | P1~P7, 스키마 정합, roleGuard test 8케이스, BE-P7, `/ops/setup` 페이지(2026-04-21), `create_organization` RPC(2026-04-21), `assign-b2b-role` Edge(2026-04-21), B2B 무료 전환(2026-04-21), `/dashboard` B2B 배너(2026-04-21), `/ops/dog-add` 페이지(2026-04-21), `createOrgDog()` API(2026-04-21) | 40마리 FlatList 성능, 공유 링크, B2C 회귀, verify_parent_phone RPC |
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
| FE->BE 연결 | 완료 | adb reverse 방식 전환 완료, Wi-Fi 백업 가능 |
| AUTH | 진행 | 실기기 200/400 증적 확보, 문서/스크린샷 정리 |
| IAP | 진행 | 앱 UI 기준 결제/복구/실패 3시나리오 증적 정리 |
| MSG | 진행 | Smart Message 신청/승인 대기 + Sandbox 실발송 미검증 |
| AD | **보류** | 실 Ad Group ID 교체 보류 — 계좌사본 미비로 사업자 광고 심사 불가. ENV 구조(AIT_AD_R1/R2/R3)는 준비 완료 |
| UI | 진행 | 실기기 비주얼 QA |
| Edge 7종 | 진행 | happy-path payload 실검증 잔여 |
| BE (FastAPI) | 완료 | - |
| DB (INFRA-1) | 완료 | - |
| mTLS | **완료** | Secrets 등록 + 4종 Edge Function real 모드 배포 완료 |

## Mock/Placeholder 목록

> 공식 API 레퍼런스: `docs/ref/AIT-ADS-SDK-REFERENCE.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md`
> SDK 마이그레이션: `docs/ref/AIT-SDK-2X-MIGRATION.md` | 퍼블리싱: `docs/ref/AIT-PUBLISHING-READINESS.md`

| 항목 | 위치 | 전환 필요 |
|------|------|----------|
| Ads SDK | `src/lib/ads/config.ts` | 실 Ad Group ID 교체 **보류** — 계좌사본 없어 광고 심사 불가. ENV 준비됨(AIT_AD_R1/R2/R3 fallback) |
| IAP 래퍼 | `src/lib/api/iap.ts` | 실 SDK 교체 |
| generate-report | `supabase/functions/generate-report/` | `REPORT_AI_MODE=real` + 실 OpenAI 키 |
| ~~verify-iap-order~~ | `supabase/functions/verify-iap-order/` | ✅ real mTLS 전환 완료 (v17) |
| ~~send-smart-message~~ | `supabase/functions/send-smart-message/` | ✅ real mTLS 전환 완료 (v14) |
| ~~grant-toss-points~~ | `supabase/functions/grant-toss-points/` | ✅ real mTLS 전환 완료 (v14) |
| IAP 복원 | `src/lib/api/subscription.ts:62` | Toss IAP 복원 API 공개 대기 |

## 테스트 현황

| 구분 | 상태 | 수치 |
|------|------|------|
| FE 단위 | 완료 | 83 tests, 11 suites |
| BE 단위 | 완료 | pytest 39 tests |
| Edge 단위 | 완료 | 31 tests, 12 suites |
| BE<->DB 통합 | 미구현 | FastAPI + 실 Supabase 연결 테스트 필요 |
| E2E | 부분 | 로그인 + Edge smoke, IAP/AD happy-path 미검증 |
| 성능 | 미구현 | 40마리 FlatList, API p95 < 300ms |

## 크리티컬 패스 블로커

### CRITICAL
1. ~~SDK 2.x 마이그레이션~~ → ✅ 완료 (2026-04-02)
2. ~~Edge Function real mTLS~~ → ✅ 완료 (2026-04-02, Secrets 등록 + 4종 재배포)
3. ~~P1 Ready 페이지 4개~~ → ✅ 완료 (2026-04-02, 16/21→19/21 Done)

### HIGH
4. IAP E2E 테스트 (Sandbox 결제 플로우)
5. B2B RPC 함수 (`verify_parent_phone_last4`)
6. Ads 실 Ad Group ID 교체 + 검증
7. B2B P2 페이지 2개 (`/ops/settings`, `/parent/reports`) → 21/21 Done

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

## 진행도 체크리스트 (2026-04-02 신규)

> 상세: `docs/status/PROGRESS-CHECKLIST.md`

| 영역 | 완성도 | 핵심 잔여 |
|------|--------|----------|
| FE 페이지 | 95% | Ready 2페이지 (B2B P2) |
| FE 컴포넌트 | 90% | mock 3곳 전환 |
| Backend | 95% | BE↔DB 통합 테스트 |
| DB/Infra | 95% | ~~mTLS 실 인증서~~ ✅ 완료 |
| Toss SDK | 85% | ~~SDK 2.x~~ ✅ + Ads 실 ID 교체 |
| 테스트 | 60% | E2E/성능 미구현 |
| 퍼블리싱 | 55% | mTLS 완료, 심사 요건 일부 미충족 |
| **종합** | **82%** | 실기기 E2E + Ads ID + B2B 2페이지 |

## 비고

- 세션 운영 원칙: 완료된 상세 항목은 `CLAUDE.md`에 장문으로 누적하지 않고 본 문서 또는 도메인 기록 문서로 이동한다.
