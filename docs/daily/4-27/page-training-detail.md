# training/detail — 스텝 체크 버그 수정 (2026-04-27)

## 목표
훈련 스텝 체크박스 탭 → 피드백 시트 → 저장 후 체크 표시가 나타나지 않는 버그 수정

## 근본 원인

| # | 원인 | 심각도 |
|---|------|--------|
| 1 | Supabase fallback INSERT에 `user_id` 없음 → RLS `WITH CHECK (user_id = auth.uid())` 차단 | P0 |
| 2 | Backend `/feedback` 엔드포인트 미등록 → 404 → Supabase fallback (reaction 저장 불가) | P1 |
| 3 | SQLAlchemy `UserTrainingStatus` 모델에 `reaction` 컬럼 없음 | P1 |

## 수정 내용

### FE — `src/lib/api/training.ts`
- [x] `getCurrentUserId()` 헬퍼 추가 (Supabase session에서 uid 조회)
- [x] `startTraining` Supabase fallback에 `user_id: userId` 추가
- [x] `completeStep` Supabase fallback에 `user_id: userId` 추가
- [x] `uncompleteStep` Supabase fallback에 `user_id: userId` 추가

### Backend
- [x] `router.py`: `POST /feedback`, `GET /feedback/{dog_id}` 엔드포인트 추가
- [x] `schemas.py`: `StepFeedbackUpdate` 추가, `TrainingStatusResponse`에 `reaction` 추가
- [x] `service.py`: `upsert_step_feedback`, `get_step_feedback` 함수 추가
- [x] `models.py`: `UserTrainingStatus.reaction = Column(String(20))` 추가

## 검증
- TypeScript: `npx tsc --noEmit` → PASS
- Backend 기동: `/health` 200 OK
- `/api/v1/training/feedback` POST → 401 (인증 없이 올바른 응답)
- `/api/v1/training/feedback/{dog_id}` GET → 401

## 상태
Done ✅ — ADB E2E 실기기 검증 완료 (2026-04-27)
- 스텝 탭 → 체크마크 즉시 표시 ✅
- 저장하기 → "반응이 저장됐어요" 확인 시트 ✅  
- DB: `basic_obedience/day_4/step_1 COMPLETED reaction=enjoyed` 저장 확인 ✅
