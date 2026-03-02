# training/detail 버그 수정 + UX 개선 (2026-03-02)

## Checklist

- [x] Bug: insert → upsert (23505 unique constraint violation 해결)
- [x] Bug: 스텝 체크 해제 불가 → uncompleteStep API + hook + 양방향 토글
- [x] Bug: 미시작 상태 스텝 탭 → startTraining + 자동 완료 연쇄
- [x] Bug: 더블탭 방어 (isPending 체크)
- [x] Bug: PGRST204 (reaction column not found) → SCHEMA_MISMATCH_CODES 추가
- [x] UX: 이미지 플레이스홀더 (image_url null → 이모지 폴백 + onError)
- [x] UX: 반응 바텀시트 즉시 표시 (optimistic, API 응답 대기 제거)
- [x] UX: 시트 내부 "저장됐어요" 확인 상태 (fade-in → 1초 후 자동 닫힘)
- [x] UX: Toast 피드백 (체크 해제, 훈련 완료)

## Files Changed

- `src/lib/api/training.ts` — upsert 전환 + uncompleteStep() + PGRST204
- `src/lib/hooks/useTraining.ts` — useUncompleteStep() hook
- `src/pages/training/detail.tsx` — 양방향 토글 + 즉시 시트 + Toast
- `src/components/features/training/CurriculumShowcaseCard.tsx` — image/emoji 조건부 렌더링
- `src/components/features/training/StepCompletionSheet.tsx` — 내부 저장 확인 상태

## Validation

- typecheck: 0 errors
- test: 87/87 passed (56 app + 31 edge)
