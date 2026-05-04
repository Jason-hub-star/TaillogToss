# Progressive Profiling 구현 일지 (2026-04-27~)

## Phase 1: DB + Backend 기반 작업

### 변경 범위
- `supabase/migrations/20260428_001_add_onboarding_survey.sql` — dog_env에 onboarding_survey JSONB 추가
- `supabase/migrations/20260428_002_add_coaching_questions.sql` — coaching_questions 테이블 신규
- `Backend/app/shared/models.py` — DogEnv 컬럼 + CoachingQuestion 모델 추가
- `Backend/app/features/onboarding/schemas.py` — SurveyStage1/2/3 + SurveyStatusResponse 추가
- `Backend/app/features/onboarding/repository.py` — Stage별 CRUD 함수 추가
- `Backend/app/features/onboarding/service.py` — Stage별 비즈니스 로직 추가
- `Backend/app/features/onboarding/router.py` — Stage별 엔드포인트 추가

### 결정 사항
- 기존 SurveySubmission 유지 (하위 호환), deprecated 표시
- 기존 유저: household_info IS NOT NULL → Stage 2로 마이그레이션
- onboarding_survey JSONB 구조: {completion_stage, stage1/2/3_completed_at, stage1/2/3_response}

### Phase 2: AI 코칭 게이팅 + 프롬프트 강화 (예정)
- coaching/prompts.py: Stage별 프롬프트 분기 + 페르소나 강화
- coaching/service.py: check_coaching_gate() + 이전 코칭 5회로 확대

## Phase 2: AI 코칭 게이팅 + 프롬프트 강화

### 변경 범위
- `Backend/app/features/coaching/prompts.py` — 한국어 페르소나 추가, onboarding_context 파라미터, Stage별 분기 섹션
- `Backend/app/features/coaching/service.py` — _check_coaching_gate(), _build_onboarding_context(), 이전 코칭 3→5회

### 결정 사항
- Stage < 2: 규칙 기반 폴백 강제 (AI 미사용)
- Stage 2: household/issues/triggers/past 컨텍스트 주입
- Stage 3: 기질/건강/활동/보상 전체 주입 (풀 개인화)
- 이전 코칭 요약 참조 5회로 확대 (연속성 강화)

---

## Phase 3: AI 코치 질문 기능 (Pro 전용)

### 변경 범위
- `Backend/app/features/coaching/schemas.py` — CoachingQuestionRequest, CoachingQuestionResponse 추가
- `Backend/app/features/coaching/service.py` — ask_coach(), get_question_history() 추가
- `Backend/app/features/coaching/router.py` — POST /{dog_id}/ask-coach, GET /{dog_id}/question 추가

### 결정 사항
- Pro 구독 필수: Subscription.plan_type 확인 (PRO_MONTHLY or PRO_YEARLY), 비Pro → 403
- 횟수 정책: TBD — billing_period 컬럼 보관, 현재는 Pro이면 무제한
- 컨텍스트: Dog + DogEnv + 최근 로그 100건 + 최근 코칭 1건 (풀 개인화, Stage 무관)
- 저장: CoachingQuestion 테이블, 수정/삭제 불가 (기록 보존)
- 비용: budget.record_cost() 동일하게 호출

### Phase 4: 프론트엔드 (예정)
- 설문 콘텐츠 토스 스타일 재작성 후 진행
