# lib/ — 비즈니스 로직 + 유틸리티

컴포넌트 import 금지. `types/`만 의존.

## 구조

### api/ — Supabase 도메인별 API (9개)

| 파일 | 도메인 | Parity |
|------|--------|--------|
| `supabase.ts` | Supabase 클라이언트 싱글턴 | APP-001 |
| `queryKeys.ts` | TanStack Query 캐시 키 팩토리 | APP-001 |
| `auth.ts` | Toss Login → Edge Function → Supabase Auth | AUTH-001 |
| `dog.ts` | 반려견 CRUD + 환경 데이터 | APP-001 |
| `log.ts` | ABC 행동 기록 (빠른/상세) | LOG-001 |
| `coaching.ts` | AI 코칭 결과 조회/피드백 | AI-001 |
| `training.ts` | 훈련 진행 상태 CRUD | UI-001 |
| `subscription.ts` | IAP 구매 검증 (Edge Function) | IAP-001 |
| `settings.ts` | 알림 선호도, AI 페르소나 | APP-001 |
| `notification.ts` | Smart Message 발송 (Edge Function) | MSG-001 |

### hooks/ — 도메인별 커스텀 훅 (12개)

각 훅은 대응하는 `api/` 파일을 TanStack Query로 래핑하거나 독립 로직 관리.

| 파일 | 주요 export |
|------|------------|
| `useAuth.ts` | `useLogin()`, `useLogout()` |
| `useDogs.ts` | `useDogList()`, `useDogDetail()`, `useCreateDogFromSurvey()`, `useDeleteDog()` |
| `useLogs.ts` | `useLogList()`, `useDailyLogs()`, `useCreateQuickLog()`, `useCreateDetailedLog()` |
| `useCoaching.ts` | `useCoachingList()`, `useLatestCoaching()`, `useSubmitFeedback()` |
| `useTraining.ts` | `useTrainingProgress()`, `useStartTraining()`, `useCompleteStep()` |
| `useSubscription.ts` | `useCurrentSubscription()`, `useIsPro()`, `usePurchaseIAP()` |
| `useSettings.ts` | `useUserSettings()`, `useUpdateSettings()` |
| `useNotification.ts` | `useNotificationHistory()` |
| `usePageGuard.ts` | `usePageGuard()` — 11개 페이지 인증/온보딩/기능 가드 |
| `useRewardedAd.ts` | `useRewardedAd()` — R1/R2/R3 보상형 광고 라이프사이클 |
| `useStreak.ts` | `useStreak()` — 연속 기록 일수 추적 |
| `useReengagement.ts` | `useReengagement()` — 비활성 유저 복귀 로직 |

### ads/ — 광고 SDK 설정 (1개) ✅ Phase 12

| 파일 | 용도 |
|------|------|
| `config.ts` | 토스 Ads SDK 2.0 인터페이스, mock SDK 싱글턴, AD_UNIT_IDS R1/R2/R3 |

### charts/ — WebView + Chart.js (3개)

| 파일 | 용도 |
|------|------|
| `ChartWebView.tsx` | WebView 래퍼 (TODO: @granite-js/native 연결) |
| `generateChartHTML.ts` | Radar/Heatmap/Bar/Line HTML 생성 |
| `transformers.ts` | BehaviorLog[] → 차트 데이터 변환 |

### guards/ — 페이지 접근 제어 (5개) ✅ Phase 10

| 파일 | 용도 |
|------|------|
| `authGuard.ts` | 인증 여부 검사 |
| `onboardingGuard.ts` | 온보딩 완료 여부 검사 |
| `featureGuard.ts` | PRO/멀티독 기능 제한 |
| `deepEntry.ts` | 딥링크 3개 진입점 (quick-log, daily-coach, training-today) |
| `index.ts` | barrel export |

### analytics/ — 이벤트 추적 (1개) ✅ Phase 10

| 파일 | 용도 |
|------|------|
| `tracker.ts` | 이벤트 트래커 12종 (onboarding, log, coaching, iap, training, share, ad 5종) |

### data/ — 정적 데이터 (1개) ✅ Phase 8

| 파일 | 용도 |
|------|------|
| `curriculum.ts` | 커리큘럼 정적 데이터 (7종 x 5~6일 x 3스텝) |

### security/ — Edge Function 전담

PII 가드, rate-limit 등 보안 유틸은 `supabase/functions/_shared/`에 위치 (7개 파일).
`src/lib/security/`는 사용하지 않음.
