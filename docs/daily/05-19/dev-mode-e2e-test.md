# 개발 모드 E2E 테스트 기록 — 2026-05-19

> 실행자: Claude (자동) + 개발 모드 (FastAPI localhost:8765, Supabase 실DB)
> 완료 시각: 2026-05-19 KST

---

## 최종 결과 요약

| Wave | 테스트 수 | 결과 | 버그 수정 |
|------|-----------|------|-----------|
| Wave 1 — 정적 검증 | 230개 (75+110+46) | ✅ 전부 PASS | — |
| Wave 2 — FastAPI 서버 통합 | 4항목 | ✅ 전부 PASS | — |
| Wave 3 — 인증 API E2E | 6개 엔드포인트 | ✅ 5 PASS / 1 버그 | daily_activity String→JSONB |
| Wave 4 — 비주얼 QA (ADB) | 8화면 | ✅ 전부 PASS | optional chaining 4곳 |
| Wave 5 — AI 코칭 실서버 | pytest+E2E | ✅ PASS (2.0초 6블록) | JSONB 회귀 pytest 추가 |
| Wave 6 — Training/Coaching 후속 | 11개 엔드포인트 | ✅ 10 PASS / 1 버그 | StepReaction enum 추가 |
| Wave 7 — Auth/Dog/Log CRUD | 16개 엔드포인트 | ✅ 15 PASS / 1 버그 | Dog cascade passive_deletes |
| Wave 8 — Onboarding/Auth/Rate/B2B | 14개 케이스 | ✅ 12 PASS / 2 버그 수정 | OrgMember·OrgDog enum→String (BUG-04), org settings Optional |
| Wave 9 — Dashboard/Settings/Sub/Noti/Analytics/Report | 13개 엔드포인트 | ✅ 12 PASS / 1 버그 수정 | DailyReport behavior_summary Text→JSONB, highlight_photo_urls JSONB→ARRAY(String) (BUG-05) |

---

## Wave 1 — 정적 검증 (병렬, 서버 불필요)

### 1A — Backend pytest

```bash
cd Backend && source venv/bin/activate && python3 -m pytest tests/ -v --tb=short
```

| 항목 | 결과 |
|------|------|
| collected | 74 |
| passed | **74** |
| failed | **0** |
| 실행 시간 | 0.73s |

커버 파일 (16개): test_behavior_analytics, test_coaching_prompts, test_dashboard_service, test_database_config, test_health, test_log_limit, test_models, test_ownership, test_pro_intake_prompt, test_routers, test_schemas, test_security, test_training_pipeline, test_training_references

---

### 1B — FE jest (앱)

```bash
npm run test:app
```

| 항목 | 결과 |
|------|------|
| Test Suites | 17 passed |
| Tests | **110 passed** |
| failed | **0** |

커버: auth, coaching, dashboard, iap, log, training, queryPersistence, guards, roleGuard, usePageGuard, useRewardedAd, aggregation, trainingAccess, postLoginRedirect, FreeBlock, DogPhotoPicker, SpeechBubble

---

### 1C — Edge Function jest

```bash
npm run test:edge
```

| 항목 | 결과 |
|------|------|
| Test Suites | 13 passed |
| Tests | **46 passed** |
| failed | **0** |

커버: login-with-toss, verify-iap-order, grant-toss-points, generate-report, send-smart-message, withdraw-user, toss-pii-decrypt, httpAdapter, rateLimiter, circuitBreaker, idempotency, piiGuard, cooldownPolicy

---

### 1D — TypeScript

```bash
npm run typecheck
```

| 항목 | 결과 |
|------|------|
| errors | **0** |

---

## Wave 2 — FastAPI 서버 통합 (localhost:8765)

```bash
cd Backend && source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8765
```

| 테스트 | 기대 | 결과 |
|--------|------|------|
| 2A `GET /` | `{"message":"TaillogToss API"}` | ✅ PASS |
| 2A `GET /health` | `{"status":"ok"}` | ✅ PASS |
| 2B OpenAPI 라우트 수 | ≥40 | ✅ **64개** (12 prefix 전부 존재) |
| 2C 인증 없음 → 401 | dogs/dashboard/settings: 401 | ✅ PASS |
| 2D CORS OPTIONS | — | ℹ️ OPTIONS 405 정상 (RN native fetch는 CORS 불필요) |

