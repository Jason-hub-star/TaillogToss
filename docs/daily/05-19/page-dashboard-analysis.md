# 2026-05-19 Dashboard Analysis QA Hotfix

## Scope

- [x] UIUX-001: `walk`, `meal`, `training`, `play`, `rest`, `grooming` 분석 라벨을 한국어로 고정
- [x] UIUX-001: 행동별 빈도, 일/주/월 그래프, 시간대별 밀도, 원인 분석 Radar가 `occurrence_count`를 합산하도록 변경
- [x] UIUX-001: 원인 분석 Radar 하단 라벨이 잘리지 않도록 WebView/Chart.js 높이와 padding 조정
- [x] UIUX-001: 시간대별 밀도 그래프의 셀/폰트/높이 여백 조정
- [x] UIUX-001: 분석 공유는 현재 탭이 아니라 전체 기간 기준 텍스트로 생성
- [x] UIUX-001: 분석 화면 주요 텍스트를 토큰 한 단계 위로 조정해 가독성 개선
- [x] UIUX-001: 미등록 카테고리 fallback을 `직접 기록`/`기타`로 고정해 raw 영어 키 노출 차단
- [x] UIUX-001: 기간 변경 시 공유 차트 캡처 캐시를 비워 잘못된 기간 이미지 첨부 방지
- [x] UIUX-001: 빈 기간 안내를 전체 `건`이 아니라 전체 발생 `회` 기준으로 정리

## Files

- `src/pages/dashboard/analysis.tsx`
- `src/lib/charts/filters.ts`
- `src/lib/charts/transformers.ts`
- `src/lib/charts/generateChartHTML.ts`
- `src/lib/charts/__tests__/aggregation.test.ts`
- `src/components/features/dashboard/QuickLogChips.tsx`
- `src/components/tds-ext/DateTimePicker.tsx`
- `docs/status/PAGE-UPGRADE-BOARD.md`

## Validation

- [x] `npx tsc --noEmit`
- [x] `npx jest src/lib/charts/__tests__/aggregation.test.ts src/components/tds-ext/__tests__/IntensitySelector.test.tsx src/components/tds-ext/__tests__/OccurrenceSelector.test.tsx --runInBand`
- [x] `npx jest src/lib/api/__tests__/log.test.ts --runInBand`
- [x] `Backend/venv/bin/pytest Backend/tests/test_log_limit.py Backend/tests/test_schemas.py -q`
- [x] Self-review follow-up: category fallback test added; share chart capture is period-scoped
- [x] `git diff --check -- <changed files>`

## Board Sync

- `/dashboard/analysis`: `QA`
