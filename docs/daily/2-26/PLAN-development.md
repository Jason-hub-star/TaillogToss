# TaillogToss — 사업자등록 전 선행 개발 플랜

## 진행 현황 (2026-02-27 기준)

- [x] Phase 1: 프로젝트 초기화 + 16 라우트
- [x] Phase 2: 타입 시스템 12파일 + index
- [x] Phase 3: TDS-ext 6 + shared 6 + features skeleton
- [x] Phase 4: ChartWebView + generateChartHTML + transformers
- [x] Phase 5: API 9개 + 훅 8개 + AuthContext + ActiveDogContext
- [x] Phase 6: 온보딩 5페이지 + Survey 8컴포넌트
- [x] Phase 7: 대시보드 3페이지 + 6컴포넌트
- [x] Phase 8: 코칭/훈련 3페이지 + 7컴포넌트 + curriculum data
- [x] Phase 9: 반려견/설정 5페이지
- [x] Phase 10: 순수 가드 4개 + 가드 훅 1개 + 훅 3개 + 온보딩 네비 + 딥엔트리 + 안정화
- [x] Phase 11: Supabase Edge Functions + 보안 (코드/테스트/런타임 invoke 증적 완료)
- [x] Phase 12: 광고 (Toss Ads SDK R1/R2/R3, mock SDK 기준 완료)
- [ ] Phase 13: E2E 테스트 + 배포 준비 (진행중: Playbook 작성 완료, Sandbox 실기기 검증 대기)

검증: `npm run typecheck` ✅ | `npm test` ✅ (`test:app` + `test:edge` 분리, timeout 해소)

---

## Context

현재 TaillogToss 프로젝트는 **Phase 12까지 완료, Phase 13 대기** 상태.
사업자등록까지 약 1주일 소요 예상. 이 기간 동안 Toss 인증서/콘솔 없이도 가능한
**프론트엔드 중심 개발**을 최대한 진행하여, 등록 후 mock→실제 연동 교체만으로 런칭 준비를 마친다.

> 참고: 이 문서 하단의 상세 섹션 제목(Phase 11~13)은 초기 작성 시점의 레거시 명칭이 일부 남아 있다.
> 최신 Phase 상태 표준은 `CLAUDE.md`와 본 문서 상단 진행 현황을 따른다.

**핵심 전략**: 프론트엔드 먼저 → BE/FE 도메인 미러 구조 유지 (DogCoach 패턴 계승)

### BE ↔ FE 미러 구조 (DogCoach 패턴)
```
types/{domain}.ts        ↔ Backend/app/models/{domain}.py
lib/api/{domain}.ts      ↔ Backend/app/routers/{domain}.py
lib/hooks/use{Domain}.ts ↔ Backend/app/services/{domain}.py
```

### DogCoach → TaillogToss 도메인 매핑
| DogCoach 도메인 | TaillogToss 도메인 | 변경 유형 |
|-----------------|-------------------|-----------|
| `dog` | `dog` | 유지 |
| `behavior_log` | `log` | 이름 단축 |
| `solution` + `coach` | `coaching` | 2→1 통합 |
| `auth` + `user` | `auth` | 2→1 통합 |
| — | `training` | 신규 (훈련 아카데미) |
| — | `subscription` | 신규 (Toss IAP) |
| — | `settings` | 신규 (알림/개인설정) |
| — | `notification` | 신규 (Smart Message) |

### 비즈니스 규칙 (PRD 기준)
- **멀티독**: 무료 1마리, PRO 5마리
- **IAP 상품**: PRO 월간 ₩4,900 (비소모품) / AI 토큰 10회 ₩1,900 (소모품) / AI 토큰 30회 ₩4,900 (소모품)
- **광고**: 토스 Ads SDK 2.0 — Rewarded만 v1 사용, 터치포인트 R1(survey-result), R2(dashboard), R3(coaching-result)
- **가격 기준일**: 2026-02-26

### 최근 업데이트 (2026-02-27)
- `supabase/functions/`에 Phase 11 Edge Function 4종 + `_shared` 보안 유틸 7종 구현
- `supabase/config.toml`에 `verify_jwt` 정책 반영 (`login-with-toss=false`, 나머지 `true`)
- FE API 계약 정합성 반영 (`authorizationCode`, `idempotencyKey`, `templateCode` 매핑)
- Parity 문서 업데이트 (`docs/11-FEATURE-PARITY-MATRIX.md`)
- Jest 실행 경로 분리 (`test:app`, `test:edge`)로 Edge retry timeout 이슈 해소
- `noti_history` 확장 스키마 적용 + `send-smart-message` service_role 영속 insert 연동
- Edge Function Deno main 엔트리 추가 (`main.ts`) 및 `supabase/config.toml` entrypoint 전환
- Supabase 런타임 invoke 로그 8건 확보 (4개 함수 성공/실패 1건씩)
- `send-smart-message` 런타임 DB insert 성공 증적 확보 (`error_code=null`, FK 유효 user_id 케이스)

