Section-ID: toss_db_migration-21
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 1. 현행 DogCoach 스키마 (17테이블)

### 1.1 ENUM 타입
```
user_role: GUEST | USER | PRO_USER | EXPERT | ADMIN
user_status: ACTIVE | INACTIVE | BANNED
plan_type: FREE | PRO_MONTHLY | PRO_YEARLY
dog_sex: MALE | FEMALE | MALE_NEUTERED | FEMALE_NEUTERED
asset_type: PHOTO | VIDEO | LOTTIE_SNAPSHOT
report_type: DAILY | WEEKLY | INSIGHT
noti_channel: ALIMTALK | WEB_PUSH | EMAIL
training_status: COMPLETED | SKIPPED_INEFFECTIVE | SKIPPED_ALREADY_DONE | HIDDEN_BY_AI
```

### 1.2 테이블 목록

| # | 테이블 | PK | 주요 FK | 핵심 컬럼 | TaillogToss 상태 |
|---|--------|-----|---------|-----------|-----------------|
| 1 | `users` | UUID | — | kakao_sync_id, role(enum), phone_number, status, timezone, provider | **수정** |
| 2 | `subscriptions` | UUID | users(id) CASCADE | plan_type(enum), next_billing_date, is_active, pg_provider, pg_customer_key | **수정** |
| 3 | `dogs` | UUID | users(id) CASCADE | name, breed, birth_date, sex(enum), profile_image_url, anonymous_sid | 유지 |
| 4 | `dog_env` | UUID | dogs(id) CASCADE UNIQUE | household_info(JSONB), health_meta, profile_meta, rewards_meta, chronic_issues, antecedents, triggers, past_attempts, temperament, activity_meta | 유지 |
| 5 | `behavior_logs` | UUID | dogs(id) CASCADE | is_quick_log, type_id, antecedent, behavior, consequence, intensity(1-10), duration, occurred_at | **수정** |
| 6 | `media_assets` | UUID | behavior_logs(id) SET NULL | storage_url, asset_type(enum) | **수정** |
| 7 | `ai_coaching` | UUID | dogs(id) CASCADE | report_type(enum), analysis_json(JSONB), action_items(JSONB), feedback_score(1-5) | 유지 |
| 8 | `action_tracker` | UUID | ai_coaching(id) CASCADE | is_completed | 유지 |
| 9 | `noti_history` | UUID | users(id) CASCADE | channel(enum), template_code, sent_at, read_at | **수정** |
| 10 | `log_summaries` | UUID | dogs(id) CASCADE | start_date, end_date, summary_text, embedding(vector 1536) | 유지 |
| 11 | `user_settings` | UUID | users(id) CASCADE UNIQUE | notification_pref(JSONB), ai_persona(JSONB), marketing_agreed | 유지 |
| 12 | `ai_recommendation_snapshots` | UUID | dogs(id) CASCADE, users(id) SET NULL | window_days, dedupe_key(UNIQUE), prompt_version, model, summary_hash, issue, recommendations(JSONB), rationale, cost fields | 유지 |
| 13 | `ai_recommendation_feedback` | UUID | snapshots(id) CASCADE, users(id) SET NULL | recommendation_index, action, note | 유지 |
| 14 | `ai_cost_usage_daily` | UUID | — | usage_date(UNIQUE), total_calls, total_input/output_tokens, total_cost_usd, rule_fallback_count | 유지 |
| 15 | `ai_cost_usage_monthly` | UUID | — | usage_month(UNIQUE), total_calls, total_cost_usd, budget_limit_usd | 유지 |
| 16 | `user_training_status` | UUID | users(id) CASCADE | curriculum_id, stage_id, step_number, status(enum) | 유지 |
| 17 | `training_behavior_snapshots` | UUID | users(id) CASCADE, dogs(id) CASCADE | curriculum_id, snapshot_date, total_logs, avg_intensity, distributions(JSONB) | 유지 |

---

## 2. TaillogToss 변경 사항 (5 수정 + 12 신규 = 17건)

### 2.1 수정 테이블 (5개)

#### M-1: `users` — 인증 전환 + 역할 확장

| 변경 | Before (DogCoach) | After (TaillogToss) |
|------|-------------------|---------------------|
| 인증키 | `kakao_sync_id VARCHAR(255) UNIQUE` | `toss_user_key TEXT UNIQUE NOT NULL` |
| PK | `UUID DEFAULT uuid_generate_v4()` | `UUID REFERENCES auth.users(id) ON DELETE CASCADE` |
| 역할 | `user_role` enum (GUEST/USER/PRO_USER/EXPERT/ADMIN) | `role TEXT CHECK (role IN ('user','trainer','org_owner','org_staff'))` |
| 추가 | — | `pepper_version INTEGER DEFAULT 1` |
| 제거 | phone_number, status, timezone, provider, last_login_at | — (필요시 유지 결정) |

**CLAUDE.md 정합성 체크**:
- UserRole 표준 (`docs/12-MIGRATION-WAVES-AND-GATES.md` 1.1절): `user | trainer | org_owner | org_staff`
- ⚠️ `SCHEMA-B2B.md`에는 `admin` 포함 5개. CLAUDE.md/12번 문서는 4개. → **CLAUDE.md 기준 4개 우선** (admin 필요 시 추후 협의)

