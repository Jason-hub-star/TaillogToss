# TailLog B2B 확장 — 기술 스펙

- **프로젝트**: TailLog B2B 스키마 & 보안
- **문서 버전**: 1.0.0
- **작성일**: 2026-02-25
- **상위 문서**: [PRD-TailLog-Toss.md](PRD-TailLog-Toss.md) 섹션 21
- **기획 스펙**: [PRD-TailLog-B2B.md](PRD-TailLog-B2B.md)

---

## 1. 신규 테이블 (10개)

### 1.1 `organizations` — 센터 마스터

```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daycare','hotel','training_center','hospital')),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  logo_url TEXT,
  business_number TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  max_dogs INTEGER DEFAULT 30,
  max_staff INTEGER DEFAULT 5,
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','trial')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 `org_members` — 조직 멤버

```sql
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','staff','viewer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','deactivated')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);
CREATE INDEX idx_org_members_user_status ON public.org_members(user_id, org_id, status);
```

### 1.3 `org_dogs` — 조직 관리 강아지

dogs와 N:M 연결. **dogs.user_id는 NOT NULL 유지** — B2C 코드 무영향.

```sql
CREATE TABLE public.org_dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES public.users(id),
  parent_name TEXT,
  -- PII(phone/email)는 org_dogs_pii 테이블로 분리 (1.10 참조)
  group_tag TEXT DEFAULT 'default',
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  discharged_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','discharged','temporary')),
  UNIQUE(org_id, dog_id)
);
CREATE INDEX idx_org_dogs_org_status ON public.org_dogs(org_id, dog_id, status, group_tag);
CREATE INDEX idx_org_dogs_parent ON public.org_dogs(parent_user_id);
```

### 1.4 `dog_assignments` — 담당자 배정

센터 직원 + 개인 훈련사 공통. `org_id` NULL이면 개인 훈련사 워크스페이스.

```sql
CREATE TABLE public.dog_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary','assistant')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','ended'))
);
-- NULL-safe uniqueness + 이력 보존: active만 유니크
CREATE UNIQUE INDEX idx_dog_assignments_active_with_org
  ON public.dog_assignments(dog_id, trainer_user_id, org_id)
  WHERE org_id IS NOT NULL AND status = 'active';
CREATE UNIQUE INDEX idx_dog_assignments_active_without_org
  ON public.dog_assignments(dog_id, trainer_user_id)
  WHERE org_id IS NULL AND status = 'active';
CREATE INDEX idx_dog_assignments_trainer ON public.dog_assignments(trainer_user_id, status);
```

### 1.5 `daily_reports` — 자동 리포트

생성 주체를 split FK로 관리 (polymorphic FK 사용 안 함).

```sql
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('hotel','daycare_general','training_focus','problem_behavior')),
  -- 생성 주체: split FK (XOR)
  created_by_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_trainer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  CHECK ((created_by_org_id IS NOT NULL)::int + (created_by_trainer_id IS NOT NULL)::int = 1),
  -- AI 콘텐츠
  behavior_summary TEXT,
  condition_notes TEXT,
  ai_coaching_oneliner TEXT,
  seven_day_comparison JSONB,
  highlight_photo_urls TEXT[],
  -- 상태
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending','generating','generated','failed','sent')),
  ai_model TEXT,
  ai_cost_usd NUMERIC(8,6),
  generated_at TIMESTAMPTZ,
  scheduled_send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  -- 보호자 접근
  share_token TEXT UNIQUE,
  toss_share_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_daily_reports_unique_org
  ON public.daily_reports(dog_id, report_date, created_by_org_id)
  WHERE created_by_org_id IS NOT NULL;
CREATE UNIQUE INDEX idx_daily_reports_unique_trainer
  ON public.daily_reports(dog_id, report_date, created_by_trainer_id)
  WHERE created_by_trainer_id IS NOT NULL;
CREATE INDEX idx_daily_reports_org_date
  ON public.daily_reports(created_by_org_id, report_date)
  WHERE created_by_org_id IS NOT NULL;
