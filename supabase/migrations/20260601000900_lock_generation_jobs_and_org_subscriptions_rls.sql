-- AUTH-001 / AI-001 / B2B-001 / IAP-001:
-- Tighten direct Supabase RLS for async coaching jobs and B2B subscription state.

DROP POLICY IF EXISTS "coaching_generation_jobs_owner_select" ON public.coaching_generation_jobs;
DROP POLICY IF EXISTS "coaching_generation_jobs_owner_insert" ON public.coaching_generation_jobs;
DROP POLICY IF EXISTS "coaching_generation_jobs_owner_update" ON public.coaching_generation_jobs;
DROP POLICY IF EXISTS "coaching_generation_jobs_owner_delete" ON public.coaching_generation_jobs;

CREATE POLICY "coaching_generation_jobs_owner_select"
ON public.coaching_generation_jobs FOR SELECT TO public
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.dogs d
    WHERE d.id = coaching_generation_jobs.dog_id
      AND d.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "coaching_generation_jobs_owner_insert"
ON public.coaching_generation_jobs FOR INSERT TO public
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.dogs d
    WHERE d.id = coaching_generation_jobs.dog_id
      AND d.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "coaching_generation_jobs_owner_update"
ON public.coaching_generation_jobs FOR UPDATE TO public
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.dogs d
    WHERE d.id = coaching_generation_jobs.dog_id
      AND d.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.dogs d
    WHERE d.id = coaching_generation_jobs.dog_id
      AND d.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "org_subscriptions_select" ON public.org_subscriptions;
DROP POLICY IF EXISTS "org_subscriptions_insert" ON public.org_subscriptions;
DROP POLICY IF EXISTS "org_subscriptions_update" ON public.org_subscriptions;
DROP POLICY IF EXISTS "org_subscriptions_delete" ON public.org_subscriptions;

CREATE POLICY "org_subscriptions_select"
ON public.org_subscriptions FOR SELECT TO public
USING (
  (org_id IS NOT NULL AND public.is_org_member(org_id))
  OR (trainer_user_id IS NOT NULL AND trainer_user_id = (SELECT auth.uid()))
);