```sql
-- TaillogToss users DDL
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  toss_user_key TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL
    CHECK (role IN ('user','trainer','org_owner','org_staff')),
  pepper_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### M-2: `subscriptions` — IAP 전환 + 토큰 시스템

| 변경 | Before | After |
|------|--------|-------|
| plan_type | enum (FREE/PRO_MONTHLY/PRO_YEARLY) | `TEXT CHECK (IN ('FREE','PRO_MONTHLY'))` — YEARLY 제거 |
| 추가 | — | `ai_tokens_remaining INTEGER DEFAULT 0` |
| 추가 | — | `ai_tokens_total INTEGER DEFAULT 0` |
| 제거 | pg_provider, pg_customer_key | toss_orders 테이블로 분리 |

#### M-3: `behavior_logs` — B2B 컬럼 추가

```sql
ALTER TABLE behavior_logs ADD COLUMN recorded_by UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE behavior_logs ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX idx_behavior_logs_org ON behavior_logs(org_id, dog_id, occurred_at);
```

#### M-4: `media_assets` — B2B 컬럼 추가

```sql
ALTER TABLE media_assets ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE media_assets ADD COLUMN is_highlight BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE;
```

#### M-5: `noti_history` — B2B 컬럼 추가

```sql
ALTER TABLE noti_history ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE noti_history ADD COLUMN report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE;
ALTER TABLE noti_history ADD COLUMN recipient_type TEXT;
```

---

### 2.2 신규 B2C 테이블 (2개)

#### N-1: `toss_orders` — IAP 주문 상태 관리

2축 상태 패턴 (toss_status × grant_status).

```sql
CREATE TABLE public.toss_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toss_order_id TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  toss_status TEXT NOT NULL DEFAULT 'ORDER_IN_PROGRESS'
    CHECK (toss_status IN ('PURCHASED','PAYMENT_COMPLETED','FAILED','REFUNDED','ORDER_IN_PROGRESS','NOT_FOUND')),
  grant_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (grant_status IN ('PENDING','GRANTED','GRANT_FAILED','RETRY_QUEUED','REVOKED')),
  idempotency_key TEXT UNIQUE NOT NULL,
  amount_krw INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_toss_orders_user ON toss_orders(user_id);
CREATE INDEX idx_toss_orders_status ON toss_orders(toss_status, grant_status);
```

**toss_status 전이:**
```
ORDER_IN_PROGRESS → PURCHASED → PAYMENT_COMPLETED
ORDER_IN_PROGRESS → FAILED
PAYMENT_COMPLETED → REFUNDED
```

**grant_status 전이:**
```
PENDING → GRANTED (서버 검증 + 권한 부여 성공)
PENDING → GRANT_FAILED (서버 오류)
GRANT_FAILED → RETRY_QUEUED → GRANTED (재시도 성공)
GRANTED → REVOKED (환불)
```

#### N-2: `edge_function_requests` — 멱등키 + 감사 로그

```sql
CREATE TABLE public.edge_function_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  function_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','completed','failed')),
  response_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_edge_requests_func ON edge_function_requests(function_name, created_at);
```

---

### 2.3 신규 B2B 테이블 (10개)

> B2B는 v1에서 기본 숨김이며, Wave 3 게이트 통과 후 활성화 (CLAUDE.md 기준).
> Wave 3 진입 전까지 타입/테이블 스텁만 허용, 사용자 노출 기능 금지 (12-MIGRATION 1.1절).

전체 DDL은 `docs/SCHEMA-B2B.md` 참조. 아래는 요약.

| # | 테이블 | FK 의존 | 핵심 패턴 | 용도 |
|---|--------|---------|-----------|------|
| B-1 | `organizations` | users(owner_user_id) RESTRICT | — | 센터 마스터 |
| B-2 | `org_members` | organizations CASCADE, users CASCADE | UNIQUE(org_id, user_id) | 멤버십 |
| B-3 | `org_dogs` | organizations CASCADE, dogs CASCADE, users | UNIQUE(org_id, dog_id) | 조직 관리 반려견 |
| B-4 | `dog_assignments` | dogs CASCADE, organizations CASCADE, users CASCADE | partial unique (active only) | 훈련사 배정 |
| B-5 | `daily_reports` | dogs CASCADE, organizations CASCADE, users CASCADE | XOR split FK | 일일 리포트 |
| B-6 | `parent_interactions` | daily_reports CASCADE, users, behavior_logs | — | 보호자 피드백 |
| B-7 | `org_analytics_daily` | organizations CASCADE | UNIQUE(org_id, date, group_tag) | 운영 통계 |
| B-8 | `org_subscriptions` | organizations CASCADE, users CASCADE | XOR + plan 타입 정합성 CHECK | B2B 구독 |
| B-9 | `ai_cost_usage_org` | organizations CASCADE, users CASCADE | XOR + partial unique | 조직별 AI 비용 |
| B-10 | `org_dogs_pii` | org_dogs CASCADE | RLS 4방향 차단 + SECURITY DEFINER RPC | PII 격리 |

---

## 3. FK 의존 그래프 (생성 순서)

```
Level 0: users (PK → auth.users)
Level 1: dogs, subscriptions, user_settings, toss_orders, edge_function_requests
Level 2: dog_env, behavior_logs, media_assets, ai_coaching, noti_history,
         log_summaries, ai_cost_usage_daily, ai_cost_usage_monthly,
         ai_recommendation_snapshots, user_training_status,
         training_behavior_snapshots,
         organizations
Level 3: action_tracker, ai_recommendation_feedback,
         org_members, org_dogs, dog_assignments
Level 4: org_dogs_pii, daily_reports, org_analytics_daily,
         org_subscriptions, ai_cost_usage_org
Level 5: parent_interactions
```

**마이그레이션 실행 순서**: Level 0 → 5 순서대로, 같은 Level은 병렬 가능.

---