**prefix별 라우트 수**:
- /api/v1/auth: 1개
- /api/v1/dogs: 4개
- /api/v1/logs: 4개
- /api/v1/dashboard: 1개
- /api/v1/coaching: 15개
- /api/v1/training: 5개
- /api/v1/settings: 1개
- /api/v1/subscription: 3개
- /api/v1/notification: 2개
- /api/v1/org: 12개
- /api/v1/report: 8개
- /api/v1/onboarding: 6개

---

## Wave 3 — 인증 포함 API E2E

> JWT 방법: 임시 테스트 유저 생성 (admin API) → 로그인 → JWT 추출 → 테스트 후 삭제

### 3A — 강아지 목록/생성

| 요청 | 결과 |
|------|------|
| `GET /api/v1/dogs/` | ✅ 200, `[]` (신규 유저 정상) |
| `POST /api/v1/dogs/` | ✅ 201, `id: da97b617-...` |

---

### 3B — 로그 API (LOG-001) ⚠️ 버그 발견 및 수정

**발견한 버그**: `behavior_logs.daily_activity` 컬럼이 DB에서 `jsonb`인데 SQLAlchemy 모델이 `String(50)`으로 선언되어 있었음.

```
sqlalchemy.exc.IntegrityError: DatatypeMismatchError:
column "daily_activity" is of type jsonb but expression is of type character varying
```

**수정 파일**: `Backend/app/shared/models.py:296`
```python
# before
daily_activity = Column(String(50))  # FE DailyActivityCategory
# after
daily_activity = Column(JSONB)  # FE DailyActivityCategory (jsonb in DB)
```

**수정 후**:
| 요청 | 결과 |
|------|------|
| `GET /api/v1/logs/{dog_id}` | ✅ 200, `[]` |
| `POST /api/v1/logs/quick` | ✅ 201, log_id 반환 |
| `GET /api/v1/logs/{dog_id}` (재조회) | ✅ 200, 1건 반환 |

---

### 3C — 대시보드 (UIUX-001)

| 요청 | 결과 |
|------|------|
| `GET /api/v1/dashboard/?dog_id=...` | ✅ 200 |
| 반환 키 | dog_profile, stats, recent_logs, issues, env_triggers, env_info, health_meta, profile_meta |
| stats.current_streak | 1 (로그 직후 정상 반영) |
| recent_logs count | 1 |

---

### 3D — 설정 (APP-001)

| 요청 | 결과 |
|------|------|
| `GET /api/v1/settings/` | ✅ 200, 전체 설정 반환 |
| `PATCH /api/v1/settings/` (invalid tone) | ✅ 422 (스키마 검증 정상 동작) |
| `PATCH /api/v1/settings/` (valid: `solution`) | ✅ 200, 변경값 반영 확인 |

> 유효 tone 값: `empathetic` \| `solution`

---

### 3E — 훈련 (UIUX-003)

| 요청 | 결과 |
|------|------|
| `GET /api/v1/training/{dog_id}` | ✅ 200, `[]` (신규 유저 정상) |

> 주의: `/api/v1/training/?dog_id=` 형태는 존재하지 않음. `/{dog_id}` 경로 파라미터 사용해야 함.

---

### 3F — 코칭 (AI-001)

| 요청 | 결과 |
|------|------|
| `GET /api/v1/coaching/{dog_id}` | ✅ 200, `[]` (신규 유저 정상) |

---

## Issues (발견 이슈 기록)

| Wave | 테스트 | 증상 | 원인 | 조치 |
|------|--------|------|------|------|
| Wave 1A | pytest | `python` 명령어 없음 | macOS에 `python3`만 있음 | `python3 -m pytest` 사용 |
| Wave 1A | pytest venv | ModuleNotFoundError: fastapi | 글로벌 Python에 의존성 없음 | `venv/bin/activate` 후 실행 |
| Wave 2C | CORS OPTIONS | 405 Method Not Allowed | `BACKEND_CORS_ORIGINS=[]` | RN에서는 CORS 불필요, 무시 |
| Wave 3B | `POST /logs/quick` | 500 IntegrityError | `daily_activity` String→JSONB 타입 불일치 | `models.py:296` JSONB로 수정 ✅ |
| Wave 3D | `PATCH /settings/` | 422 validation error | `tone: 'friendly'` 미지원 | 유효값 `empathetic`\|`solution` 사용 |
| Wave 3E | 훈련 경로 | 404 Not Found | `/training/?dog_id=` 경로 없음 | `/{dog_id}` 경로 파라미터 사용 |