### 다음 플랜 (2026-02-27)
1. Phase 13 착수 준비
   - [x] E2E 시나리오 템플릿 작성 (AUTH/IAP/MSG/AD 성공/실패)
   - [x] Sandbox 실기기 검증 체크리스트 문서화
   - 참고: `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md`
2. Mock→실연동 전환 대기 항목 정리
   - mTLS 인증서 적용 경로 확정 (`supabase/functions/_shared/mTLSClient.ts`)
   - 실 Ad Unit ID 교체 포인트 확정 (`src/lib/ads/config.ts`)
3. 문서/게이트 정합성 유지
   - `docs/11`, `docs/12`, `docs/2-27` 동기화 유지
   - 세션 종료 시 완료 포맷(Self-Review/Next-Session Docs/Next Recommendations) 고정 보고

---

## Phase 1: 프로젝트 스캐폴딩 (Day 1)

**목표**: 빌드 가능한 RN 프로젝트 뼈대 생성
**Parity**: APP-001

| # | 작업 | 파일 |
|---|------|------|
| 1-1 | `@apps-in-toss/react-native-framework` 템플릿으로 프로젝트 초기화 | `package.json`, `tsconfig.json`, `.gitignore`, `app.json` |
| 1-2 | 핵심 의존성 설치 | `@toss/tds`, `@supabase/supabase-js`, `@tanstack/react-query`, `@granite-js/native/react-native-webview` |
| 1-3 | 디렉토리 구조 생성 | 아래 트리 참조 |
| 1-4 | ESLint + Prettier + tsconfig strict | `.eslintrc.js`, `.prettierrc` |

```
pages/                    # Granite 라우터 엔트리 (thin re-export) — require.context 스캔 대상
  _404.tsx
  login.tsx
  onboarding/
    welcome.tsx, survey.tsx, survey-result.tsx, notification.tsx
  dashboard/
    index.tsx, quick-log.tsx, analysis.tsx
  coaching/
    result.tsx
  training/
    academy.tsx, detail.tsx
  dog/
    profile.tsx, switcher.tsx, add.tsx
  settings/
    index.tsx, subscription.tsx
src/
  _app.tsx                # Granite.registerApp 앱 컨테이너
  router.gen.ts           # 자동 생성 (라우트 타입 선언)
  pages/                  # 실제 페이지 컴포넌트 (createRoute) — 로직은 components/features/로 위임
    login.tsx
    onboarding/
      welcome.tsx, survey.tsx, survey-result.tsx, notification.tsx
    dashboard/
      index.tsx, quick-log.tsx, analysis.tsx
    coaching/
      result.tsx
    training/
      academy.tsx, detail.tsx
    dog/
      profile.tsx, switcher.tsx, add.tsx
    settings/
      index.tsx, subscription.tsx
  components/             # 3계층 구조 (DogCoach 패턴 계승)
    tds-ext/              # ① TDS 갭 보완 프리미티브 (DogCoach ui/ 대체)
      Chip.tsx, ChipGroup.tsx, Accordion.tsx, SpeechBubble.tsx,
      DateTimePicker.tsx, EmptyState.tsx, ErrorState.tsx
    shared/               # ② 앱 전역 공용 (레이아웃 + 유틸 컴포넌트)
      layouts/
        ListLayout.tsx, DetailLayout.tsx, FormLayout.tsx,
        TabLayout.tsx, ModalLayout.tsx
      ads/
        RewardedAdButton.tsx
    features/             # ③ 도메인별 화면 전용 컴포넌트
      survey/             #   SurveyContainer, Step1~7, BehaviorTypeBadge
      dashboard/          #   DogCard, StreakBanner, QuickLogChips
      log/                #   LogCard, ABCForm
      coaching/           #   CoachingBlock, PlanSelector
      training/           #   CurriculumCard, MissionChecklist
      dog/                #   DogProfileForm
      settings/           #   SubscriptionCompare
  lib/
    api/                  # Supabase 클라이언트 + 도메인별 API
    hooks/                # 도메인별 커스텀 훅
    charts/               # ChartWebView
    guards/               # auth/onboarding/feature 가드
    analytics/            # 이벤트 트래커
    data/                 # 정적 데이터 (커리큘럼 등)
    security/             # PII 가드, rate-limit 유틸
  types/                  # 도메인별 타입 (BE 미러)
  stores/                 # QueryClient, Context providers
supabase/
  functions/              # Edge Function 스켈레톤
    _shared/              # 공통 유틸 (mTLS, 멱등, 서킷브레이커)
    login-with-toss/
    verify-iap-order/
    send-smart-message/
    grant-toss-points/
```

