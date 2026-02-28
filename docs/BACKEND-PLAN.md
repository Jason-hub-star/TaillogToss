# TaillogToss 인프라 + Backend 구현 플랜

## Context

프론트엔드 완료 상태. **사업자등록 완료 + 앱 배포 완료(2026-02-27, 사용자 보고)**, Supabase 프로젝트 있음(일부 테이블).
백엔드 코드 작성 전에 **인프라 기반**(DB 스키마, Edge Function, mTLS, 토스 콘솔)을 먼저 구축하여
백엔드 개발 시 실 DB/실 Edge Function으로 즉시 테스트 가능하게 함.

**실행 순서**: INFRA-1~3 (인프라) → BE-P1~P8 (백엔드 코드)

**핵심 원칙**:
- 프론트(`src/lib/api/*.ts`) ↔ 백엔드(`features/*/`) 파일명 1:1 매칭
- DogCoach 패턴 참조, 토스 미니앱 스펙 적용
- Guest 모드 완전 제거 (Toss Login only)
- Edge Function = Toss S2S mTLS 전담, FastAPI = AI/비즈니스 로직 전담

---

## INFRA-1: Supabase DB 스키마 완성 + MCP 설정 ✅ 완료

### 목표
기존 Supabase DB의 누락 테이블을 추가하여 38테이블 완성. MCP로 DB 작업 효율화.

### 완료 결과 (2026-02-28)
- **26 → 38 테이블** (13개 신규: B2B 10 + toss_orders + edge_function_requests + pii_access_log)
- **Enum 마이그레이션**: user_role (GUEST/USER/PRO_USER/EXPERT/ADMIN → user/trainer/org_owner/org_staff), user_status (ACTIVE → active)
- **8개 기존 테이블 컬럼 추가**: users(toss_user_key, pepper_version), dogs(weight_kg), behavior_logs(quick_category, daily_activity, location, memo, org_id, recorded_by), ai_coaching(blocks, ai_tokens_used), subscriptions(ai_tokens_remaining/total), action_tracker(action_item_id, completed_at), user_training_status(dog_id, current_variant, memo)
- **RLS**: 30+ 정책 + 3 헬퍼 함수 (is_org_member, is_parent_of_dog, is_org_member_with_role)
- **PII**: org_dogs_pii 4방향 차단 + get_parent_contact RPC + purge_expired_pii
- Supabase 마이그레이션: `20260228015912_b2c_column_gaps_and_enum_migration` + `20260228020042_b2b_tables_and_extensions`

### 작업 순서

**1-A. Supabase MCP 설정**
- Claude Code에서 Supabase MCP 서버 연결
- DB 직접 조회/관리 가능하도록 설정

**1-B. 기존 스키마 확인**
- MCP로 현재 존재하는 테이블/컬럼 전수 조사
- `supabase/migrations/` SQL 파일과 실 DB 비교
- 누락 테이블, 누락 컬럼, 타입 불일치 식별

**1-C. 누락 스키마 적용**
- B2C 기본 테이블 누락분 SQL 실행 (users, dogs, dog_envs, behavior_logs, coaching_results, training_progress, subscriptions, toss_orders, user_settings, media_assets, noti_history)
- B2B 확장 테이블 (이미 `20260228_b2b_tables.sql` 있음 → 적용 여부 확인)
- Phase 11 noti_history 확장 (`20260227121000_phase11_expand_noti_history.sql`)
- RLS 정책 + 헬퍼 함수 (is_org_member, get_parent_contact 등)
- 인덱스 + 트리거

**1-D. 스키마 검증**
- 프론트엔드 `src/types/*.ts` 필드와 실 DB 컬럼 1:1 대조
- RLS 정책 활성 확인
- FK 관계 정확성 확인

### 검증
- ✅ MCP `list_tables` → 38개 테이블 확인
- ✅ `execute_sql` → 핵심 컬럼 추가 검증 (toss_user_key, weight_kg, blocks, ai_tokens_used 등)
- ✅ Backend pytest 39/39 통과

---

## INFRA-2: Edge Function 배포 + Secrets 등록

### 목표
7종 Edge Function을 Supabase에 배포하고 필요한 secrets 등록.

### 대상 함수 (supabase/config.toml 기준)

| 함수 | verify_jwt | 용도 |
|------|-----------|------|
| `login-with-toss` | false | Toss OAuth → Supabase Auth (로그인 전 호출) |
| `verify-iap-order` | true | IAP 결제 검증 |
| `send-smart-message` | true | Smart Message 발송 |
| `grant-toss-points` | true | 토스 포인트 지급 |
| `legal` | false | 법적 문서 4종 HTML |
| `toss-disconnect` | false | 연동 해제 콜백 |
| `generate-report` | true | B2B 리포트 생성 |