CREATE INDEX idx_daily_reports_status ON public.daily_reports(generation_status);
CREATE INDEX idx_daily_reports_share ON public.daily_reports(share_token);
```

### 1.6 `parent_interactions` — 보호자 리액션/질문

```sql
CREATE TABLE public.parent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES public.users(id),
  parent_identifier TEXT,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like','question','comment','goal_request')),
  content TEXT,
  linked_log_id UUID REFERENCES public.behavior_logs(id),
  staff_response TEXT,
  responded_by UUID REFERENCES public.users(id),
  responded_at TIMESTAMPTZ,
  read_by_staff BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_parent_interactions_unread
  ON public.parent_interactions(read_by_staff)
  WHERE read_by_staff = false;
```

### 1.7 `org_analytics_daily` — 운영 통계 집계

```sql
CREATE TABLE public.org_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  group_tag TEXT,
  total_dogs INTEGER,
  avg_activity_score NUMERIC(5,2),
  aggression_incident_count INTEGER,
  total_behavior_logs INTEGER,
  report_open_rate NUMERIC(5,4),
  reaction_rate NUMERIC(5,4),
  question_count INTEGER,
  record_completion_rate NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, analytics_date, group_tag)
);
CREATE INDEX idx_org_analytics_org_date ON public.org_analytics_daily(org_id, analytics_date);
```

### 1.8 `org_subscriptions` — B2B 구독 (토스 IAP)

```sql
CREATE TABLE public.org_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN (
    'center_basic','center_pro','center_enterprise',
    'trainer_10','trainer_30','trainer_50'
  )),
  toss_order_id TEXT,
  price_krw INTEGER NOT NULL,
  max_dogs INTEGER NOT NULL,
  max_staff INTEGER DEFAULT 1,
  billing_cycle TEXT DEFAULT 'monthly',
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  suspend_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','trial','expired','cancelled','suspended','refunded')),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- XOR: 정확히 하나만
  CHECK ((org_id IS NOT NULL)::int + (trainer_user_id IS NOT NULL)::int = 1),
  -- 플랜 타입-주체 정합성
  CHECK (
    (org_id IS NOT NULL AND plan_type IN ('center_basic','center_pro','center_enterprise'))
    OR
    (trainer_user_id IS NOT NULL AND plan_type IN ('trainer_10','trainer_30','trainer_50'))
  )
);
```

### 1.9 `ai_cost_usage_org` — 조직/훈련사별 AI 비용

```sql
CREATE TABLE public.ai_cost_usage_org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  report_generation_calls INTEGER DEFAULT 0,
  report_generation_cost_usd NUMERIC(10,6) DEFAULT 0,
  coaching_calls INTEGER DEFAULT 0,
  coaching_cost_usd NUMERIC(10,6) DEFAULT 0,
  budget_limit_usd NUMERIC(10,2),
  CHECK ((org_id IS NOT NULL)::int + (trainer_user_id IS NOT NULL)::int = 1)
);
CREATE UNIQUE INDEX idx_ai_cost_org
  ON public.ai_cost_usage_org(org_id, usage_date)
  WHERE org_id IS NOT NULL;
CREATE UNIQUE INDEX idx_ai_cost_trainer
  ON public.ai_cost_usage_org(trainer_user_id, usage_date)
  WHERE trainer_user_id IS NOT NULL;
```

### 1.10 `org_dogs_pii` — 보호자 PII 격리 저장소

```sql
CREATE TABLE public.org_dogs_pii (
  org_dog_id UUID PRIMARY KEY REFERENCES public.org_dogs(id) ON DELETE CASCADE,
  parent_phone_enc BYTEA,
  parent_email_enc BYTEA,
  encryption_key_version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.org_dogs_pii ENABLE ROW LEVEL SECURITY;

-- 4방향 직접 접근 차단
CREATE POLICY "pii_no_direct_select" ON public.org_dogs_pii FOR SELECT USING (false);
CREATE POLICY "pii_no_direct_insert" ON public.org_dogs_pii FOR INSERT WITH CHECK (false);
CREATE POLICY "pii_no_direct_update" ON public.org_dogs_pii FOR UPDATE USING (false);
CREATE POLICY "pii_no_direct_delete" ON public.org_dogs_pii FOR DELETE USING (false);
```

**PII 접근 경로 (3가지)**:

```sql
-- 1) 읽기: SECURITY DEFINER RPC + 감사로그
CREATE OR REPLACE FUNCTION public.get_parent_contact(_org_dog_id UUID)
RETURNS TABLE(phone_enc BYTEA, email_enc BYTEA) AS $$
BEGIN
  INSERT INTO public.pii_access_log(accessor_id, org_dog_id, action, accessed_at)
  VALUES (auth.uid(), _org_dog_id, 'read', now());
  IF NOT EXISTS(
    SELECT 1 FROM public.org_dogs od
    JOIN public.org_members om ON om.org_id = od.org_id
    WHERE od.id = _org_dog_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner','manager','staff')
  ) THEN
    RAISE EXCEPTION 'Unauthorized PII access';
  END IF;
  RETURN QUERY SELECT parent_phone_enc, parent_email_enc
    FROM public.org_dogs_pii WHERE org_dog_id = _org_dog_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) 삭제 CRON: discharged 90일 초과 자동 삭제
