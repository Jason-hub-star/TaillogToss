-- B2B-001 / AUTH-001:
-- Keep B2B analytics and AI cost rows scoped to the current organization or trainer.

DROP POLICY IF EXISTS "org_analytics_select" ON public.org_analytics_daily;
DROP POLICY IF EXISTS "org_analytics_insert" ON public.org_analytics_daily;
DROP POLICY IF EXISTS "org_analytics_update" ON public.org_analytics_daily;
DROP POLICY IF EXISTS "org_analytics_delete" ON public.org_analytics_daily;

CREATE POLICY "org_analytics_select"
ON public.org_analytics_daily FOR SELECT TO public
USING (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager','staff'])
);

DROP POLICY IF EXISTS "ai_cost_usage_org_select" ON public.ai_cost_usage_org;
DROP POLICY IF EXISTS "ai_cost_usage_org_insert" ON public.ai_cost_usage_org;
DROP POLICY IF EXISTS "ai_cost_usage_org_update" ON public.ai_cost_usage_org;
DROP POLICY IF EXISTS "ai_cost_usage_org_delete" ON public.ai_cost_usage_org;

CREATE POLICY "ai_cost_usage_org_select"
ON public.ai_cost_usage_org FOR SELECT TO public
USING (
  (org_id IS NOT NULL AND public.is_org_member_with_role(org_id, ARRAY['owner','manager']))
  OR (trainer_user_id IS NOT NULL AND trainer_user_id = (SELECT auth.uid()))
);