### 컴포넌트 3계층 규칙 (DogCoach 패턴)
```
의존 방향:  tds-ext ← shared ← features ← src/pages
```
| 계층 | 역할 | import 가능 대상 | import 금지 |
|------|------|-----------------|------------|
| `tds-ext/` | TDS 갭 보완 프리미티브 | `@toss/tds`, `types/` | shared, features |
| `shared/` | 앱 전역 레이아웃/유틸 | `tds-ext/`, `@toss/tds`, `lib/`, `types/` | features |
| `features/` | 도메인별 화면 전용 | `tds-ext/`, `shared/`, `@toss/tds`, `lib/`, `types/` | 다른 features/ 폴더 |
| `src/pages/` | 실제 페이지 (createRoute) | 모두 가능 | — |

**핵심**: features/ 간 상호 import 금지 → 공유 필요 시 shared/로 승격

### 검증
- `npm run dev` 실행 → 빈 화면 로드 성공

---

## Phase 2: 타입 시스템 전체 정의 (Day 1~2)

**목표**: 모든 도메인 타입을 BE 미러 구조로 정의. DogCoach 모델 참조.
**Parity**: 전체 (APP-001 ~ B2B-001)

| # | 파일 | 참조 원본 (DogCoach) | 주요 변경점 |
|---|------|---------------------|-------------|
| 2-1 | `types/auth.ts` | `models/user.py` + `lib/types.ts` | `kakao_sync_id` → `toss_user_key`, Role: `user|trainer|org_owner|org_staff`, `pepper_version` 추가 |
| 2-2 | `types/dog.ts` | `models/dog.py` | `DogEnv`, `SurveyData` 7단계, `DogSex` enum |
| 2-3 | `types/log.ts` | `models/log.py` | `QuickLogCategory` 8종, `DailyActivityCategory` 6종, `IntensityLevel` 1-10 |
| 2-4 | `types/coaching.ts` | `models/coaching.py` | 6블록: insight/action_plan/dog_voice/next_7_days/risk_signals/consultation_questions |
| 2-5 | `types/training.ts` | 신규 | 커리큘럼 7종, TrainingDay, TrainingStep, PlanVariant(A/B/C) |
| 2-6 | `types/subscription.ts` | `models/payment.py` | PRO ₩4,900(비소모), 토큰10 ₩1,900(소모), 토큰30 ₩4,900(소모), `TossOrder`(toss_status 6종, grant_status 5종), 멀티독 제한(무료1/PRO5) |
| 2-7 | `types/notification.ts` | 신규 | SmartMessage, CooldownPolicy(10분1회/하루3회, 야간금지 22~08시) |
| 2-8 | `types/settings.ts` | `lib/types.ts` | NotificationPref(channels, types, quiet_hours), AiPersona(tone, perspective) |
| 2-9 | `types/chart.ts` | 신규 | RadarChartData(5축), HeatmapData(요일x시간), BarChartData, LineChartData |
| 2-10 | `types/api.ts` | 신규 | ApiResponse\<T\>, PaginatedResponse\<T\>, ErrorCode enum |
| 2-11 | `types/ads.ts` | 신규 | AdPlacement(R1/R2/R3), RewardedAdState, AdFallbackPolicy(무광고 폴백) |
| 2-12 | `types/b2b.ts` | `docs/SCHEMA-B2B.md` | Organization, OrgMember, OrgDog 등 10개 빈 인터페이스 (v1 숨김, Phase 7+) |

### 검증
- `npx tsc --noEmit` 타입 체크 통과

---

## Phase 3: TDS 커스텀 컴포넌트 + 레이아웃 (Day 2~3)

**목표**: 3계층 컴포넌트 구조 구축 — tds-ext(갭 7종) + shared(레이아웃 5종 + 광고 1종)
**Parity**: UI-001
**참조**: `.claude/skills/toss-guide/core/toss_wireframes/SKILL.md` (레이아웃 패턴 A~E), `.claude/skills/toss-guide/core/toss_apps/SKILL.md`

**① tds-ext/ — TDS 갭 보완 프리미티브**

| # | 컴포넌트 | 파일 | TDS 갭 대안 |
|---|----------|------|------------|
| 3-1 | Chip / ChipGroup | `components/tds-ext/Chip.tsx` | `TouchableOpacity` + `Badge` 래퍼 |
| 3-2 | Accordion | `components/tds-ext/Accordion.tsx` | `Animated.View` height 보간 |
| 3-3 | SpeechBubble | `components/tds-ext/SpeechBubble.tsx` | `View` + `Shadow` + `Border` |
| 3-4 | DateTimePicker | `components/tds-ext/DateTimePicker.tsx` | `SegmentedControl` + `Dropdown` + `NumericSpinner` |
| 3-5 | EmptyState | `components/tds-ext/EmptyState.tsx` | TDS `Result` 래퍼 |
| 3-6 | ErrorState | `components/tds-ext/ErrorState.tsx` | TDS `ErrorPage` 래퍼 |