CREATE OR REPLACE FUNCTION public.purge_expired_pii()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.org_dogs_pii
  WHERE org_dog_id IN (
    SELECT id FROM public.org_dogs
    WHERE status = 'discharged'
      AND discharged_at < now() - INTERVAL '90 days'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) 앱 레벨: FastAPI에서 cryptography.Fernet 또는 AES-256-GCM 암복호화
--    encryption_key_version으로 키 로테이션 시 점진적 재암호화
```

---

## 2. 기존 테이블 수정 (4개)

> **dogs 테이블은 안 건드림**. dogs.user_id NOT NULL 유지.

| 테이블 | 변경 | B2C 영향 |
|--------|------|----------|
| `users` | `role` CHECK 확장 (아래 DDL 참조) | 없음 — 기존 값 유지 |
| `behavior_logs` | `recorded_by UUID`, `org_id UUID` nullable 추가 | 없음 (NULL) |
| `media_assets` | `org_id UUID`, `is_highlight BOOLEAN`, `report_id UUID` 추가 | 없음 |
| `noti_history` | `org_id UUID`, `report_id UUID`, `recipient_type TEXT` 추가 | 없음 |

### 2.1 `users.role` CHECK 확장

> **SKILL.md Section 8 DB Contract 기준**: v1은 `('user','trainer','admin')`. B2B에서 `'org_owner','org_staff'` 2개 추가.

```sql
-- 기존 CHECK 제거 후 확장 (B2C 기존 3값 유지 + B2B 2값 추가)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'trainer', 'admin', 'org_owner', 'org_staff'));
```

**역할 매핑**:
| role | 대상 | B2C/B2B |
|------|------|---------|
| `user` | 일반 보호자 | B2C (기존) |
| `trainer` | 훈련사 (개인/센터 공통) | B2C 기존 + B2B 확장 |
| `admin` | 시스템 관리자 | B2C (기존) |
| `org_owner` | 센터 대표 | B2B 전용 |
| `org_staff` | 센터 직원 | B2B 전용 |

> **Note**: `trainer`는 SKILL.md v1에 이미 존재. B2B에서 새로 추가하는 값은 `org_owner`, `org_staff` 2개뿐.

---

## 3. RLS: 4-tier (B2C소유자 + 센터멤버 + 담당훈련사 + 보호자)

### 3.1 헬퍼 함수

```sql
-- 조직 멤버 여부 (역할 무관)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;