*고정 규칙: `login-with-toss`만 `verify_jwt=false`, 나머지는 함수별 정책대로 유지

### Secrets 등록 목록

| Secret | 용도 |
|--------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 작업 |
| `SUPER_SECRET_PEPPER` | 비밀번호 파생 |
| `TOSS_PII_DECRYPTION_KEY_BASE64` | Toss 암호화 PII 복호화 키 (login-with-toss 전용) |
| `TOSS_PROFILE_DECRYPTION_KEY_BASE64` | 구 키명 호환 (레거시) |
| `TOSS_MTLS_MODE` | mTLS 모드 강제(`real`/`mock`). `real`일 때 `TOSS_CLIENT_CERT_BASE64`/`TOSS_CLIENT_KEY_BASE64` 필수 |
| `TOSS_CLIENT_CERT_BASE64` | mTLS 인증서 (INFRA-3 이후) |
| `TOSS_CLIENT_KEY_BASE64` | mTLS 개인키 (INFRA-3 이후) |
| `TOSS_CALLBACK_AUTH_ID` | toss-disconnect Basic Auth |
| `TOSS_CALLBACK_AUTH_PW` | toss-disconnect Basic Auth |
| `OPENAI_API_KEY` | AI 코칭 (generate-report) |

### 배포 절차
1. `supabase functions deploy login-with-toss` (7종 각각)
2. `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` 등
3. 각 함수 URL 접근 테스트

### 검증
- `supabase functions list` → 7종 등록 확인
- `curl {SUPABASE_URL}/functions/v1/legal?doc=terms` → HTML 응답
- `curl {SUPABASE_URL}/functions/v1/login-with-toss` → 적절한 에러 응답 (인증 없이)

---

## INFRA-3: 토스 콘솔 등록 + mTLS 인증서

### 목표
사업자등록 완료 후 토스 개발자 콘솔에 앱 등록, mTLS 인증서 발급, 콜백 URL 설정.

### 작업 순서