**② shared/ — 앱 전역 공용**

| # | 컴포넌트 | 파일 | 용도 |
|---|----------|------|------|
| 3-7 | ListLayout (패턴A) | `components/shared/layouts/ListLayout.tsx` | 대시보드, 훈련 목록 |
| 3-8 | DetailLayout (패턴B) | `components/shared/layouts/DetailLayout.tsx` | 코칭 결과, 프로필 |
| 3-9 | FormLayout (패턴C) | `components/shared/layouts/FormLayout.tsx` | 설문, 기록 입력 |
| 3-10 | TabLayout (패턴D) | `components/shared/layouts/TabLayout.tsx` | 대시보드 3탭 |
| 3-11 | ModalLayout (패턴E) | `components/shared/layouts/ModalLayout.tsx` | 바텀시트 공통 |
| 3-12 | **RewardedAdButton** | `components/shared/ads/RewardedAdButton.tsx` | 토스 Ads SDK 래퍼 (mock), 실패 시 무광고 폴백 |

**③ features/ 스켈레톤 — 빈 폴더 + README 생성**

| 폴더 | 용도 | Phase 6~9에서 채움 |
|------|------|--------------------|
| `components/features/survey/` | 설문 위저드 | Phase 6 |
| `components/features/dashboard/` | 대시보드 카드/배너 | Phase 7 |
| `components/features/log/` | ABC 기록 카드/폼 | Phase 7 |
| `components/features/coaching/` | 코칭 블록/플랜 선택 | Phase 8 |
| `components/features/training/` | 커리큘럼 카드/미션 | Phase 8 |
| `components/features/dog/` | 프로필 폼 | Phase 9 |
| `components/features/settings/` | 구독 비교표 | Phase 9 |

### 검증
- 각 tds-ext 컴포넌트 단독 렌더링 확인
- shared/layouts 각 패턴에 children 렌더링 확인
- features/ 간 상호 import 없음 확인 (ESLint rule 또는 수동)

---

## Phase 4: 차트 시스템 (Day 3)

**목표**: WebView + Chart.js 기반 Radar/Heatmap 차트
**Parity**: UI-001
**참조**: `.claude/skills/toss-guide/core/toss_apps/SKILL.md` Section 7.6

| # | 작업 | 파일 |
|---|------|------|
| 4-1 | ChartWebView 기반 컴포넌트 | `lib/charts/ChartWebView.tsx` |
| 4-2 | Chart.js HTML 생성기 (radar, heatmap, line) | `lib/charts/generateChartHTML.ts` |
| 4-3 | 데이터 변환 유틸 (BehaviorLog[] → 차트 데이터) | `lib/charts/transformers.ts` |

### 검증
- 샘플 데이터로 Radar/Heatmap 렌더링 확인

---

## Phase 5: API 클라이언트 + 상태 관리 (Day 3~4)

**목표**: Supabase 클라이언트, TanStack Query, 도메인별 API/훅 구축
**Parity**: APP-001, AUTH-001

| # | 작업 | 파일 |
|---|------|------|
| 5-1 | Supabase 클라이언트 | `lib/api/supabase.ts` |
| 5-2 | TanStack Query 설정 | `stores/queryClient.ts`, `stores/QueryProvider.tsx` |
| 5-3 | Query Key 팩토리 | `lib/api/queryKeys.ts` |
| 5-4 | API 클라이언트 기반 | `lib/api/client.ts` |
| 5-5 | 도메인별 API (8개) | `lib/api/{auth,dog,log,coaching,training,subscription,settings,notification}.ts` |
| 5-6 | 도메인별 훅 (8개) | `lib/hooks/use{Auth,Dogs,Logs,Coaching,Training,Subscription,Settings,Notification}.ts` |
| 5-7 | AuthContext | `stores/AuthContext.tsx` |
| 5-8 | ActiveDogContext (멀티독 전환, 무료1/PRO5 제한 적용) | `stores/ActiveDogContext.tsx` |

### 검증
- mock 데이터로 useQuery 호출 → 데이터 반환 확인

---

## Phase 6: 화면 구현 — 온보딩 (Day 4~5)

