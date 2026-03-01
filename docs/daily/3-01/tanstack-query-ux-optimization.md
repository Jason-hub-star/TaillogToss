# TanStack Query UX 최적화 — 2026-03-01

## Scope
APP-001, UI-001, LOG-001 — 대시보드 + 훈련 + 기록 체감 성능 최적화

## Checklist

### A. Optimistic Updates (P0)
- [x] A1: useCompleteStep — onMutate/onError/onSettled 패턴, completed_steps 즉시 추가
- [x] A2: useCreateQuickLog — logs.list + dashboard.detail prepend, `__optimistic_` 임시 ID

### B. Navigation Prefetch (P1)
- [x] B1: BottomNavBar — 홈(dashboard.detail) / 훈련(training.progress) prefetch, staleTime 2분

### C. staleTime 차등화 (P1)
- [x] queryConfig.ts 신규 생성 (STALE_TIME_LONG 10분, DEFAULT 5분, SHORT 1분, ACTIVE 30초)
- [x] useTrainingProgress → 30초
- [x] useLogList, useDailyLogs → 1분
- [x] useDashboard → 1분
- [x] useCurrentSubscription → 10분
- [x] useUserSettings → 10분

### D. AppState refetch (P2)
- [x] useAppStateRefetch.ts 신규 생성 (background 5초+ → foreground 시 3쿼리 invalidate)
- [x] _app.tsx에 AppStateRefreshBridge 추가

### E. 중복 쿼리 제거 (P2)
- [x] dashboard/index.tsx — useDailyLogs 제거 → recentLogs.filter로 대체

### F. Lottie 스켈레톤 강화 (P1)
- [x] F1: SkeletonDashboard — jackie 80px + "불러오는 중..."
- [x] F2: SkeletonAcademy — jackie 72px + "커리큘럼 준비 중..."
- [x] F3: training/detail — cute-doggie 64px + "훈련 정보 로딩 중..."

### G. 리뷰 후 보완 (P1)
- [x] G1: dashboard 오늘 기록 집계 타임존 보정 (`occurred_at.slice(0,10)` 비교 제거)
- [x] G2: quick-log optimistic rollback 안정화 (이전 캐시 undefined 케이스 복원)

## Validation
- `npm run typecheck`: 0 에러
- `npm test`: 87 tests, 21 suites, 0 failures

## Files (11 modified + 2 new)
- `src/lib/api/queryConfig.ts` (new)
- `src/lib/hooks/useAppStateRefetch.ts` (new)
- `src/lib/hooks/useTraining.ts`
- `src/lib/hooks/useLogs.ts`
- `src/lib/hooks/useDashboard.ts`
- `src/lib/hooks/useSubscription.ts`
- `src/lib/hooks/useSettings.ts`
- `src/components/features/dashboard/SkeletonDashboard.tsx`
- `src/components/features/training/SkeletonAcademy.tsx`
- `src/pages/training/detail.tsx`
- `src/components/shared/BottomNavBar.tsx`
- `src/pages/dashboard/index.tsx`
- `src/_app.tsx`

## Post-Review Files
- `src/pages/dashboard/index.tsx`
- `src/lib/hooks/useLogs.ts`
