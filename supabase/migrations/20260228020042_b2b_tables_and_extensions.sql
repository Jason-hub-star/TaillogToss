-- B2B Tables + Extensions (10 new tables + ALTER 3 + RLS)
-- SCHEMA-B2B.md v1.0.0
-- Applied: 2026-02-28 (version 20260228020042)

-- ============================================================
-- 1. NEW TABLES (10)
-- ============================================================

-- 1.1 ORGANIZATIONS
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

-- 1.2 ORG_MEMBERS
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

-- 1.3 ORG_DOGS
CREATE TABLE public.org_dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES public.users(id),
  parent_name TEXT,
  group_tag TEXT DEFAULT 'default',
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  discharged_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','discharged','temporary')),
  UNIQUE(org_id, dog_id)
);
CREATE INDEX idx_org_dogs_org_status ON public.org_dogs(org_id, dog_id, status, group_tag);
CREATE INDEX idx_org_dogs_parent ON public.org_dogs(parent_user_id);

-- 1.4 DOG_ASSIGNMENTS
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
CREATE UNIQUE INDEX idx_dog_assignments_active_with_org
  ON public.dog_assignments(dog_id, trainer_user_id, org_id)
  WHERE org_id IS NOT NULL AND status = 'active';
CREATE UNIQUE INDEX idx_dog_assignments_active_without_org
  ON public.dog_assignments(dog_id, trainer_user_id)
  WHERE org_id IS NULL AND status = 'active';
CREATE INDEX idx_dog_assignments_trainer ON public.dog_assignments(trainer_user_id, status);

-- 1.5 DAILY_REPORTS (XOR: created_by_org_id or created_by_trainer_id)
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('hotel','daycare_general','training_focus','problem_behavior')),
  created_by_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_trainer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  CHECK ((created_by_org_id IS NOT NULL)::int + (created_by_trainer_id IS NOT NULL)::int = 1),
  behavior_summary TEXT,
  condition_notes TEXT,
  ai_coaching_oneliner TEXT,
  seven_day_comparison JSONB,
  highlight_photo_urls TEXT[],
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending','generating','generated','failed','sent')),
  ai_model TEXT,
  ai_cost_usd NUMERIC(8,6),
  generated_at TIMESTAMPTZ,
  scheduled_send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
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

-- 1.6 PARENT_INTERACTIONS
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

-- 1.7 ORG_ANALYTICS_DAILY
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

-- 1.8 ORG_SUBSCRIPTIONS (XOR: org_id or trainer_user_id)
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
  CHECK ((org_id IS NOT NULL)::int + (trainer_user_id IS NOT NULL)::int = 1),
  CHECK (
    (org_id IS NOT NULL AND plan_type IN ('center_basic','center_pro','center_enterprise'))
    OR
    (trainer_user_id IS NOT NULL AND plan_type IN ('trainer_10','trainer_30','trainer_50'))
  )
);

-- 1.9 AI_COST_USAGE_ORG (XOR: org_id or trainer_user_id)
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

-- 1.10 ORG_DOGS_PII (SECURITY DEFINER RPC only)
CREATE TABLE public.org_dogs_pii (
  org_dog_id UUID PRIMARY KEY REFERENCES public.org_dogs(id) ON DELETE CASCADE,
  parent_phone_enc BYTEA,
  parent_email_enc BYTEA,
  encryption_key_version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.org_dogs_pii ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pii_no_direct_select" ON public.org_dogs_pii FOR SELECT USING (false);
CREATE POLICY "pii_no_direct_insert" ON public.org_dogs_pii FOR INSERT WITH CHECK (false);
CREATE POLICY "pii_no_direct_update" ON public.org_dogs_pii FOR UPDATE USING (false);
CREATE POLICY "pii_no_direct_delete" ON public.org_dogs_pii FOR DELETE USING (false);

-- ============================================================
-- 2. ALTER EXISTING TABLES for B2B extensions
-- ============================================================

-- behavior_logs: B2B fields
ALTER TABLE public.behavior_logs
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_org ON public.behavior_logs(org_id, dog_id, occurred_at);

-- media_assets: B2B fields
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS is_highlight BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL;

-- noti_history: B2B fields
ALTER TABLE public.noti_history
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_type TEXT;

-- ============================================================
-- 3. RLS HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_parent_of_dog(_dog_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_dogs
    WHERE dog_id = _dog_id AND parent_user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;
REVOKE ALL ON FUNCTION public.is_parent_of_dog(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_parent_of_dog(UUID) TO authenticated;

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

-- ============================================================
-- 4. PII ACCESS FUNCTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id UUID NOT NULL,
  org_dog_id UUID NOT NULL,
  action TEXT NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

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

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

-- behavior_logs: 4-tier SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'behavior_logs_b2b_select' AND tablename = 'behavior_logs'
  ) THEN
    CREATE POLICY "behavior_logs_b2b_select" ON public.behavior_logs FOR SELECT USING (
      (dog_id IN (SELECT id FROM public.dogs WHERE user_id = auth.uid()))
      OR (org_id IS NOT NULL AND public.is_org_member(org_id))
      OR (dog_id IN (SELECT dog_id FROM public.dog_assignments
           WHERE trainer_user_id = auth.uid() AND status = 'active'))
      OR (public.is_parent_of_dog(dog_id))
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'behavior_logs_b2b_insert' AND tablename = 'behavior_logs'
  ) THEN
    CREATE POLICY "behavior_logs_b2b_insert" ON public.behavior_logs FOR INSERT WITH CHECK (
      (dog_id IN (SELECT id FROM public.dogs WHERE user_id = auth.uid()))
      OR (org_id IS NOT NULL AND public.is_org_member_with_role(org_id, ARRAY['owner','manager','staff']))
      OR (dog_id IN (SELECT dog_id FROM public.dog_assignments
           WHERE trainer_user_id = auth.uid() AND status = 'active'))
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'behavior_logs_b2b_update' AND tablename = 'behavior_logs'
  ) THEN
    CREATE POLICY "behavior_logs_b2b_update" ON public.behavior_logs FOR UPDATE USING (
      recorded_by = auth.uid()
      OR (dog_id IN (SELECT id FROM public.dogs WHERE user_id = auth.uid()))
    );
  END IF;
END $$;

-- org_dogs RLS
ALTER TABLE public.org_dogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_dogs_select" ON public.org_dogs FOR SELECT
  USING (public.is_org_member(org_id) OR parent_user_id = auth.uid());
CREATE POLICY "org_dogs_insert" ON public.org_dogs FOR INSERT
  WITH CHECK (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));
CREATE POLICY "org_dogs_update" ON public.org_dogs FOR UPDATE
  USING (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));
