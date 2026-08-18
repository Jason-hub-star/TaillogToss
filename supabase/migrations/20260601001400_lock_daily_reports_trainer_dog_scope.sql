-- B2B-001 / AUTH-001: trainer-created daily reports must stay bound to the
-- trainer's own dog. This closes stale/forged rows where created_by_trainer_id
-- matches the caller but dog_id points at another user's dog.

DROP POLICY IF EXISTS "daily_reports_select" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert" ON public.daily_reports;
DROP POLICY IF EXISTS "daily_reports_update" ON public.daily_reports;

CREATE POLICY "daily_reports_select"
ON public.daily_reports FOR SELECT TO public
USING (
  (
    created_by_org_id IS NOT NULL
    AND public.is_org_member(created_by_org_id)
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = daily_reports.created_by_org_id
        AND od.dog_id = daily_reports.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    created_by_org_id IS NULL
    AND created_by_trainer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = daily_reports.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
  OR public.is_parent_of_dog(dog_id)
);

CREATE POLICY "daily_reports_insert"
ON public.daily_reports FOR INSERT TO public
WITH CHECK (
  (
    created_by_org_id IS NOT NULL
    AND created_by_trainer_id IS NULL
    AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = daily_reports.created_by_org_id
        AND od.dog_id = daily_reports.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    created_by_org_id IS NULL
    AND created_by_trainer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = daily_reports.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "daily_reports_update"
ON public.daily_reports FOR UPDATE TO public
USING (
  (
    created_by_org_id IS NOT NULL
    AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = daily_reports.created_by_org_id
        AND od.dog_id = daily_reports.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    created_by_org_id IS NULL
    AND created_by_trainer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = daily_reports.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (
    created_by_org_id IS NOT NULL
    AND created_by_trainer_id IS NULL
    AND public.is_org_member_with_role(created_by_org_id, ARRAY['owner','manager','staff'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = daily_reports.created_by_org_id
        AND od.dog_id = daily_reports.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    created_by_org_id IS NULL
    AND created_by_trainer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = daily_reports.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
);
