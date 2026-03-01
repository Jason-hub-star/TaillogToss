# Dashboard 고도화 (2026-03-01)

Parity: UIUX-001, LOG-001, UI-001, B2B-001

## Completed

- [x] P0: runtime.ts seed exports 수정 (CURRICULUMS, getCurriculumById)
- [x] P0: ErrorBoundary 생성 + _app.tsx 적용
- [x] P0: 빠른기록 422 에러 수정 (dog_id empty → ActiveDogProvider auto-load)
- [x] P1: BottomNavBar 생성 (B2C 3탭 / B2B 4탭)
- [x] P1: 대시보드 탭 축소 (3→2탭: 기록/분석) + 인라인 분석 요약
- [x] P1: SafeAreaView 이중 중첩 해소 (TabLayout)
- [x] P1: BottomNavBar 적용 (dashboard, academy, settings, ops/today)
- [x] P1: ABC 폼 A-B-C 순서 변경
- [x] P2: QuickLogForm location/duration 칩 추가
- [x] P3: Toast 저장 성공 피드백 + goBack
- [x] DB: training_progress → user_training_status 테이블명 수정
- [x] DB: user_training_status RLS 정책 추가 (SELECT/INSERT/UPDATE for authenticated)
- [x] Cache: 로그 저장 후 dashboard + logs.all 캐시 invalidation 추가

## Validation

- `npm run typecheck`: 0 errors
- `npm test`: 85 tests passed (app 54 + edge 31)
- Supabase API logs: user_training_status GET 200, POST 201 정상
- Supabase API logs: behavior_logs POST 201 정상
- subscriptions/dog_env 406 → PGRST116 정상 처리 (데이터 미존재 시 null 반환)

## Files Changed (23+)

- src/lib/data/published/runtime.ts
- src/components/tds-ext/ErrorBoundary.tsx (new)
- src/components/tds-ext/Toast.tsx (new)
- src/components/shared/BottomNavBar.tsx (new)
- src/_app.tsx
- src/lib/api/log.ts
- src/lib/api/backend.ts
- src/lib/api/training.ts
- src/lib/hooks/useLogs.ts
- src/stores/ActiveDogContext.tsx
- src/components/shared/layouts/TabLayout.tsx
- src/components/shared/layouts/ListLayout.tsx
- src/components/features/log/ABCForm.tsx
- src/components/features/log/QuickLogForm.tsx
- src/pages/dashboard/index.tsx
- src/pages/dashboard/quick-log.tsx
- src/pages/training/academy.tsx
- src/pages/training/detail.tsx
- src/pages/settings/index.tsx
- src/pages/ops/today.tsx
- src/types/log.ts
- Backend/app/features/log/schemas.py
- Backend/app/features/log/service.py
- Backend/app/main.py