**목표**: Journey A (Cold Start) 전체: login → welcome → survey(7단계) → survey-result → notification
**Parity**: AUTH-001, UI-001
**참조**: `.claude/skills/toss-guide/core/toss_wireframes/SKILL.md` (9-1, 9-2), `.claude/skills/toss-guide/core/toss_journey/SKILL.md`

| # | 화면 | 파일 | 핵심 | 상태 처리 |
|---|------|------|------|-----------|
| 6-1 | 로그인 | `src/pages/login.tsx` | Logo + "토스로 시작하기" (mock appLogin) | 로딩(Loader)/에러(Toast) |
| 6-2 | 웰컴 | `src/pages/onboarding/welcome.tsx` | 가치 제안 + "시작하기 (90초)", 최초 1회만 | — |
| 6-3 | 설문 7단계 | `src/pages/onboarding/survey.tsx` | DogCoach SurveyContainer 패턴 포팅, ProgressBar | 단계별 유효성 검사 |
| 6-4 | 설문 결과 | `src/pages/onboarding/survey-result.tsx` | 행동 유형 Badge + 위험도 ProgressBar + **R1 RewardedAdButton** | Skeleton 블러 잠금 |
| 6-5 | 알림 설정 | `src/pages/onboarding/notification.tsx` | Checkbox x3 (리마인더ON/급증ON/프로모션OFF 기본값) | — |

### 검증
- login → welcome → survey → survey-result → notification 전체 플로우 이동 확인
- R1 광고 버튼 노출 확인 (mock 모드)

---

## Phase 7: 화면 구현 — 대시보드 + 기록 (Day 5~6)

**목표**: Journey B (Daily Loop): dashboard → quick-log → dashboard 갱신
**Parity**: UI-001, LOG-001
**참조**: 와이어프레임 9-3, 9-4, 9-5 + 보강 11.3-7, 11.3-8

| # | 화면 | 파일 | 핵심 | 상태 처리 |
|---|------|------|------|-----------|
| 7-1 | 대시보드 | `src/pages/dashboard/index.tsx` | Tab 3탭 + 오늘의 코칭 + 스트릭 + ABC 목록 | 로딩(Skeleton)/0건(EmptyState)/3건+(전체)/에러(ErrorState) |
| 7-2 | 빠른 기록 | `src/pages/dashboard/quick-log.tsx` | 빠른(8+6칩 원탭)/상세(ABC폼) 2탭, Chip+Accordion+DateTimePicker 활용 | — |
| 7-3 | 분석 | `src/pages/dashboard/analysis.tsx` | BarChart + Radar(WebView) + Heatmap(WebView) + **R2 RewardedAdButton** | SegmentedControl(주간/월간/전체) |

### 검증
- 빠른 기록 → 대시보드 반영 플로우 확인
- R2 광고 버튼 노출 확인 (mock 모드)

---

## Phase 8: 화면 구현 — 코칭 + 훈련 (Day 6~7)

**목표**: Journey D (Deep-Dive): coaching-result → training-academy → training-detail
**Parity**: AI-001, UI-001

| # | 화면 | 파일 | 핵심 | 상태 처리 |
|---|------|------|------|-----------|
| 8-1 | AI 코칭 결과 | `src/pages/coaching/result.tsx` | 6블록(3무료+3잠금) + SpeechBubble + **R3 RewardedAdButton** + Plan B/C 바텀시트 | Skeleton 블러 잠금 |
| 8-2 | 훈련 아카데미 | `src/pages/training/academy.tsx` | GridList 7커리큘럼 + ProgressBar + Badge(추천/진행/미시작/잠금), 무료 1개 PRO 7개 | — |
| 8-3 | 훈련 상세 | `src/pages/training/detail.tsx` | 체크리스트 + 메모 + "어려워요"→Plan B/C 바텀시트 + "미션 완료" | — |
| 8-4 | 커리큘럼 정적 데이터 | `lib/data/curriculum.ts` | 7종 x 5~6일 x 3스텝, PlanVariant A/B/C |

### 검증
- 코칭 결과 → 훈련 추천 → 상세 진입 플로우
- R3 광고 버튼 노출 확인 (mock 모드)

---

## Phase 9: 화면 구현 — 반려견/설정 (Day 7)

**목표**: Journey C (Multi-Dog) + Journey E (Monetization) 화면
**Parity**: UI-001, APP-001, IAP-001

| # | 화면 | 파일 | 핵심 |
|---|------|------|------|
| 9-1 | 반려견 프로필 | `src/pages/dog/profile.tsx` | Asset(프로필) + TextField x4 + Accordion(환경/건강/트리거) + "삭제" Dialog |
| 9-2 | 반려견 전환 (바텀시트) | `src/pages/dog/switcher.tsx` | ListRow x N + Badge("선택") + "+ 추가" (무료1/PRO5 제한 적용) |
| 9-3 | 반려견 추가 | `src/pages/dog/add.tsx` | survey 축소판 (이름+품종+나이 3필드) |
| 9-4 | 설정 | `src/pages/settings/index.tsx` | 4섹션(알림/계정/서비스/기타) + Switch + 로그아웃/탈퇴 Dialog |
| 9-5 | 구독/IAP | `src/pages/settings/subscription.tsx` | 무료vs PRO 비교표 + SegmentedControl(월간/토큰) + IAP mock + "복원" TextButton |

