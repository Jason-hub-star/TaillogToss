# Progressive Profiling (Stage 1/2/3) — 2026-04-28

Status: **Done**

## 작업 내역

### Phase 1: DB + Backend
- [x] Supabase 마이그레이션 `20260428000001_add_onboarding_survey.sql` 적용 (dog_env.onboarding_survey JSONB)
- [x] Supabase 마이그레이션 `20260428000002_add_coaching_questions.sql` 적용 (coaching_questions 테이블)
- [x] `models.py` Enum `values_callable` 버그 수정 4컬럼 (UserRole/UserStatus/PlanType/DogSex — name vs value 불일치)
- [x] `onboarding/schemas.py` Stage1/2/3 + SurveyStatusResponse 스키마 추가
- [x] `onboarding/repository.py` create_dog_with_stage1 / update_dog_with_stage2 / update_dog_with_stage3 / get_survey_status / patch_survey_stage 추가
  - Stage3 진입 전 Stage2 완료 여부 검사 추가 (BadRequestException)
  - patch_survey_stage JSONB + 개별 필드 동기화 수정
- [x] `onboarding/service.py` Stage별 비즈니스 로직 추가
- [x] `onboarding/router.py` 5개 엔드포인트 추가

### Phase 2: AI 코칭 게이팅
- [x] `coaching/service.py` check_coaching_gate: stage<2 규칙 폴백, stage≥2 AI, stage3 풀 개인화
- [x] `coaching/prompts.py` Stage별 프롬프트 분기 (_build_stage1/2/3_prompt)
- [x] `coaching/schemas.py` CoachingQuestionRequest/Response 추가

### Phase 3: ask_coach Pro 전용
- [x] `coaching/service.py` ask_coach() — Pro 체크 → 컨텍스트 수집 → 생성 → 저장
- [x] `coaching/router.py` POST /coaching/{dog_id}/ask-coach 엔드포인트

### Phase 4: Frontend
- [x] `src/pages/onboarding/stage1-form.tsx` 신규 (7문항 필수)
- [x] `src/pages/onboarding/stage2-form.tsx` 신규 ("나중에 하기" 허용)
- [x] `src/pages/onboarding/stage3-form.tsx` 신규 (Pro 유도)
- [x] `src/router.gen.ts` stage3-form 등록
- [x] `pages/onboarding/stage3-form.tsx` thin re-export 생성
- [x] `src/components/features/survey/ProfileCompletionBanner.tsx` 신규
- [x] `src/components/features/survey/Stage2InterceptModal.tsx` 신규
- [x] `src/lib/hooks/useSurvey.ts` 신규 (useSubmitStage1/2/3, useSurveyStatus)
- [x] `coaching/result.tsx` Stage2InterceptModal AsyncStorage 1회 표시 로직 연결
- [x] `dashboard/index.tsx` ProfileCompletionBanner 연결 (분석 탭)

## 버그 수정 (병렬 서브에이전트 테스트 발견)
- [x] Stage3 submitted without Stage2 완료 체크 누락 → guard 추가
- [x] PATCH /survey/{dog_id}/{stage} 개별 JSONB 필드 desync → 동기화 블록 추가
- [x] FastAPI Enum LookupError (user/USER mismatch) → values_callable 수정

## 연관 변경
- `src/lib/api/dog.ts` — submitSurveyStage1/2/3, getSurveyStatus API 함수
- `src/stores/SurveyContext.tsx` — Stage별 상태 분리

## 검증
- E2E: Stage1→2→3 순차 제출, coaching gate 규칙폴백↔AI 전환 확인
- ask_coach non-Pro 403 확인
- survey status locked_features 계산 확인
- tsc 0 errors

## Board 상태
- `/onboarding/stage1-form` → Done
- `/onboarding/stage2-form` → Done
- `/onboarding/stage3-form` → Done
- `/coaching/result` — Stage2InterceptModal 추가 → Done 유지
- `/dashboard` — ProfileCompletionBanner 추가 → Done 유지