**3-A. 토스 개발자 콘솔 앱 등록**
- [developers-apps-in-toss.toss.im](https://developers-apps-in-toss.toss.im/) 접속
- 앱 이름: 테일로그 (taillog-app)
- 약관 URL 등록:
  - 이용약관: `{SUPABASE_URL}/functions/v1/legal?doc=terms`
  - 개인정보: `{SUPABASE_URL}/functions/v1/legal?doc=privacy`
  - 마케팅: `{SUPABASE_URL}/functions/v1/legal?doc=marketing`
  - 광고: `{SUPABASE_URL}/functions/v1/legal?doc=ads`
- 콜백 URL:
  - 연동 해제: `{SUPABASE_URL}/functions/v1/toss-disconnect`

**3-B. mTLS 인증서 발급**
- 콘솔에서 인증서 다운로드 (cert.pem + key.pem)
- Base64 인코딩: `base64 -w0 cert.pem > cert.b64`
- Supabase secrets에 등록:
  - `TOSS_CLIENT_CERT_BASE64`
  - `TOSS_CLIENT_KEY_BASE64`
- ⚠️ 인증서 파일은 절대 git 커밋 금지 (.gitignore 확인)

**3-C. Sandbox 로그인 테스트**
- 토스 Sandbox 앱 설치
- 로그인 플로우 실 테스트: 토스 로그인 → Edge Function → Supabase Auth → 세션

### 검증
- 콘솔에서 테스트 버튼 → 콜백 정상 응답
- mTLS 인증서로 토스 API 호출 성공
- Sandbox 앱에서 로그인 플로우 완료

---

## 아키텍처

```
클라이언트(RN) ─── Supabase (직접 CRUD: dogs, logs, settings 등)
     │
     ├───── Edge Functions (Toss S2S mTLS)
     │        login-with-toss, verify-iap-order, send-smart-message,
     │        grant-toss-points, legal, toss-disconnect, generate-report
     │
     └───── FastAPI (AI + 복잡 로직)
              coaching 생성, 대시보드 집계, B2B 복합 쿼리, 예산 관리
```

**FastAPI가 필요한 이유**: AI 코칭 생성 (300+ 라인 로직, 예산 제어, 룰 폴백)은 Edge Function 25초/128MB 제한 내 불가.

---

## BE-P1: 프로젝트 스캐폴딩 + 설정 + DB + Alembic

### 생성 파일

```
Backend/
  CLAUDE.md
  requirements.txt
  Dockerfile
  .env.example
  alembic.ini
  alembic/
    env.py
    script.mako
    versions/          (빈 디렉토리)
  app/
    __init__.py
    CLAUDE.md
    main.py            # FastAPI 앱 팩토리 + 미들웨어 + 라우터
    core/
      __init__.py
      config.py        # pydantic-settings (AI 예산 포함)
      database.py      # async SQLAlchemy (Supabase pooler 호환)
      security.py      # Supabase JWT 로컬 검증 (guest 없음)
      exceptions.py    # DomainException 계층
      constants.py     # 앱 상수 (플랜 한도, AI 제한)
    shared/
      __init__.py
      utils/
        __init__.py
        ownership.py   # verify_dog_ownership (user_id only)
      clients/
        __init__.py
        openai_client.py  # 비용 제어 OpenAI 클라이언트
```

### DogCoach 참조 → 적응

| 대상 파일 | DogCoach 소스 | 변경 사항 |
|-----------|--------------|----------|
| `core/config.py` | `DogCoach/Backend/app/core/config.py` | `ANONYMOUS_COOKIE_*`, `KAKAO_API_KEY` 제거. `SUPABASE_JWT_SECRET`, `TOSS_APP_ID` 추가. AI 예산 설정 유지 |
| `core/database.py` | `DogCoach/Backend/app/core/database.py` | 동일 패턴 (Supabase pooler → NullPool + statement_cache_size=0) |
| `core/security.py` | `DogCoach/Backend/app/core/security.py` | Supabase 원격 검증 → `python-jose` 로컬 JWT 디코드. `get_current_user_id_optional` 완전 제거 |
| `core/exceptions.py` | `DogCoach/Backend/app/core/exceptions.py` | 동일 복사 + `ForbiddenException` 추가 (역할 검증용) |
| `shared/utils/ownership.py` | `DogCoach/Backend/app/shared/utils/ownership.py` | `guest_id` 파라미터 제거. B2B org 멤버십 체크 경로 추가 |
| `shared/clients/openai_client.py` | `DogCoach/Backend/app/shared/clients/openai_client.py` | 동일 패턴 (gpt-4o-mini, 비용 추적, 재시도 1회) |

### config.py 핵심 차이

```python
# DogCoach에서 제거
# ANONYMOUS_COOKIE_DOMAIN, KAKAO_API_KEY, AI_API_URL(로컬 Ollama)

# 토스 전용 추가
SUPABASE_JWT_SECRET: str        # JWT 로컬 검증
SUPABASE_SERVICE_ROLE_KEY: str  # 관리자 Supabase 작업
TOSS_APP_ID: str | None = None  # 토스 미니앱 식별자

# DogCoach에서 유지 (AI 예산)
AI_DAILY_BUDGET_USD: float = 5.0
AI_MONTHLY_BUDGET_USD: float = 30.0
AI_USER_DAILY_LIMIT: int = 6
AI_USER_BURST_LIMIT: int = 2
AI_USER_BURST_WINDOW_MIN: int = 10
```

### security.py 인증 패턴

```python
# DogCoach: supabase.auth.get_user(token) 원격 호출
# TaillogToss: python-jose 로컬 디코드 (저지연)
from jose import jwt
payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET,
                     algorithms=["HS256"], audience="authenticated")
user_id = payload.get("sub")
# role은 users 테이블에서 조회 (JWT claims에 없을 수 있음)
```

### 검증
1. `pip install -r requirements.txt` 성공
2. `python -c "from app.core.config import settings"` 성공
3. `alembic check` 성공
4. `uvicorn app.main:app` → `/health` 200 응답

---

## BE-P2: SQL 마이그레이션 (22 테이블 + RLS)

### 생성 파일

```
Backend/
  alembic/
    versions/
      001_b2c_core_tables.py    # B2C 11테이블 + 보조 1테이블
      002_b2b_extension.py      # B2B 10테이블 (SCHEMA-B2B.md 기준)
```

### B2C 테이블 (001) — 프론트엔드 types/ 기준

| 테이블 | 프론트 타입 | DogCoach 대비 변경 |
|--------|-----------|------------------|
| `users` | `types/auth.ts` | `kakao_sync_id`→`toss_user_key`, role enum 4종(user/trainer/org_owner/org_staff), `pepper_version` 추가 |
| `dogs` | `types/dog.ts` | `anonymous_sid` 제거, `weight_kg NUMERIC(5,2)` 추가 |
| `dog_envs` | `types/dog.ts` | 테이블명 `dog_env`→`dog_envs` (FE 기준) |
| `behavior_logs` | `types/log.ts` | `quick_category`, `daily_activity`, `duration_minutes`, `location`, `memo`, `org_id`, `recorded_by` 추가 |
| `media_assets` | `types/log.ts` | asset_type `'PHOTO'\|'VIDEO'`만, B2B 컬럼 추가 |
| `coaching_results` | `types/coaching.ts` | DogCoach `ai_coaching` 대체. `blocks` JSONB 6블록 구조 |
| `action_tracker` | `types/coaching.ts` | 신규. 코칭 액션 아이템 완료 추적 |
| `training_progress` | `types/training.ts` | DogCoach `user_training_status` 대체. `completed_steps TEXT[]` |
| `subscriptions` | `types/subscription.ts` | `ai_tokens_remaining/total` 추가. PG 관련 컬럼 제거 |
| `toss_orders` | `types/subscription.ts` | 신규. 2축 상태(`toss_status` × `grant_status`) |
| `noti_history` | `types/notification.ts` | Phase 11 확장 컬럼 포함 |
| `pii_access_log` | — | 보조. PII 접근 감사 |

### B2B 테이블 (002) — docs/SCHEMA-B2B.md 기준

`organizations`, `org_members`, `org_dogs`, `org_dogs_pii`, `dog_assignments`, `daily_reports`, `parent_interactions`, `org_analytics_daily`, `org_subscriptions`, `ai_cost_usage_org` (10개)

**기존 마이그레이션 SQL 참조**:
- `supabase/migrations/20260227121000_phase11_expand_noti_history.sql`
- `supabase/migrations/20260228_b2b_tables.sql`

### RLS 4-tier 정책
1. `service_role` 전체 접근
2. `auth.uid() = user_id` 본인 데이터
3. `is_org_member(org_id)` 조직 데이터
4. `share_token` 공개 접근 (daily_reports)

### 검증
1. `alembic upgrade head` 에러 없이 완료
2. 테이블 수 22+ 확인
3. RLS 활성 확인
4. 기존 FE 마이그레이션 SQL과 중복 없음 확인

---

## BE-P3: SQLAlchemy 모델 + Pydantic 스키마

### 생성 파일

```
Backend/
  app/
    shared/
      models/
        __init__.py          # Base + 전체 export
        user.py              # User (toss_user_key, 4 role)
        dog.py               # Dog, DogEnv
        log.py               # BehaviorLog, MediaAsset
        coaching.py          # CoachingResult(6블록), ActionTracker
        training.py          # TrainingProgress
        subscription.py      # Subscription, TossOrder
        settings.py          # UserSettings
        notification.py      # NotiHistory
        ai_cost.py           # AICostUsageDaily, AICostUsageMonthly
        b2b.py               # 10 B2B 모델
      schemas/
        __init__.py
        common.py            # 기본 스키마, 페이지네이션, 에러
```

### 프론트 타입 → 모델 매핑

| 프론트 `types/*.ts` | 백엔드 `models/*.py` | 비고 |
|---------------------|---------------------|------|
| `auth.ts::User` | `user.py::User` | `toss_user_key` UNIQUE, role 4종 |
| `dog.ts::Dog` | `dog.py::Dog` | `anonymous_sid` 없음 |
| `dog.ts::DogEnv` | `dog.py::DogEnv` | JSONB 필드 10종 |
| `log.ts::BehaviorLog` | `log.py::BehaviorLog` | B2B 확장 컬럼 포함 |
| `coaching.ts::CoachingResult` | `coaching.py::CoachingResult` | `blocks` JSONB |
| `training.ts::TrainingProgress` | `training.py::TrainingProgress` | `completed_steps TEXT[]` |
| `subscription.ts::Subscription` | `subscription.py::Subscription` | AI 토큰 추적 |
| `subscription.ts::TossOrder` | `subscription.py::TossOrder` | 2축 상태 |
| `b2b.ts::*` | `b2b.py::*` | 10 모델 |

### DogCoach 모델 패턴 (유지)
- `UUID(as_uuid=True)` + `default=uuid4`
- `DateTime(timezone=True)` 모든 타임스탬프
- `server_default=func.now()` created_at
- `onupdate=func.now()` updated_at
- JSONB로 유연한 데이터
- FK에 `index=True` 필수
- 복합 인덱스 `__table_args__`

### 검증
1. `python -c "from app.shared.models import Base; print(len(Base.metadata.tables))"` → 22+
2. 프론트 타입 필드 ↔ 모델 컬럼 전수 대조

---

## BE-P4: Dogs + Log 기능 (CRUD)

### 생성 파일 — 프론트 `api/dog.ts`, `api/log.ts` 매칭

```
Backend/
  app/
    features/
      __init__.py
      dogs/                  ← src/lib/api/dog.ts
        __init__.py
        router.py
        service.py
        repository.py
        schemas.py
      log/                   ← src/lib/api/log.ts
        __init__.py
        router.py
        service.py
        repository.py
        schemas.py
```

### 엔드포인트 매핑

**dogs/** — `src/lib/api/dog.ts` 함수 기준:

| FE 함수 | BE 엔드포인트 | 비고 |
|---------|-------------|------|
| `getDogs(userId)` | `GET /api/v1/dogs` | JWT에서 userId 추출 |
| `getDog(dogId)` | `GET /api/v1/dogs/{dogId}` | 소유권 검증 |
| `getDogEnv(dogId)` | `GET /api/v1/dogs/{dogId}/env` | 404-safe |
| `createDogFromSurvey(userId, survey)` | `POST /api/v1/dogs` | dog + dog_env 동시 생성 |
| `updateDog(dogId, updates)` | `PUT /api/v1/dogs/{dogId}` | 부분 업데이트 |
| `deleteDog(dogId)` | `DELETE /api/v1/dogs/{dogId}` | 소유권 확인, cascade |

**log/** — `src/lib/api/log.ts` 함수 기준:

| FE 함수 | BE 엔드포인트 | 비고 |
|---------|-------------|------|
| `getLogs(dogId, limit)` | `GET /api/v1/logs/{dogId}?limit=50` | 소유권 검증 |
| `getDailyLogs(dogId, date)` | `GET /api/v1/logs/{dogId}/daily?date=YYYY-MM-DD` | 날짜 범위 |
| `createQuickLog(input)` | `POST /api/v1/logs/quick` | `is_quick_log=true` |
| `createDetailedLog(input)` | `POST /api/v1/logs/detailed` | ABC 필수 |
| `deleteLog(logId)` | `DELETE /api/v1/logs/{logId}` | dog_id 경유 소유권 |

### DogCoach 참조

| 대상 | DogCoach 소스 | 변경 |
|------|--------------|------|
| `dogs/router.py` | `DogCoach/Backend/app/features/dogs/router.py` | guest 경로 제거, 리스트 엔드포인트 추가 |
| `dogs/service.py` | `DogCoach/Backend/app/features/dogs/service.py` | `anonymous_sid` 제거, 멀티독 한도 체크(FREE=1, PRO=5) |
| `log/router.py` | `DogCoach/Backend/app/features/log/router.py` | 퀵로그 엔드포인트 추가, guest 쿠키 제거 |
| `log/service.py` | `DogCoach/Backend/app/features/log/service.py` | `quick_category`, `daily_activity` 처리 추가 |

### 토스 적응
- `request.cookies.get("anonymous_sid")` 전부 제거
- Dog 생성 시 구독 체크: FREE=1마리, PRO=5마리
- B2B 사용자 로그: `org_id`, `recorded_by` 자동 설정

### 검증
1. Dog CRUD 테스트 통과
2. Log CRUD + 날짜 필터 테스트 통과
3. 소유권 검증: 타인 dog 접근 시 403

---

## BE-P5: Coaching 기능 (AI 6블록 생성 + 예산 + 룰 폴백)

**가장 중요한 Phase.** DogCoach의 `ai_recommendations` + `coach` 2개 모듈을 6블록 코칭으로 통합.

### 생성 파일 — `src/lib/api/coaching.ts` 매칭

```
Backend/
  app/
    features/
      coaching/              ← src/lib/api/coaching.ts
        __init__.py
        router.py
        service.py           # AI 생성 오케스트레이션 (캐시→예산→룰→AI→폴백)
        repository.py
        schemas.py
        prompts.py           # 6블록 시스템/유저 프롬프트
        rule_engine.py       # 룰 기반 폴백 (LLM 없이)
        budget.py            # 예산 관리, 중복제거, 쿼터
```

### 엔드포인트 매핑

| FE 함수 | BE 엔드포인트 | 비고 |
|---------|-------------|------|
| `getCoachings(dogId)` | `GET /api/v1/coaching/{dogId}` | 전체 목록 |
| `getLatestCoaching(dogId)` | `GET /api/v1/coaching/{dogId}/latest` | 최신 1건 |
| `submitCoachingFeedback(id, score)` | `PATCH /api/v1/coaching/{id}/feedback` | 별점 |
| **신규: 생성** | `POST /api/v1/coaching/generate` | AI 6블록 생성 |
| **신규: 비용 현황** | `GET /api/v1/coaching/cost-status` | 관리자용 |

### 6블록 생성 플로우 (`types/coaching.ts` 기준)

```
Block 1 (FREE): insight       — 패턴 요약, 트렌드
Block 2 (FREE): action_plan   — 3단계 교정 프로토콜
Block 3 (FREE): dog_voice     — 강아지 시점 메시지
Block 4 (PRO):  next_7_days   — 7일 훈련 계획
Block 5 (PRO):  risk_signals  — 위험 신호
Block 6 (PRO):  consultation  — 전문가 질문
```

**오케스트레이션 순서** (DogCoach `ai_recommendations/service.py` 적응):
1. 구독 tier 확인 (FREE=블록 1~3만, PRO=전체)
2. 중복제거 키 계산: `sha256(dog_id|report_type|behavior_hash|prompt_version|model)`
3. 캐시 조회 → HIT면 즉시 반환 (제로 LLM 호출)
4. 예산 게이트: `normal`(0~80%) / `saving_mode`(80~100%) / `rule_only`(100%)
5. 유저 쿼터: 일 6회 + 10분당 2회 버스트
6. 룰 엔진으로 후보 생성
7. OpenAI 호출 (후보를 컨텍스트로 전달)
8. 응답 검증 → 실패 시 룰 폴백
9. coaching_result 저장 + 비용 기록
10. 응답 반환

### DogCoach 참조

| 대상 | DogCoach 소스 | 변경 |
|------|--------------|------|
| `service.py` | `ai_recommendations/service.py` | 3-추천 → 6-블록 구조로 확장 |
| `budget.py` | `ai_recommendations/budget.py` | `anonymous_sid` 쿼터 체크 제거 |
| `rule_engine.py` | `ai_recommendations/rule_engine.py` | 6블록 구조 템플릿으로 확장 |
| `prompts.py` | `ai_recommendations/prompts.py` + `coach/prompts.py` | 6블록 JSON 출력 프롬프트 |
| `openai_client.py` | `shared/clients/openai_client.py` | 동일 (비용 추적 + 재시도) |

### 검증
1. 룰 폴백: 예산 0으로 생성 → 유효한 6블록 룰 결과
2. AI 생성: API 키 + 예산 있을 때 → AI 생성 6블록
3. 캐시: 동일 데이터 2회 요청 → 캐시 HIT (LLM 0회)
4. 예산 게이트: 일일 한도 초과 → 룰 엔진 폴백
5. PRO 게이트: FREE=블록 1~3만, PRO=전체 6블록

---

## BE-P6: Training + Settings + Dashboard

### 생성 파일

```
Backend/
  app/
    features/
      training/              ← src/lib/api/training.ts
        __init__.py
        router.py
        service.py
        repository.py
        schemas.py
      settings/              ← src/lib/api/settings.ts
        __init__.py
        router.py
        service.py
        repository.py
        schemas.py
      dashboard/             ← (대시보드 집계)
        __init__.py
        router.py
        service.py
        schemas.py
```

### 엔드포인트 매핑

**training/**:

| FE 함수 | BE 엔드포인트 |
|---------|-------------|
| `getTrainingProgress(dogId)` | `GET /api/v1/training/{dogId}` |
| `getCurriculumProgress(dogId, cId)` | `GET /api/v1/training/{dogId}/{curriculumId}` |
| `startTraining(dogId, cId, variant)` | `POST /api/v1/training/start` |
| `completeStep(progressId, stepId)` | `PATCH /api/v1/training/{progressId}/step` |
| `changeVariant(progressId, variant)` | `PATCH /api/v1/training/{progressId}/variant` |

**settings/**:

| FE 함수 | BE 엔드포인트 |
|---------|-------------|
| `getSettings(userId)` | `GET /api/v1/settings` |
| `updateSettings(userId, updates)` | `PUT /api/v1/settings` |

**dashboard/** (집계):

| 용도 | BE 엔드포인트 |
|------|-------------|
| 전체 대시보드 | `GET /api/v1/dashboard/{dogId}?timezone=Asia/Seoul` |

### DogCoach 참조

| 대상 | DogCoach 소스 | 변경 |
|------|--------------|------|
| `training/service.py` | `coach/service.py:323-513` | `user_training_status`→`training_progress` 테이블 |
| `settings/service.py` | `settings/service.py` | JIT 패턴 유지, `language` 필드 추가 |
| `dashboard/service.py` | `dashboard/service.py` | guest 처리 제거, FE 필드명 매칭 |

### 검증
1. Training: 시작→스텝 완료→진행 상태 확인
2. Settings: 기본값 생성→부분 업데이트→JSONB 병합 확인
3. Dashboard: 집계 결과 정확성 (통계/스트릭/최근 로그)

---

## BE-P7: B2B 기능 (org, report)

### 생성 파일

```
Backend/
  app/
    features/
      org/                   ← src/lib/api/org.ts
        __init__.py
        router.py
        service.py
        repository.py
        schemas.py
      report/                ← src/lib/api/report.ts
        __init__.py
        router.py
        service.py
        repository.py
        schemas.py
```

### 엔드포인트 매핑

**org/** — `src/lib/api/org.ts` 함수 14개:

| FE 함수 | BE 엔드포인트 |
|---------|-------------|
| `getOrg(orgId)` | `GET /api/v1/org/{orgId}` |
| `getOrgMembers(orgId)` | `GET /api/v1/org/{orgId}/members` |
| `getOrgDogs(orgId)` | `GET /api/v1/org/{orgId}/dogs` |
| `enrollDog(input)` | `POST /api/v1/org/{orgId}/dogs` |
| `dischargeDog(orgDogId)` | `PATCH /api/v1/org/dogs/{orgDogId}/discharge` |
| `inviteMember(input)` | `POST /api/v1/org/{orgId}/members` |
| `assignDog(input)` | `POST /api/v1/org/{orgId}/assignments` |
| `getOrgTodayStats(orgId)` | `GET /api/v1/org/{orgId}/analytics/today` |
| ... | 나머지 6개 CRUD |

**핵심: `getOrgDogs` 최적화** — FE는 5개 쿼리 + JS 병합. BE는 단일 SQL:

```sql
SELECT od.*, d.name, d.breed,
  COUNT(bl.id) FILTER (WHERE bl.occurred_at >= today) as today_log_count,
  EXISTS(SELECT 1 FROM daily_reports dr ...) as has_today_report,
  da.trainer_user_id
FROM org_dogs od
JOIN dogs d ON d.id = od.dog_id
LEFT JOIN behavior_logs bl ON ...
LEFT JOIN dog_assignments da ON ...
WHERE od.org_id = :org_id AND od.status = 'active'
GROUP BY od.id, d.id, da.trainer_user_id
```

**report/** — `src/lib/api/report.ts` 함수 9개:

| FE 함수 | BE 엔드포인트 |
|---------|-------------|
| `getOrgReports(orgId, date?)` | `GET /api/v1/report/org/{orgId}` |
| `generateReport(input)` | `POST /api/v1/report/generate` |
| `sendReport(reportId)` | `POST /api/v1/report/{reportId}/send` |
| `getReportByShareToken(token)` | `GET /api/v1/report/shared/{token}` (공개) |
| `createInteraction(input)` | `POST /api/v1/report/{reportId}/interactions` |
| ... | 나머지 4개 CRUD |

### 역할 가드
- `org_owner`/`manager`: 전체 CRUD
- `staff`: 읽기 + 로그/리포트 생성
- `viewer`: 읽기만

### 검증
1. Org CRUD: 생성→멤버 초대→강아지 등록→카운트 확인
2. `getOrgDogs`: today_log_count, has_today_report 정확
3. Report: 생성→generation_status 플로우 확인
4. Share token: 비인증 공개 접근
5. PII: `org_dogs_pii`에 암호화 저장 확인

---

## BE-P8: 셀프 리뷰 + 통합 테스트

### 생성 파일

```
Backend/
  tests/
    __init__.py
    conftest.py              # 픽스처: async DB, 테스트 유저/dog
    test_health.py
    test_security.py
    test_ownership.py
    features/
      __init__.py
      test_dogs.py
      test_log.py
      test_coaching.py
      test_training.py
      test_settings.py
      test_dashboard.py
      test_org.py
      test_report.py
  pytest.ini
```

### 셀프 리뷰 체크리스트 (전 Phase 공통)
1. **3계층 분리**: Router(HTTP) → Service(비즈니스) → Repository(DB). SQLAlchemy 라우터 침투 금지
2. **전체 async**: 모든 I/O 함수 `async`
3. **DI**: `Depends(get_db)`, `Depends(get_current_user_id)`
4. **소유권 검증**: dog/log/coaching 접근 시 반드시 확인
5. **역할 인가**: B2B 엔드포인트 org 멤버십 역할 체크
6. **파일 헤더**: 모든 파일 상단 1~3줄 요약 주석
7. **스키마 검증**: Pydantic으로 입력 타입/제약 검증
8. **에러 처리**: Service에서 DomainException (HTTPException 금지)
9. **타입 패리티**: 응답 스키마 필드 = 프론트 TypeScript 타입 필드
10. **Guest 코드 없음**: `anonymous_sid`, `get_current_user_id_optional`, 쿠키 체크 없음

### 검증
1. `pytest tests/ -v` 전체 통과
2. `uvicorn app.main:app` → 모든 라우터 등록 확인
3. `/docs` OpenAPI 문서 렌더링
4. FE `api/*.ts` 함수 ↔ BE 엔드포인트 전수 대조

---

## Phase 의존성

```
BE-P1 (스캐폴딩) → BE-P2 (마이그레이션) → BE-P3 (모델/스키마)
                                                 │
                                    ┌────────────┼────────────┐
                                    ▼            ▼            ▼
                              BE-P4 (dogs+log) BE-P5 (coaching) BE-P6 (training+settings+dashboard)
                                    │            │
                                    └────┬───────┘
                                         ▼
                                   BE-P7 (B2B: org+report)
                                         │
                                         ▼
                                   BE-P8 (리뷰+테스트)
```

P4→P5: coaching이 log 데이터 참조
P4+P5→P7: B2B가 B2C 기능 의존

---

## 커밋 전략

```
BE-P1: "feat(backend): project scaffolding + config + database + Alembic"
BE-P2: "feat(backend): SQL migrations — 22 tables + RLS + triggers"
BE-P3: "feat(backend): SQLAlchemy models + Pydantic schemas"
BE-P4: "feat(backend): dogs + log features (CRUD + ownership)"
BE-P5: "feat(backend): coaching — AI 6-block generation + budget + rule fallback"
BE-P6: "feat(backend): training + settings + dashboard features"
BE-P7: "feat(backend): B2B org management + report generation"
BE-P8: "feat(backend): self-review fixes + integration test suite"
```

---

## 다음 플랜 추천 (백엔드 완료 후)

1. **FE→BE API 연결**: `src/lib/api/*.ts`에서 복잡 쿼리를 FastAPI 호출로 전환. `src/lib/api/backend.ts` HTTP 클라이언트 래퍼 생성. 단순 CRUD는 Supabase 유지.

2. **Edge Function 배포 + 시크릿 등록**: 7종 Edge Function 실 Supabase 배포. 환경변수/시크릿 등록. FE 연결 검증.

3. **Phase 13: E2E 테스트 + Sandbox 검증**: 전체 플로우 E2E 테스트 (Toss Login → 설문 → 대시보드 → 기록 → 코칭 → 훈련). IAP 3시나리오 테스트. `.ait` 번들 빌드.

---

## 주요 참조 파일

| 용도 | 경로 |
|------|------|
| DogCoach AI 서비스 | `C:\Users\gmdqn\DogCoach\Backend\app\features\ai_recommendations\service.py` |
| DogCoach 모델 17종 | `C:\Users\gmdqn\DogCoach\Backend\app\shared\models.py` |
| DogCoach OpenAI 클라이언트 | `C:\Users\gmdqn\DogCoach\Backend\app\shared\clients\openai_client.py` |
| DogCoach 예산 관리 | `C:\Users\gmdqn\DogCoach\Backend\app\features\ai_recommendations\budget.py` |
| DogCoach 룰 엔진 | `C:\Users\gmdqn\DogCoach\Backend\app\features\ai_recommendations\rule_engine.py` |
| FE 코칭 타입 (6블록) | `C:\Users\gmdqn\tosstaillog\src\types\coaching.ts` |
| FE B2B org API (5쿼리) | `C:\Users\gmdqn\tosstaillog\src\lib\api\org.ts` |
| B2B 스키마 명세 | `C:\Users\gmdqn\tosstaillog\docs\SCHEMA-B2B.md` |
| 기존 B2B 마이그레이션 | `C:\Users\gmdqn\tosstaillog\supabase\migrations\20260228_b2b_tables.sql` |
| Feature Parity Matrix | `C:\Users\gmdqn\tosstaillog\docs\11-FEATURE-PARITY-MATRIX.md` |

---

## 세션 재개 가이드

다음 세션에서 이 플랜을 이어서 실행하려면:

```
"BACKEND-PLAN.md 읽고 BE-P1부터 순서대로 구현해줘.
DogCoach 참조 파일도 같이 읽어서 패턴 맞춰줘."
```

### 선행 조건 (사용자 수동)
- [ ] Supabase MCP 연결 (INFRA-1용, 선택사항)
- [ ] `tosstaillog/Backend/.env` 파일 준비 (DB URL, JWT Secret 등)

### 현재 상태 (2026-02-28 업데이트)
- INFRA-1: ✅ 완료 — Supabase MCP로 B2C+B2B 마이그레이션 적용 (26→38 테이블)
- INFRA-2~3: 수동 작업 필요 (Edge Function 배포, 콘솔 등록, mTLS 인증서)
- BE-P1: ✅ 완료 — scaffolding, config, database, security, exceptions, models, main, Dockerfile, alembic
- BE-P2: ✅ 완료 — Supabase MCP로 SQL 마이그레이션 실행 (7개 마이그레이션 적용됨)
- BE-P3: ✅ 완료 — 27 SQLAlchemy 모델 + 22 enum (models.py 단일 파일)
- BE-P4: ✅ 완료 — auth, onboarding, dogs, log, dashboard (5 feature 모듈)
- BE-P5: ✅ 완료 — coaching (AI 6블록 생성 + 예산 + 룰 폴백)
- BE-P6: ✅ 완료 — training, settings, subscription, notification
- BE-P7: ✅ 완료 — org (14 endpoints), report (9 endpoints)
- BE-P8: ✅ 완료 — 셀프리뷰 + 패리티 검증 + pytest 기본 테스트

### 구현 통계
- Python 파일: 48개
- Feature 모듈: 12개 (auth, onboarding, dogs, log, dashboard, coaching, training, settings, subscription, notification, org, report)
- 엔드포인트: 60+ (FE api/*.ts 14개 파일 95% 커버)
- SQLAlchemy 모델: 27개 (B2C 17 + B2B 10)
- Pydantic 스키마: 50+ DTO