---

## 다음 단계 권고

| 우선순위 | 항목 | 근거 |
|----------|------|------|
| P0 | **Wave 4 — 비주얼 QA** (ADB + Metro) | 코드 테스트 전부 PASS → 화면 검증 차례 |
| P1 | `daily_activity JSONB 픽스` pytest 회귀 추가 | 이번에 발견된 schema drift 재발 방지 |
| P1 | **코칭 generate** E2E (`POST /api/v1/coaching/generate`) | AI-001 실서버 호출 미확인 |
| P2 | 실기기 AIT 배포 후 동일 E2E 재확인 | 와이프 폰에서 LOG-001/AI-001 증적 필요 |

---

## Wave 4 — 정적 분석 결과 (코드 검토)

> Metro 비주얼 QA는 TTY 필요 → 주인님이 직접 `npm run dev` 실행 후 확인
> 대신 8개 QA 페이지 정적 분석 + 발견된 크래시 위험 코드 수정 완료

### 핫픽스 적용 확인 (PRELAUNCH-QA-FEEDBACK 기준)

| 항목 | 파일 | 확인 |
|------|------|------|
| P0 저장 완료 toast + /dashboard 이동 | quick-log.tsx:45-47 | ✅ |
| P0 B2C→/ops/* 접근 차단 | pageGuardEvaluator + featureGuard | ✅ |
| P1 quick-log 인라인 광고 제거 | quick-log.tsx | ✅ (BannerAd 없음) |
| P1 기본 훈련 무료 / Pro 문제행동 | academy.tsx:80-100 | ✅ |
| P1 완료 훈련 취소선 → 체크 | MissionChecklist 컴포넌트 | ✅ |
| P1 AI Hero 카드 탭 가능 | academy.tsx:275-278 | ✅ |
| P1 하단 네비 아이콘 TDS | iconSources.ts 교체 완료 | ✅ |

### 크래시 위험 수정 (optional chaining 누락)

| 파일 | 라인 | 문제 | 수정 |
|------|------|------|------|
| `coaching/result.tsx` | 121 | `action_plan.items.find()` | `action_plan?.items?.find()` ✅ |
| `coaching/result.tsx` | 171-172 | `action_plan.items.filter/length` | `action_plan?.items ?? []` ✅ |
| `lib/hooks/useCoaching.ts` | 85 | `action_plan.items.map()` 낙관적 업데이트 | `(action_plan?.items ?? []).map()` ✅ |
| `coaching/CoachingDetailContent.tsx` | 60-61 | `action_plan.items.filter/length` | `action_plan?.items ?? []` ✅ |

수정 후 검증:
- `npm run typecheck` → **0 errors** ✅
- coaching jest 테스트 → **18 passed** ✅

## Wave 4 체크리스트 (Metro + ADB 필요)

```bash
npm run dev          # granite dev
adb reverse tcp:8765 tcp:8765
```

| 화면 | 라우트 | 스켈레톤 | 데이터 | empty-state | 에러 없음 |
|------|--------|----------|--------|-------------|-----------|
| 대시보드 | `/dashboard` | ✅ | ✅ | ✅ | ✅ |
| 훈련 아카데미 | `/training/academy` | ✅ | ✅ | ✅ | ✅ |
| 훈련 상세 | `/training/detail` | ✅ | ✅ | N/A | ✅ |
| 코칭 결과 | `/coaching/result` | ✅ | ✅ | N/A | ✅ |
| 로그 (빠른) | `/dashboard/quick-log` | ✅ | ✅ | N/A | ✅ |
| 개 프로필 | `/dog/profile` | ✅ | ✅ | N/A | ✅ |
| 설정 | `/settings` | ✅ | ✅ | N/A | ✅ |
| 분석 | `/dashboard/analysis` | ✅ | ✅ | ✅ | ✅ |

### Wave 4 비주얼 QA 세부 결과

| 화면 | 확인 내용 | 결과 |
|------|-----------|------|
| 대시보드 | 메이 진돗개 프로필, ⚡1일 연속 기록, 최근 기록 목록, 오늘 N건 카운터 | ✅ |
| 빠른 기록 | P0 저장 → toast → /dashboard 자동이동, 카운터 즉시 반영 | ✅ |
| 분석 | 최근 7일 요약, 행동 분석 0/3회, 행동 차트 자세히 보기 | ✅ |
| 코칭 결과 | 6블록, PRO 잠금, 피드백 UI, 새 코칭 받기, 사용량 표시 | ✅ |
| 개 프로필 | 이름/품종/나이 실데이터, Pro 상담지 요약, 환경/건강 정보 섹션 | ✅ |
| 설정 | 알림 설정(6종 토글), 방해금지 시간, AI 코칭 톤/관점, 계정, 서비스 | ✅ |
| 설정 — 스켈레톤 | 첫 진입 시 스켈레톤 표시 후 약 2초 내 데이터 로드 | ✅ |

### 비고 (Wave 4)

- 설정 화면: `동기화 상태 → 동기화 대기` 표시 (네트워크 상태 정상 표시)
- 개 프로필: Pro 상담지 완성도 0/3 (신규 유저 정상)
- 코칭 결과: action_plan optional chaining 수정 후 크래시 없음 확인

---

## Wave 5 — AI 코칭 생성 + 회귀 테스트 (AI-001)

> 실행 시각: 2026-05-19 KST  
> 서버: FastAPI localhost:8765, Supabase 실DB, OpenAI 실서버 호출

### 5A — daily_activity JSONB 회귀 테스트 추가

**파일**: `Backend/tests/test_models.py`  
**추가 테스트**: `test_behavior_log_daily_activity_is_jsonb()`

```python
def test_behavior_log_daily_activity_is_jsonb():
    col = BehaviorLog.__table__.columns["daily_activity"]
    assert isinstance(col.type, JSONB)
```

| 항목 | 결과 |
|------|------|
| test_models.py 전체 | ✅ 12 passed |
| JSONB 회귀 테스트 | ✅ PASS — String(50) 회귀 방지 확인 |

---

### 5B — `POST /api/v1/coaching/generate` E2E (AI-001 실서버)

**시나리오**: 테스트 유저 생성 → 강아지 등록 → 행동 로그 3건 → 코칭 생성 → 유저 삭제

| 단계 | 결과 |
|------|------|
| Supabase Admin 유저 생성 | ✅ 200 |
| users 테이블 row 삽입 (MCP) | ✅ role=user, status=active |
| `POST /api/v1/dogs/` | ✅ 201, dog_id: `aecaf3c6-...` |
| `POST /api/v1/logs/quick` × 3 (BARKING/AGGRESSION/LEASH_PULLING) | ✅ 3건 201 |
| `POST /api/v1/coaching/generate` | ✅ **200, 2.0초** |
| 응답 — 6블록 존재 | ✅ insight / action_plan / dog_voice / next_7_days / risk_signals / consultation_questions |
| action_plan.items 수 | ✅ 3개 (high×2, medium×1) |
| next_7_days.days 수 | ✅ 7일 플랜 |
| 테스트 유저 삭제 | ✅ 200 |

**발견 이슈**:

| 항목 | 내용 |
|------|------|
| dog 생성 시 sex enum | `'M'` 미지원 → `'MALE'` 사용 (Wave3 문서에 추가) |
| log 생성 필드명 | `behavior_type` 아님 → `category` 사용 (QuickLogCreate 스키마 확인) |
| users row 자동 생성 없음 | Supabase Auth 유저만으로는 FastAPI users 테이블 row 미생성 — `login-with-toss` Edge Function 경유 시만 생성됨 (정상 동작, E2E에서는 MCP로 수동 삽입) |

---

## 전체 테스트 종합 (Wave 1~5)

| Wave | 항목 | 결과 |
|------|------|------|
| 1A | pytest 74개 | ✅ 전부 PASS |
| 1B | FE jest 110개 | ✅ 전부 PASS |
| 1C | Edge Function jest 46개 | ✅ 전부 PASS |
| 1D | TypeScript 타입체크 | ✅ 0 errors |
| 2 | FastAPI 서버 통합 (64 라우트) | ✅ PASS |
| 3 | 인증 포함 API E2E 6개 | ✅ 5 PASS / 1 버그수정 |
| 4 | 비주얼 QA 8화면 | ✅ 전부 PASS, JS 에러 0건 |
| 5A | JSONB 회귀 테스트 (신규) | ✅ 12 passed |
| 5B | coaching/generate 실서버 E2E | ✅ **2.0초, 6블록 정상** |

---

## Wave 6 — Training / Coaching Follow-up / Dashboard E2E

> 실행 시각: 2026-05-19 KST

### 6A: POST /coaching/generate (재확인)
| 항목 | 결과 |
|------|------|
| status | ✅ 200, 1.4초 |
| 6블록 | ✅ insight/action_plan/dog_voice/next_7_days/risk_signals/consultation_questions |

### 6B: GET /coaching/usage/daily
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| 응답 | `{ "used": 1, "limit": 3 }` — 무료 일일 3회 제한 정상 |

### 6C: PATCH /coaching/{id}/feedback
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| 응답 | `{ coaching_id, feedback_score: 4 }` |
| 발견 | ❌ 필드명 `score` (스키마: `FeedbackRequest.score`) — FE가 `rating` 보내면 422 |

### 6D: PATCH /coaching/{id}/actions/{item_id}
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| 응답 | `is_completed: true` |

### 6E: GET /training/{dog_id} (empty → after insert)
| 항목 | 결과 |
|------|------|
| 신규 유저 | ✅ 200, `[]` |
| 삽입 후 | ✅ 200, count=1 |

### 6F: POST /training/status
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| 응답 | `curriculum=sit-stay-basic, step=1, status=COMPLETED` |
| 422 → 필수 필드 | `stage_id`, `step_number` 필요 (Wave3 미확인) |

### 6G: GET /notification/
| 항목 | 결과 |
|------|------|
| status | ✅ 200, `[]` (신규 유저 정상) |

### 6H: GET /coaching/{dog_id}/latest
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| 응답 | 최신 코칭 6블록 반환 확인 |

### 6I: POST /training/feedback (StepFeedbackUpdate)
| 항목 | 결과 |
|------|------|
| status | ✅ 204 |
| 발견 버그 🔴 | `reaction='positive'` → **500** (DB CHECK: `enjoyed\|neutral\|sensitive`만 허용) |
| 원인 | `StepFeedbackUpdate.reaction`이 `str`로만 선언 — Pydantic 레벨 enum 검증 없음 |
| 임시 조치 | 올바른 값(`enjoyed`) 사용 시 204 정상 |

### 6J: GET /coaching/cost/status
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| 응답 | `daily_calls=2, daily_cost_usd=0.0, monthly_cost_usd=0.002132, budget_mode=normal` |

### 6K: GET /dashboard/ (데이터 있는 유저)
| 항목 | 결과 |
|------|------|
| status | ✅ 200 |
| stats.total_logs | ✅ 4 |
| stats.current_streak | ✅ 1 |
| recent_logs count | ✅ 4 |
| 응답 키 | dog_profile / stats / recent_logs / issues / env_triggers / env_info / health_meta / profile_meta |

---

### Wave 6 발견 이슈

| 번호 | 경로 | 증상 | 원인 | 심각도 |
|------|------|------|------|--------|
| BUG-01 | `PATCH /coaching/{id}/feedback` | 테스트 코드 실수 (`rating` 사용) — FE는 `score` 정상 사용 | N/A | 닫힘 |
| BUG-02 | `POST /training/feedback` | `reaction='positive'` → 500 | Pydantic enum 미검증, DB CHECK만 존재 | P1 → ✅ 수정완료 (`StepReaction` enum 추가, `schemas.py`) |


---

## Wave 7 — Auth / Dog CRUD / Log CRUD / Subscription / Analytics

> 실행 시각: 2026-05-19 KST | pytest 75 passed

### 결과 요약

| 엔드포인트 | status | 결과 |
|-----------|--------|------|
| `GET /auth/me` | 200 | ✅ role=user, status=active |
| `POST /dogs/` | 201 | ✅ dog_id 반환 |
| `GET /dogs/{id}` | 200 | ✅ 이름/품종 실데이터 |
| `PUT /dogs/{id}` | 200 | ✅ 이름/체중 업데이트 확인 |
| `POST /logs/quick` | 201 | ✅ |
| `PATCH /logs/{id}` | 200 | ✅ intensity/memo 수정 확인 |
| `DELETE /logs/{id}` | 204 | ✅ |
| `GET /logs/{dog_id}` (삭제 후) | 200 | ✅ count=0 |
| `GET /subscription/` | 200 | ✅ null (무료 유저 정상) |
| `GET /subscription/orders` | 200 | ✅ count=0 |
| `GET /onboarding/survey/status/{dog_id}` | 200 | ✅ stage=1, pct=25%, locked=ai_coaching/ask_ai |
| `GET /dogs/{id}/behavior-analytics` | 200 | ✅ total_logs=3, top_behaviors, peak_hour, weekly_trend |
| `POST /coaching/{dog_id}/ask-coach` | 403 | ✅ Pro 전용 가드 정상 |
| `GET /coaching/{dog_id}/question` | 200 | ✅ count=0 |
| `GET /dogs/{dog_id}/step-attempts` | 200 | ✅ count=0 |
| `DELETE /dogs/{id}` | 204 | ✅ (버그 수정 후) |

### Wave 7 발견 버그 & 수정

#### BUG-03: `DELETE /dogs/{id}` → 500 (async cascade lazy-load)

| 항목 | 내용 |
|------|------|
| 증상 | coaching + action_tracker 있는 강아지 삭제 시 500 |
| 원인 | async SQLAlchemy에서 cascade="all, delete-orphan" 관계 lazy load 불가 |
| DB 직접 삭제 | ✅ 성공 (DB CASCADE 정상) — SQLAlchemy 레벨 문제 |
| 수정 | `models.py` Dog.env/logs/case_intakes/coaching_reports + AICoaching.action_tracker에 `passive_deletes=True` 추가 |
| 수정 후 | ✅ 204 (coaching+action_tracker 있는 강아지 삭제 성공) |
| 파일 | `Backend/app/shared/models.py` |
| pytest | 75 passed ✅ |

---

## Wave 8 — Onboarding / 회원탈퇴 / Rate Limit / B2B Org

> 테스트 유저: wave8a@taillog.dev (uid: d0c83ba2), wave8b@taillog.dev (uid: 67365210)
> 두 유저 모두 Supabase Admin API로 생성 후 MCP execute_sql로 users row insert

### 8A — POST /onboarding/survey (stage1→2→3)

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 8A-1 | POST /onboarding/survey/stage1 | ✅ 201 | dog "파도" 생성 (sex enum: "MALE" 필요, "male" → 422) |
| 8A-2 | POST /onboarding/survey/stage2/{dog_id} | ✅ 200 | completion_stage=2, 60% |
| 8A-3 | GET /onboarding/survey/status/{dog_id} | ✅ 200 | stage2_completed_at 정상 |
| 8A-4 | POST /onboarding/survey/stage3/{dog_id} | ✅ 200 | completion_stage=3, 100%, locked_features=[] |

**노트**: stage1 sex 필드는 `"MALE"` (대문자 enum) 필요. `"male"` 전달 시 422 반환 (Pydantic 정상 동작)

---

### 8B — DELETE /auth/me (회원탈퇴 + CASCADE)

| 항목 | 결과 |
|------|------|
| DELETE /auth/me (wave8b JWT) | ✅ 204 |
| DB users row 확인 | ✅ 삭제됨 (SELECT → []) |
| DB dogs row CASCADE | ✅ 삭제됨 (허블 dog도 CASCADE 제거) |

---

### 8C — Coaching 버스트 Rate Limit

| 호출 | HTTP | 비고 |
|------|------|------|
| 1번째 POST /coaching/generate | ✅ 200 | 정상 6블록 생성 |
| 2번째 POST /coaching/generate | ✅ 200 | 정상 6블록 생성 |
| 3번째 POST /coaching/generate | ✅ **429** | `retry_after_sec: 600`, `remaining: 0` |

버스트 제한 2/10분 정확히 작동. `detail.message: "잠시 후 다시 시도해 주세요"` 반환.

---

### 8D — B2B Org 기본 플로우

**BUG-04 발견 및 수정**: B2B 관련 SQLAlchemy 모델에서 DB에 없는 PostgreSQL 커스텀 enum 타입을 참조해 500 발생.

| 항목 | 내용 |
|------|------|
| 증상 | GET /org/{org_id} → 500 (`type "org_member_status" does not exist`) |
| 원인 | 8개 컬럼이 `Enum(..., name="org_xxx_status")` 선언 ↔ DB는 `text` 타입 |
| 영향 컬럼 | OrgMember.role/status, Organization.type/status, OrgDog.status, DogAssignment.role/status, DailyReport.template_type/generation_status, ParentInteraction.interaction_type, OrgSubscription.plan_type/status |
| 수정 | 해당 컬럼 모두 `String` (+ `.value` default) 으로 변경 |
| BUG-04b | OrgResponse.settings `Dict` → `Optional[Dict]` (기존 행 None 허용) |
| 파일 | `Backend/app/shared/models.py`, `Backend/app/features/org/schemas.py` |

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 8D-1 | GET /org/{org_id} (비멤버) | ✅ 403 | "Not a member of this organization" |
| 8D-2 | GET /org/{org_id} (멤버) | ✅ 200 | 멍멍피트 org 정보 반환 |
| 8D-3 | GET /org/{org_id}/members | ✅ 200 | 2명 (owner + staff) 반환 |
| 8D-4 | GET /org/{org_id}/members/count | ✅ 200 | `{"count": 2}` |
| 8D-5 | GET /org/{org_id}/dogs/count | ✅ 200 | `{"count": 1}` |

**pytest**: 75 passed ✅ (수정 후 전체 통과)

---

## Wave 9 — Dashboard / Settings / Subscription / Notification / Analytics / Report

> 테스트 유저: wave9@taillog.dev (uid: e4d4b4b2) — 테스트 후 삭제 완료

### 9A — Dashboard

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 9A-1 | GET /dashboard/?dog_id={id} | ✅ 200 | dog_profile·stats·recent_logs·issues 구조 정상 |

---

### 9B — Settings

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 9B-1 | GET /settings/ | ✅ 200 | notification_pref·ai_persona·marketing_agreed 반환 |
| 9B-2 | PATCH /settings/ (notification_pref) | ✅ 200 | push→false, start_hour→23 변경 반영됨 |

**노트**: PATCH 필드는 `push_enabled` 등 flat 형식이 아닌 `notification_pref` JSONB 객체 통째로 전달해야 함.

---

### 9C — Subscription

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 9C-1 | GET /subscription/ | ✅ 200 | 신규 유저 → `null` 반환 (정상) |
| 9C-2 | GET /subscription/orders | ✅ 200 | `[]` 반환 |

---

### 9D — Notification

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 9D-1 | GET /notification/ | ✅ 200 | `[]` |
| 9D-2 | PATCH /notification/{id}/read (없는 id) | ✅ 200 | `{"success":true}` — soft 처리 |

---

### 9E — Analytics

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 9E-1 | GET /dogs/{id}/behavior-analytics | ✅ 200 | top_behaviors, avg_intensity, peak_hour 정상 |
| 9E-2 | GET /dogs/{id}/step-attempts | ✅ 200 | `[]` (훈련 미진행) |

---

### 9F — Report (B2B)

**BUG-05 발견 및 수정**

| 항목 | 내용 |
|------|------|
| 증상 | POST /report/ → 500 (`column "behavior_summary" is of type jsonb but expression is of type character varying`) |
| 원인 | `DailyReport.behavior_summary = Column(Text)` ↔ DB: `jsonb` |
| 추가 불일치 | `highlight_photo_urls = Column(JSONB)` ↔ DB: `text[]` (ARRAY) |
| 수정 | `behavior_summary → Column(JSONB)`, `highlight_photo_urls → Column(ARRAY(String), default=[])` |
| 파일 | `Backend/app/shared/models.py` |

| 케이스 | 엔드포인트 | 결과 | 비고 |
|--------|-----------|------|------|
| 9F-1 | GET /report/org/{org_id} | ✅ 200 | 기존 보고서 1건 반환 |
| 9F-2 | GET /report/dog/{dog_id} | ✅ 200 | `[]` |
| 9F-3 | POST /report/ (생성) | ✅ 201 (수정 후) | BUG-05 수정 전 500 → 수정 후 201 |
| 9F-4 | PATCH /report/{id} (내용 업데이트) | ✅ 200 | condition_notes 변경 반영 |
| 9F-5 | GET /report/{id} (단건) | ✅ 200 | |

**pytest**: 75 passed ✅

