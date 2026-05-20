# 2026-05-19 Quick Log Intensity Hotfix

## Scope

- [x] LOG-001: 빠른기록 일상 활동 `grooming` 표시명을 `그루밍`에서 `미용`으로 변경
- [x] LOG-001: 빠른기록 강도 시작값을 5로 고정
- [x] LOG-001: 강도 선택을 1~10 전체 값으로 확장
- [x] LOG-001: 강도 선택 UI를 `IntensitySelector`로 컴포넌트화
- [x] LOG-001: `IntensitySelector` 좌우 스와이프 조절 지원
- [x] LOG-001: 상세 ABC 기록도 동일 강도 컴포넌트를 사용하도록 정리
- [x] LOG-001: 빠른 탭에 `1회`, `2회`, `3회 이상`, `5회 이상`, `10회 이상` 횟수 프리셋 추가
- [x] LOG-001: 횟수 필드를 `occurrence_count`, `occurrence_count_is_minimum`으로 저장 모델에 분리
- [x] LOG-001: 빠른기록 시간 표시를 `방금 · HH:mm`, `N분 전 · HH:mm`, `오늘 · HH:mm` 형태로 정리
- [x] LOG-001: 최근기록 카드에 `1회` 포함 모든 기록 횟수 표시

## Files

- `src/components/tds-ext/IntensitySelector.tsx`
- `src/components/tds-ext/OccurrenceSelector.tsx`
- `src/components/tds-ext/__tests__/IntensitySelector.test.tsx`
- `src/components/tds-ext/__tests__/OccurrenceSelector.test.tsx`
- `src/components/tds-ext/index.ts`
- `src/components/tds-ext/CLAUDE.md`
- `src/components/CLAUDE.md`
- `src/components/features/dashboard/QuickLogChips.tsx`
- `src/components/features/log/QuickLogForm.tsx`
- `src/components/features/log/ABCForm.tsx`
- `src/components/features/log/LogCard.tsx`
- `src/lib/logOccurrence.ts`
- `src/lib/api/log.ts`
- `src/lib/hooks/useLogs.ts`
- `Backend/app/features/log/schemas.py`
- `Backend/app/features/log/service.py`
- `Backend/app/shared/models.py`
- `supabase/migrations/20260519000002_behavior_log_occurrence_count.sql`
- `docs/status/PAGE-UPGRADE-BOARD.md`

## Validation

- [x] `npx jest src/components/tds-ext/__tests__/IntensitySelector.test.tsx --runInBand`
- [x] `npx jest src/components/tds-ext/__tests__/OccurrenceSelector.test.tsx --runInBand`
- [x] `npx jest src/lib/api/__tests__/log.test.ts --runInBand`
- [x] `npx tsc --noEmit`
- [x] `Backend/venv/bin/pytest Backend/tests/test_log_limit.py Backend/tests/test_schemas.py -q`
- [x] Self-review follow-up: all LogCard rows show occurrence count; chart/category fallback no longer exposes raw English keys
- [x] `rg -n "그루밍|\[1, 2, 3, 5, 6, 7, 10\]|\[1, 3, 5, 7, 10\]|useState<IntensityLevel>\(3\)" src/components src/pages src/types -S` returns no matches
- [x] `git diff --check -- <changed files>`

## Board Sync

- `/dashboard/quick-log`: `QA`