### 검증
- 멀티독 전환 → 대시보드 데이터 변경 확인
- 무료 사용자 2마리 추가 시도 → featureGuard 차단 확인

---

## Phase 10: 네비게이션 + 가드 + 인게이지먼트 (Day 7)

**목표**: 33개 화면 전환 라우팅 + 가드 체인 + 인게이지먼트 훅
**Parity**: APP-001, AUTH-001
**참조**: `.claude/skills/toss-guide/core/toss_journey/SKILL.md` Section 11.5 (33행 전환 테이블)

| # | 작업 | 파일 |
|---|------|------|
| 10-1 | 파일 기반 라우팅 연결 (33개 전환 경로) | `src/pages/` 전체 |
| 10-2 | authGuard | `lib/guards/authGuard.ts` |
| 10-3 | onboardingGuard | `lib/guards/onboardingGuard.ts` |
| 10-4 | featureGuard (PRO 체크 + 멀티독 제한) | `lib/guards/featureGuard.ts` |
| 10-5 | 딥엔트리 라우팅 3종 (quick-log, daily-coach, training-today) | `lib/guards/deepEntry.ts` |
| 10-6 | 이벤트 트래커 (7개 이벤트) | `lib/analytics/tracker.ts` |
| 10-7 | 스트릭 카운터 (연속 기록일 계산) | `lib/hooks/useStreak.ts` |
| 10-8 | Re-engagement 훅 (3일 미접속 감지, 스트릭 유지 알림 트리거) | `lib/hooks/useReengagement.ts` |

### 검증
- 미로그인 → login 리다이렉트, 미설문 → survey 리다이렉트 확인
- 딥엔트리 파라미터 프리필 확인 (`?type=barking&location=home`)
- 스트릭 카운트 증가 확인

---

## Phase 11: Supabase Edge Function + 보안 (Day 7~사업자등록 후)

**목표**: 4개 Edge Function + 보안 유틸 전체 구현 (mock Toss 응답). 등록 후 mock만 교체.
**Parity**: AUTH-001, IAP-001, MSG-001

| # | Function | 파일 | 핵심 |
|---|----------|------|------|
| 11-1 | login-with-toss | `supabase/functions/login-with-toss/index.ts` | OAuth2 → PBKDF2(pepper versioning) → Supabase Auth, verify_jwt=false |
| 11-2 | verify-iap-order | `supabase/functions/verify-iap-order/index.ts` | 6상태(PURCHASED/PAYMENT_COMPLETED/FAILED/REFUNDED/ORDER_IN_PROGRESS/NOT_FOUND), 멱등 + 서킷브레이커(5연속실패→30초fast-fail) |
| 11-3 | send-smart-message | `supabase/functions/send-smart-message/index.ts` | 빈도 제한(10분1회/하루3회, 22~08시 금지) + 템플릿 변수, 관리자 Role 체크 |
| 11-4 | grant-toss-points | `supabase/functions/grant-toss-points/index.ts` | 3-step key(get-key→execute→result), 에러코드(4100/4109/4110/4112/4113), 관리자 Role 체크 |
| 11-5 | 공통 유틸 | `supabase/functions/_shared/` | 아래 상세 |
| 11-6 | Supabase 함수 설정 | `supabase/config.toml` | `verify_jwt`: login-with-toss=false, 나머지 true |

**11-5 공통 유틸 상세:**

| 파일 | 역할 |
|------|------|
| `mTLSClient.ts` | mTLS 클라이언트 (mock 스텁, 등록 후 실제 cert/key 교체) |
| `idempotency.ts` | 멱등키 처리 (edge_function_requests 테이블 활용) |
| `circuitBreaker.ts` | 서킷브레이커 (연속 N회 실패 → fast-fail) |
| `rateLimiter.ts` | Rate-limit (로그인 무인증 엔드포인트 방어) |
| `piiGuard.ts` | **PII 로깅 금지** — phone, ci, birthday, email, name, gender, nationality, accessToken, refreshToken 필터링 |
| `pepperRotation.ts` | **PBKDF2 pepper 회전** — 듀얼 pepper(V1/V2) 지원, 구 pepper 우선 시도 후 신 pepper 폴백 |