-- 보호자 여부
CREATE OR REPLACE FUNCTION public.is_parent_of_dog(_dog_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_dogs
    WHERE dog_id = _dog_id AND parent_user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;
REVOKE ALL ON FUNCTION public.is_parent_of_dog(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_parent_of_dog(UUID) TO authenticated;

-- 역할 기반 멤버 검증 (INSERT/UPDATE/DELETE용)
CREATE OR REPLACE FUNCTION public.is_org_member_with_role(_org_id UUID, _roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = auth.uid()
      AND status = 'active' AND role = ANY(_roles)
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;
REVOKE ALL ON FUNCTION public.is_org_member_with_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member_with_role(UUID, TEXT[]) TO authenticated;
```

### 3.2 SELECT 정책

```sql
-- 필수 인덱스
CREATE INDEX idx_org_members_user_status ON org_members(user_id, org_id, status);
CREATE INDEX idx_org_dogs_org_status ON org_dogs(org_id, dog_id, status, group_tag);
CREATE INDEX idx_daily_reports_org_date ON daily_reports(created_by_org_id, report_date);
CREATE INDEX idx_behavior_logs_org ON behavior_logs(org_id, dog_id, occurred_at);
CREATE INDEX idx_dog_assignments_trainer ON dog_assignments(trainer_user_id, status);

-- behavior_logs: 4-tier
CREATE POLICY "behavior_logs_select" ON behavior_logs FOR SELECT USING (
  (dog_id IN (SELECT id FROM dogs WHERE user_id = auth.uid()))
  OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  OR (dog_id IN (SELECT dog_id FROM dog_assignments
       WHERE trainer_user_id = auth.uid() AND status = 'active'))
  OR (public.is_parent_of_dog(dog_id))
);
```

### 3.3 INSERT/UPDATE/DELETE 정책

```sql
-- behavior_logs INSERT
CREATE POLICY "behavior_logs_insert" ON behavior_logs FOR INSERT WITH CHECK (
  (dog_id IN (SELECT id FROM dogs WHERE user_id = auth.uid()))
  OR (org_id IS NOT NULL AND public.is_org_member_with_role(org_id, ARRAY['owner','manager','staff']))
  OR (dog_id IN (SELECT dog_id FROM dog_assignments
       WHERE trainer_user_id = auth.uid() AND status = 'active'))
);

-- behavior_logs UPDATE: 작성자 본인만
CREATE POLICY "behavior_logs_update" ON behavior_logs FOR UPDATE USING (
  recorded_by = auth.uid()
  OR (dog_id IN (SELECT id FROM dogs WHERE user_id = auth.uid()))
);

-- org_dogs: 센터 owner/manager만
CREATE POLICY "org_dogs_insert" ON org_dogs FOR INSERT
  WITH CHECK (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));
CREATE POLICY "org_dogs_update" ON org_dogs FOR UPDATE
  USING (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));
CREATE POLICY "org_dogs_delete" ON org_dogs FOR DELETE
  USING (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));