CREATE POLICY "org_dogs_delete" ON public.org_dogs FOR DELETE
  USING (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));

-- daily_reports RLS
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_reports_select" ON public.daily_reports FOR SELECT USING (
  (created_by_org_id IS NOT NULL AND public.is_org_member(created_by_org_id))
  OR (created_by_trainer_id IS NOT NULL AND created_by_trainer_id = auth.uid())
  OR (public.is_parent_of_dog(dog_id))
  OR (share_token IS NOT NULL AND expires_at > now())
);
CREATE POLICY "daily_reports_insert" ON public.daily_reports FOR INSERT WITH CHECK (
  (created_by_org_id IS NOT NULL AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff']))
  OR (created_by_trainer_id IS NOT NULL AND created_by_trainer_id = auth.uid())
);
CREATE POLICY "daily_reports_update" ON public.daily_reports FOR UPDATE USING (
  (created_by_org_id IS NOT NULL AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff']))
  OR (created_by_trainer_id IS NOT NULL AND created_by_trainer_id = auth.uid())
);

-- parent_interactions RLS
ALTER TABLE public.parent_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_interactions_select" ON public.parent_interactions FOR SELECT USING (
  parent_user_id = auth.uid()
  OR EXISTS(SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id
    AND dr.created_by_org_id IS NOT NULL AND public.is_org_member(dr.created_by_org_id))
  OR EXISTS(SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id
    AND dr.created_by_trainer_id = auth.uid())
);
CREATE POLICY "parent_interactions_insert" ON public.parent_interactions FOR INSERT WITH CHECK (
  parent_user_id = auth.uid()
  OR public.is_parent_of_dog((SELECT dog_id FROM public.daily_reports WHERE id = report_id))
);
CREATE POLICY "parent_interactions_update" ON public.parent_interactions FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id
    AND dr.created_by_org_id IS NOT NULL
    AND public.is_org_member_with_role(dr.created_by_org_id, ARRAY['owner','manager','staff']))
  OR EXISTS(SELECT 1 FROM public.daily_reports dr WHERE dr.id = report_id
    AND dr.created_by_trainer_id = auth.uid())
);

-- organizations RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select" ON public.organizations FOR SELECT
  USING (public.is_org_member(id) OR owner_user_id = auth.uid());
CREATE POLICY "organizations_update" ON public.organizations FOR UPDATE
  USING (owner_user_id = auth.uid());

-- org_members RLS
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select" ON public.org_members FOR SELECT
  USING (public.is_org_member(org_id));
CREATE POLICY "org_members_insert" ON public.org_members FOR INSERT
  WITH CHECK (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));
CREATE POLICY "org_members_update" ON public.org_members FOR UPDATE
  USING (public.is_org_member_with_role(org_id, ARRAY['owner','manager']));

-- org_subscriptions RLS
ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_subscriptions_select" ON public.org_subscriptions FOR SELECT USING (
  (org_id IS NOT NULL AND public.is_org_member(org_id))
  OR (trainer_user_id IS NOT NULL AND trainer_user_id = auth.uid())
);

-- org_analytics_daily RLS
ALTER TABLE public.org_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_analytics_select" ON public.org_analytics_daily FOR SELECT
  USING (public.is_org_member(org_id));

-- dog_assignments RLS
ALTER TABLE public.dog_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dog_assignments_select" ON public.dog_assignments FOR SELECT USING (
  trainer_user_id = auth.uid()
  OR (org_id IS NOT NULL AND public.is_org_member(org_id))
);
CREATE POLICY "dog_assignments_insert" ON public.dog_assignments FOR INSERT WITH CHECK (
  (org_id IS NOT NULL AND public.is_org_member_with_role(org_id, ARRAY['owner','manager']))
  OR (org_id IS NULL AND trainer_user_id = auth.uid())
);
CREATE POLICY "dog_assignments_update" ON public.dog_assignments FOR UPDATE USING (
  (org_id IS NOT NULL AND public.is_org_member_with_role(org_id, ARRAY['owner','manager']))
  OR (org_id IS NULL AND trainer_user_id = auth.uid())
);