**보안 체크리스트:**
- [x] login-with-toss: Rate-limit + Nonce + 연속실패 차단 + PII 로그 금지
- [ ] login-with-toss: 요청 서명 검증 (실 mTLS 연동 시 활성화)
- [x] verify-iap-order: 멱등키 + 서킷브레이커 + 5xx만 재시도(최대2회, 지수백오프)
- [x] send-smart-message: 빈도 제한(10분1회/하루3회, 22~08시 금지)
- [x] send-smart-message: noti_history DB 영속 기록
- [x] grant-toss-points: key 1회 사용 제한 + 에러코드 분기

### 검증
- 구현 완료: mock 모드 기반 Edge Function 핸들러/공통 유틸 코드 반영
- `npm run typecheck` 통과
- 테스트 케이스 추가 완료(공통 유틸 + 함수별 시나리오), Jest 실행은 hang 이슈로 최종 로그 미확보

---

## Phase 12: DB 마이그레이션 스크립트 (Day 7~사업자등록 후)

**목표**: Alembic 마이그레이션으로 DogCoach DB → Toss 스키마 변환 (BigBang — 프로덕션 유저 없음)
**Parity**: AUTH-001, IAP-001, B2B-001

| # | 작업 | 파일 | 핵심 |
|---|------|------|------|
| 12-1 | users 테이블 변경 | `Backend/alembic/versions/xxx_toss_user.py` | `kakao_sync_id`→`toss_user_key`, `pepper_version` 추가, RLS 정책 |
| 12-2 | toss_orders 신규 | `Backend/alembic/versions/xxx_toss_orders.py` | toss_status 6종, grant_status 5종, idempotency_key UNIQUE |
| 12-3 | edge_function_requests 신규 | `Backend/alembic/versions/xxx_edge_requests.py` | 멱등 로그 테이블 |
| 12-4 | subscriptions 변경 | `Backend/alembic/versions/xxx_subscription.py` | PRO_YEARLY 제거, `ai_tokens_remaining`/`ai_tokens_total` 추가 |
| 12-5 | noti_history 신규 | `Backend/alembic/versions/xxx_noti_history.py` | Smart Message 발송 이력 + 쿨다운 추적 |
| 12-6 | B2B 빈 테이블 10개 | `Backend/alembic/versions/xxx_b2b_tables.py` | SCHEMA-B2B.md 기반, v1에서 데이터 없음 |

**모든 마이그레이션은 Up/Down 양방향 작성**

### 검증
- `alembic upgrade head` + `alembic downgrade -1` 왕복 성공
- B2B 테이블이 B2C 기능에 무영향 확인

---

## Phase 13: 연결해제 웹훅 + FastAPI 업데이트 (사업자등록 후)

**목표**: Toss 연결해제 콜백 + 구독/토큰 API 추가
**Parity**: AUTH-001, IAP-001

| # | 작업 | 파일 |
|---|------|------|
| 13-1 | 연결해제 웹훅 | `Backend/app/api/v1/endpoints/webhook.py` | referrer 3종(UNLINK/WITHDRAWAL_TERMS/WITHDRAWAL_TOSS) 분기, 데이터 보존 정책 |
| 13-2 | 구독 상태 API | `Backend/app/api/v1/endpoints/subscription.py` | 상태 조회, 토큰 잔여량, PRO 권한 미들웨어 |
| 13-3 | Supabase JWT 호환 확인 | `Backend/app/core/auth.py` | Edge Function 발급 토큰과 호환 확인 |

---

## 사업자등록 후 작업 (본 플랜 범위 밖)

등록 완료 시 아래만 추가:
1. **mTLS 인증서 발급** → `_shared/mTLSClient.ts` mock을 실제 cert/key로 교체
2. **IAP 상품 등록** → 실제 product ID 연결 (PRO ₩4,900 / 토큰10 ₩1,900 / 토큰30 ₩4,900)
3. **Smart Message 템플릿** → templateSetCode 연결
4. **광고 SDK** → `RewardedAdButton` mock을 토스 Ads SDK 실제 호출로 교체
5. **Sandbox 앱 E2E 테스트** (IAP 3시나리오: 성공/서버실패복구/에러)
6. **Toss QA 심사 제출**

---

## 커밋 전 체크리스트 (매 Phase 종료 시 적용, CLAUDE.md 준수)

1. [ ] RN 빌드 성공 확인 (`npm run dev`)
2. [ ] `npx tsc --noEmit` 타입 에러 0
3. [ ] 새 파일/수정 파일 상단에 1~3줄 기능 요약 주석 확인
4. [ ] Parity ID 매핑 확인 (`docs/11-FEATURE-PARITY-MATRIX.md`)
5. [ ] BE 모델 변경 시 FE 타입 동기화 확인
6. [ ] 인증/결제/광고 핵심 플로우 스모크 테스트 결과 첨부 (최소 1회, 해당 Phase만)

