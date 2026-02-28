-- B2C Column Gap + Enum Migration
-- DogCoach → TaillogToss schema alignment
-- Applied: 2026-02-28 (version 20260228015912)

-- ============================================================
-- 1. USER ROLE ENUM MIGRATION
-- DogCoach: GUEST/USER/PRO_USER/EXPERT/ADMIN → TaillogToss: user/trainer/org_owner/org_staff
-- ============================================================
CREATE TYPE user_role_v2 AS ENUM ('user', 'trainer', 'org_owner', 'org_staff');

ALTER TABLE public.users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.users
  ALTER COLUMN role TYPE user_role_v2 USING
    CASE role::text
      WHEN 'GUEST' THEN 'user'
      WHEN 'USER' THEN 'user'
      WHEN 'PRO_USER' THEN 'user'
      WHEN 'EXPERT' THEN 'trainer'
      WHEN 'ADMIN' THEN 'org_owner'
      ELSE 'user'
    END::user_role_v2;

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'user'::user_role_v2;

DROP TYPE IF EXISTS user_role;
ALTER TYPE user_role_v2 RENAME TO user_role;

-- ============================================================
-- 2. USER STATUS ENUM MIGRATION
-- DogCoach: ACTIVE/INACTIVE/BANNED → TaillogToss: active/inactive/banned
-- ============================================================
CREATE TYPE user_status_v2 AS ENUM ('active', 'inactive', 'banned');

ALTER TABLE public.users
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.users
  ALTER COLUMN status TYPE user_status_v2 USING
    CASE status::text
      WHEN 'ACTIVE' THEN 'active'
      WHEN 'INACTIVE' THEN 'inactive'
      WHEN 'BANNED' THEN 'banned'
      ELSE 'active'
    END::user_status_v2;

ALTER TABLE public.users
  ALTER COLUMN status SET DEFAULT 'active'::user_status_v2;

DROP TYPE IF EXISTS user_status;
ALTER TYPE user_status_v2 RENAME TO user_status;

-- ============================================================
-- 3. USERS TABLE: Add toss_user_key, pepper_version
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS toss_user_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pepper_version INTEGER DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_toss_user_key
  ON public.users(toss_user_key) WHERE toss_user_key IS NOT NULL;

-- ============================================================
-- 4. DOGS TABLE: Add weight_kg
-- ============================================================
ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);

-- ============================================================
-- 5. BEHAVIOR_LOGS: Add B2C columns + fix type_id + rename duration
-- ============================================================
ALTER TABLE public.behavior_logs
  ADD COLUMN IF NOT EXISTS quick_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS daily_activity VARCHAR(50),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS memo TEXT;

ALTER TABLE public.behavior_logs
  ALTER COLUMN type_id TYPE VARCHAR(50) USING type_id::VARCHAR;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'behavior_logs' AND column_name = 'duration'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'behavior_logs' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.behavior_logs RENAME COLUMN duration TO duration_minutes;
  END IF;
END $$;

-- ============================================================
-- 6. AI_COACHING: Add blocks, ai_tokens_used
-- ============================================================
ALTER TABLE public.ai_coaching
  ADD COLUMN IF NOT EXISTS blocks JSONB,
  ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0;

-- ============================================================
-- 7. SUBSCRIPTIONS: Add ai_tokens_remaining, ai_tokens_total
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ai_tokens_remaining INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_tokens_total INTEGER DEFAULT 0;

-- ============================================================
-- 8. ACTION_TRACKER: Add action_item_id, completed_at
-- ============================================================
ALTER TABLE public.action_tracker
  ADD COLUMN IF NOT EXISTS action_item_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ============================================================
-- 9. USER_TRAINING_STATUS: Add dog_id, current_variant, memo
-- ============================================================
ALTER TABLE public.user_training_status
  ADD COLUMN IF NOT EXISTS dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS current_variant VARCHAR(1) DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS memo TEXT;

-- ============================================================
-- 10. TOSS_ORDERS TABLE (new)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.toss_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  toss_status TEXT DEFAULT 'ORDER_IN_PROGRESS'
    CHECK (toss_status IN ('PURCHASED','PAYMENT_COMPLETED','FAILED','REFUNDED','ORDER_IN_PROGRESS','NOT_FOUND')),
  grant_status TEXT DEFAULT 'pending'
    CHECK (grant_status IN ('pending','granted','grant_failed','refund_requested','refunded')),
  amount INTEGER DEFAULT 0,
  toss_order_id VARCHAR(255),
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_toss_orders_user ON public.toss_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_toss_orders_grant ON public.toss_orders(grant_status);

-- ============================================================
-- 11. EDGE_FUNCTION_REQUESTS TABLE (new)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.edge_function_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  function_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. RLS for new tables
-- ============================================================
ALTER TABLE public.toss_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "toss_orders_user_select" ON public.toss_orders FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "toss_orders_user_insert" ON public.toss_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "toss_orders_user_update" ON public.toss_orders FOR UPDATE
  USING (user_id = auth.uid());

ALTER TABLE public.edge_function_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edge_requests_service_only" ON public.edge_function_requests FOR ALL
  USING (auth.role() = 'service_role');
