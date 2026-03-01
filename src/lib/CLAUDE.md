# lib/ — 비즈니스 로직 + 유틸리티

컴포넌트 import 금지. `types/`만 의존.

## 구조

### api/ — Supabase 도메인별 API (13개)

| 파일 | 도메인 | Parity |
|------|--------|--------|
| `supabase.ts` | Supabase 클라이언트 싱글턴 | APP-001 |
| `queryKeys.ts` | TanStack Query 캐시 키 팩토리 (B2B 5 네임스페이스 포함) | APP-001 |
| `auth.ts` | Toss Login → Edge Function → Supabase Auth | AUTH-001 |
| `dog.ts` | 반려견 CRUD + 환경 데이터 | APP-001 |
| `log.ts` | ABC 행동 기록 (빠른/상세) + B2B `getOrgDogLogs` | LOG-001 |
| `coaching.ts` | AI 코칭 결과 조회/피드백 | AI-001 |
| `training.ts` | 훈련 진행 상태 CRUD | UI-001 |
| `subscription.ts` | IAP 구매 검증 (Edge Function) | IAP-001 |
| `iap.ts` | IAP SDK 래퍼 (createOneTimePurchaseOrder + getPendingOrders 복구) | IAP-001 |
| `settings.ts` | 알림 선호도, AI 페르소나 | APP-001 |
| `notification.ts` | Smart Message 발송 (Edge Function) | MSG-001 |
| `org.ts` | B2B 조직/멤버/강아지/배정 CRUD + today 상태 JOIN + entitlement 카운트 | B2B-001 |
| `report.ts` | B2B 리포트 생성/조회/발송/보호자 인터랙션 | B2B-001 |

### hooks/ — 도메인별 커스텀 훅 (16개)

각 훅은 대응하는 `api/` 파일을 TanStack Query로 래핑하거나 독립 로직 관리.

| 파일 | 주요 export |
|------|------------|
| `useAuth.ts` | `useLogin()`, `useLogout()` |
| `useDogs.ts` | `useDogList()`, `useDogDetail()`, `useDogEnv()`, `useUpdateDog()`, `useCreateDogFromSurvey()`, `useDeleteDog()` |
| `useLogs.ts` | `useLogList()`, `useDailyLogs()`, `useCreateQuickLog()`, `useCreateDetailedLog()` |
| `useCoaching.ts` | `useCoachingList()`, `useLatestCoaching()`, `useSubmitFeedback()` |
| `useTraining.ts` | `useTrainingProgress()`, `useStartTraining()`, `useCompleteStep()` |
| `useSubscription.ts` | `useCurrentSubscription()`, `useIsPro()`, `usePurchaseIAP()`, `usePendingOrderRecovery()`, `useRestoreSubscription()` |
| `useSettings.ts` | `useUserSettings()`, `useUpdateSettings()` |
| `useNotification.ts` | `useNotificationHistory()` |
| `usePageGuard.ts` | `usePageGuard()` — 11개 페이지 인증/온보딩/기능 가드 |
| `useRewardedAd.ts` | `useRewardedAd()` — R1/R2/R3 보상형 광고 라이프사이클 |
| `useStreak.ts` | `useStreak()` — 연속 기록 일수 추적 |
| `useReengagement.ts` | `useReengagement()` — 비활성 유저 복귀 로직 |
| `useOrg.ts` | `useOrgDogs()`, `useEnrollDog(maxDogs)`, `useInviteMember(maxStaff)`, `useOrgTodayStats()` 등 |
| `useReport.ts` | `useOrgReports()`, `useGenerateReport()`, `useSendReport()`, `useCreateInteraction()` 등 |
| `useOrgSubscription.ts` | `useOrgSubscription()`, `useOrgEntitlement()`, `usePurchaseB2BIAP()` |
| `pageGuardEvaluator.ts` | 페이지 가드 평가 로직 (usePageGuard 내부 유틸) |

### ads/ — 광고 SDK 설정 (1개) ✅ Phase 12

| 파일 | 용도 |
|------|------|
| `config.ts` | 토스 Ads SDK 2.0 ver2 인터페이스, mock SDK 싱글턴, AD_GROUP_IDS R1/R2/R3 |

### charts/ — WebView + Chart.js (3개)

| 파일 | 용도 |
|------|------|
| `ChartWebView.tsx` | WebView 래퍼 (TODO: @granite-js/native 연결) |
| `generateChartHTML.ts` | Radar/Heatmap/Bar/Line HTML 생성 |
| `transformers.ts` | BehaviorLog[] → 차트 데이터 변환 |

### guards/ — 페이지 접근 제어 (6개) ✅ Phase 10 + B2B

| 파일 | 용도 |
|------|------|
| `authGuard.ts` | 인증 여부 검사 |
| `onboardingGuard.ts` | 온보딩 완료 여부 검사 |
| `featureGuard.ts` | PRO/멀티독/b2bOnly 기능 제한 |
| `roleGuard.ts` | B2B 역할 기반 접근 제어 |
| `deepEntry.ts` | 딥링크 3개 진입점 (quick-log, daily-coach, training-today) |
| `index.ts` | barrel export |

### analytics/ — 이벤트 추적 (1개) ✅ Phase 10

| 파일 | 용도 |
|------|------|
| `tracker.ts` | 이벤트 트래커 17종 (onboarding, log, coaching, iap, training, share, ad 5종, B2B 5종) |

### data/ — 훈련 데이터 + 자동화 파이프라인 (6개+) ✅ Phase 8 + B2B

| 파일 | 용도 |
|------|------|
| `published/runtime.ts` | 앱 런타임의 canonical 커리큘럼 엔트리 |
| `presets.ts` | B2B 프리셋 정적 데이터 (6카테고리 x 3~5옵션 = 23개) |
| `mappings/behaviorToCurriculum.ts` | BehaviorType -> CurriculumId 단일 매핑 소스 |
| `recommendation/engine.ts` | 커리큘럼 추천 엔진 (primary/secondary/reasoning) |
| `analysis/engine.ts` | 설문 결과 텍스트 생성 엔진 |
| `catalog.json` | 자동화 인덱스/카운트/활성 버전 메타 |
| `CHANGELOG.ndjson` | 데이터 자동화 실행 이력(append-only) |
| `raw/`, `candidates/`, `approved/`, `published/`, `archive/` | 자동 수집/정규화/승인/발행/보관 단계 |

### security/ — PII 암호화 (1개) ✅ B2B

| 파일 | 용도 |
|------|------|
| `piiEncrypt.ts` | AES-GCM 암호화, 전화번호/이메일 마스킹, 유효성 검사 |

Edge Function 전담 보안 유틸(PII 가드, rate-limit 등)은 `supabase/functions/_shared/`에 위치 (11개 파일).