---

## 일정 요약

```
Day 1     Phase 1 (스캐폴딩) + Phase 2 시작 (타입)
Day 2     Phase 2 완료 (타입) + Phase 3 (컴포넌트+광고래퍼)
Day 3     Phase 3 완료 + Phase 4 (차트) + Phase 5 시작 (API/훅)
Day 4     Phase 5 완료 + Phase 6 시작 (온보딩+R1)
Day 5     Phase 6 완료 + Phase 7 시작 (대시보드/기록+R2)
Day 6     Phase 7 완료 + Phase 8 (코칭/훈련+R3)
Day 7     Phase 9 (반려견/설정) + Phase 10 (네비게이션/가드/인게이지먼트)
Day 7~    Phase 11 (Edge Function+보안) 구현/검증
Day 7~    Phase 12 (DB 마이그레이션) — `Backend/` 경로 확보 후 착수
등록 후   Phase 13 (웹훅) + mock→실제 교체 + Sandbox 테스트 + QA
```

**결과**: 사업자등록 시점에 **코드 ~90% 완성** → mock 교체 + 테스트만 남음

---

## 검수 결과 반영 내역

| 누락 항목 | 반영 위치 |
|----------|-----------|
| 광고 SDK (R1/R2/R3) 완전 누락 | Phase 2-11(타입), 3-7(래퍼), 6-4/7-3/8-1(화면), 사업자등록 후 #4 |
| IAP 상품 가격/유형 미명시 | Context 비즈니스 규칙, Phase 2-6, 사업자등록 후 #2 |
| 멀티독 제한 미명시 | Context 비즈니스 규칙, Phase 2-6, 5-8, 9-2, 10-4 |
| DB 마이그레이션 스크립트 누락 | Phase 12 신규 추가 (6개 마이그레이션) |
| 보안 세부 (PII/Rate-limit/pepper회전/웹훅) 부족 | Phase 11-5 상세화, Phase 13 신규 추가 |
| B2B 빈 타입/테이블 누락 | Phase 2-12, Phase 12-6 |
| DogCoach 도메인 매핑 불명확 | Context 도메인 매핑 테이블 추가 |
| 커밋 전 체크리스트 미반영 | 커밋 전 체크리스트 섹션 추가 |
| 화면 상태 처리 미언급 | Phase 6~8 테이블에 상태 처리 컬럼 추가 |
| Re-engagement 여정 암묵적 | Phase 10-8 useReengagement 훅 추가 |

---

## 문서 정합성 수정 — UserRole `admin` 제거

### Context
CLAUDE.md(최우선 규칙)와 12-MIGRATION-WAVES-AND-GATES.md 정합성 고정 규칙에서
UserRole 표준을 `user | trainer | org_owner | org_staff` (4개)로 확정했으나,
SCHEMA-B2B.md와 PRD-TailLog-Toss.md에 `admin` 역할이 남아있어 불일치 발생.

### 수정 대상 (2파일, 5곳)

**파일 1: `docs/SCHEMA-B2B.md`** (3곳)

| 줄 | 현재 | 수정 후 |
|----|------|---------|
| 323 | `v1은 ('user','trainer','admin'). B2B에서 'org_owner','org_staff' 2개 추가.` | `CLAUDE.md 기준 UserRole은 ('user','trainer','org_owner','org_staff').` |
| 329 | `CHECK (role IN ('user','trainer','admin','org_owner','org_staff'))` | `CHECK (role IN ('user','trainer','org_owner','org_staff'))` |
| 337 | `admin` 행 (시스템 관리자 B2C 기존) | 행 삭제 |

**파일 2: `docs/PRD-TailLog-Toss.md`** (2곳)

| 줄 | 현재 | 수정 후 |
|----|------|---------|
| 225 | `CHECK (role IN ('user','trainer','admin'))` | `CHECK (role IN ('user','trainer','org_owner','org_staff'))` |
| 234 | `('user','trainer','admin','org_owner','org_staff')` 5개 | `('user','trainer','org_owner','org_staff')` 4개 + 설명 문구 수정 |

### 검증
- CLAUDE.md UserRole 표준: `user | trainer | org_owner | org_staff` ✅
- 12-MIGRATION 1.1절: `user | trainer | org_owner | org_staff` ✅
- 11-FEATURE-PARITY-MATRIX.md: `user | trainer | org_owner | org_staff` ✅
- SCHEMA-B2B.md: 수정 후 4개 ✅
- PRD-TailLog-Toss.md: 수정 후 4개 ✅
- toss_db_migration SKILL.md: 이미 4개 기준으로 작성됨 ✅