-- daily_reports INSERT/UPDATE: 생성 주체
CREATE POLICY "daily_reports_insert" ON daily_reports FOR INSERT WITH CHECK (
  (created_by_org_id IS NOT NULL AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff']))
  OR (created_by_trainer_id IS NOT NULL AND created_by_trainer_id = auth.uid())
);
CREATE POLICY "daily_reports_update" ON daily_reports FOR UPDATE USING (
  (created_by_org_id IS NOT NULL AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff']))
  OR (created_by_trainer_id IS NOT NULL AND created_by_trainer_id = auth.uid())
);

-- parent_interactions INSERT: 보호자 리액션 + staff 응답
CREATE POLICY "parent_interactions_insert" ON parent_interactions FOR INSERT WITH CHECK (
  parent_user_id = auth.uid()
  OR public.is_parent_of_dog((SELECT dog_id FROM daily_reports WHERE id = report_id))
);
CREATE POLICY "parent_interactions_update" ON parent_interactions FOR UPDATE USING (
  EXISTS(SELECT 1 FROM daily_reports dr WHERE dr.id = report_id
    AND dr.created_by_org_id IS NOT NULL
    AND public.is_org_member_with_role(dr.created_by_org_id, ARRAY['owner','manager','staff']))
  OR EXISTS(SELECT 1 FROM daily_reports dr WHERE dr.id = report_id
    AND dr.created_by_trainer_id = auth.uid())
);
```

---

## 4. Entitlement (결제 → 권한 동기화)

### 4.1 상태 전이

```
trial → active (결제 성공)
active → expired (만료 CRON)
active → cancelled (사용자 취소 — 잔여기간 유지)
active → suspended (결제 실패 재시도 중)
suspended → active (결제 재성공)
suspended → expired (재시도 횟수 초과)
* → refunded (IAP 환불 웹훅 수신 → grant_status=revoked)
```

### 4.2 멱등성

- `toss_order_id` UNIQUE 인덱스
- verify-iap-order 호출 시 중복 체크 → 이미 처리됐으면 skip
- 웹훅 재시도 시 동일 order_id → 200 반환

### 4.3 웹훅 지연 대응

- 결제 성공 후 5분 내 웹훅 미수신 → Toss API polling
- CRON: 매 5분 pending + 5분 경과 건 확인

### 4.4 Entitlement 강제

```
org_dogs 등록 시: COUNT(*) < max_dogs 검증
org_members 초대 시: COUNT(*) < max_staff 검증
daily_reports 생성 시: subscription.status IN ('active','trial') 검증
만료/환불 시: 신규 기록/리포트 차단, 기존 데이터 열람 30일 유지
```

---

## 5. 리스크 분석

### HIGH

| # | 리스크 | 설명 | 완화 |
|---|--------|------|------|
| 1 | B2C/B2B 하이브리드 복잡성 | dogs + org_dogs + dog_assignments 3중 연결 | dogs.user_id NOT NULL 유지. org_dogs/dog_assignments로 B2B 분리 |
| 2 | 4-tier RLS 성능 | 매 쿼리 서브쿼리 4개 | 인덱스 5개 + EXPLAIN ANALYZE 벤치마크(Phase 7) |
| 3 | AI 비용 스케일링 | 100센터x30마리=3,000 AI호출/일 | 로그 3건 미만 rule fallback + 조직별 예산 한도 |
| 4 | 데이터 격리 | RLS 실수 → 타 조직 데이터 노출 | 격리 테스트 10+ 시나리오 + 분기별 감사 |

### MEDIUM

| # | 리스크 | 설명 | 완화 |
|---|--------|------|------|
| 5 | WebView 40마리 성능 | 카드+사진+뱃지 렌더링 | react-virtuoso + lazy load |
| 6 | 비토스 보호자 | Smart Message 불가 | share_token + Kakao Alimtalk |
| 7 | Entitlement 불일치 | 결제 성공인데 권한 미동기화 | 동기적 갱신 + 재시도 큐 + polling |
| 8 | 개인 훈련사/센터 중복 | 훈련사가 센터 소속이면서 개인 플랜도 있는 경우 | 센터 플랜 우선. 개인 플랜 구매 차단 or 경고 |

---

## 6. 기술 검증 결과 (15건 — 전부 유효, 수정 완료)

### 라운드 1 (8건)

| # | 이슈 | 수정 |
|---|------|------|
| 1 | `org_subscriptions` CHECK OR → XOR | `::int + ::int = 1` |
| 2 | `dog_assignments` NULL UNIQUE | partial unique indexes |
| 3 | `daily_reports` polymorphic FK | split columns + proper FKs |
| 4 | `org_dogs` PII 평문 | `org_dogs_pii` 별도 테이블 + AES-256 + RLS 격리 |
| 5 | Entitlement 상태머신 누락 | 상태 전이 + 멱등성 + 웹훅 polling |
| 6 | 비용 포맷팅 `~` 렌더링 | en-dash `–` 표기 |
| 7 | RLS 함수 보안 속성 | SECURITY DEFINER + search_path + STABLE |
| 8 | `ai_cost_usage_org` NULL UNIQUE | XOR CHECK + partial unique indexes |

### 라운드 2 (7건)

| # | 이슈 | 수정 |
|---|------|------|
| R2-1 | 표기 불일치 (9개 vs 10개) | ⑩ `org_dogs_pii` 정식 추가 |
| R2-2 | `dog_assignments` 이력 충돌 | `AND status = 'active'` 추가 |
| R2-3 | 플랜 타입-주체 정합성 | CHECK로 center→org_id, trainer→trainer_user_id 강제 |
| R2-4 | 비용 표 본문 | en-dash 일괄 적용 |
| R2-5 | RLS 쓰기 정책 누락 | INSERT/UPDATE/DELETE 정책 + `is_org_member_with_role()` |
| R2-6 | PII 운영 절차 불명확 | `get_parent_contact()` RPC + `purge_expired_pii()` CRON + 감사로그 |
| R2-7 | REVOKE/GRANT 누락 | 3개 함수 모두 `REVOKE PUBLIC` + `GRANT authenticated` |

---

## 7. 검증 방법

1. B2B 스키마 10개 DDL → Supabase 로컬 실행 → 에러 없음
2. 4-tier RLS → EXPLAIN ANALYZE 벤치마크 (40마리 환경)
3. Entitlement → 구독 만료 시 기록/리포트 차단 E2E
4. Bulk 프리셋 → 40마리 일괄 기록 p95 < 1초
5. 보호자 공유 → share_token + getTossShareLink 양쪽 동작 확인
6. 개인 훈련사 → dog_assignments 기반 "내 담당" 필터링 정확성
7. PII 격리 → `org_dogs_pii` 직접 쿼리 차단 + RPC만 접근 가능
8. 플랜 타입-주체 정합성 → center 플랜 + trainer_user_id 조합 INSERT 실패 확인
