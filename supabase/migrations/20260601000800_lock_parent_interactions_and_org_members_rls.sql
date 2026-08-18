-- B2B-001 / AUTH-001: tighten remaining B2B side-table boundaries.
-- parent_interactions must follow the protected report/org-dog scope.
-- org_members management must not let managers grant owner/manager roles.

DROP POLICY IF EXISTS "parent_interactions_select" ON public.parent_interactions;
DROP POLICY IF EXISTS "parent_interactions_insert" ON public.parent_interactions;
DROP POLICY IF EXISTS "parent_interactions_update" ON public.parent_interactions;

CREATE POLICY "parent_interactions_select"
ON public.parent_interactions FOR SELECT TO public
USING (
  parent_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.daily_reports dr
    JOIN public.org_dogs od
      ON od.org_id = dr.created_by_org_id
     AND od.dog_id = dr.dog_id
     AND od.status = 'active'
    WHERE dr.id = parent_interactions.report_id
      AND dr.created_by_org_id IS NOT NULL
      AND public.is_org_member(dr.created_by_org_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.daily_reports dr
    WHERE dr.id = parent_interactions.report_id
      AND dr.created_by_trainer_id = (SELECT auth.uid())
  )
);

CREATE POLICY "parent_interactions_insert"
ON public.parent_interactions FOR INSERT TO public
WITH CHECK (
  parent_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.daily_reports dr
    WHERE dr.id = parent_interactions.report_id
      AND public.is_parent_of_dog(dr.dog_id)
      AND (dr.expires_at IS NULL OR dr.expires_at > now())
  )
);

CREATE POLICY "parent_interactions_update"
ON public.parent_interactions FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_reports dr
    JOIN public.org_dogs od
      ON od.org_id = dr.created_by_org_id
     AND od.dog_id = dr.dog_id
     AND od.status = 'active'
    WHERE dr.id = parent_interactions.report_id
      AND dr.created_by_org_id IS NOT NULL
      AND public.is_org_member_with_role(dr.created_by_org_id, ARRAY['owner','manager','staff'])
  )
  OR EXISTS (
    SELECT 1
    FROM public.daily_reports dr
    WHERE dr.id = parent_interactions.report_id
      AND dr.created_by_trainer_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  responded_by IS NULL OR responded_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_update" ON public.org_members;

CREATE POLICY "org_members_insert"
ON public.org_members FOR INSERT TO public
WITH CHECK (
  (
    role IN ('staff', 'viewer')
    AND status IN ('pending', 'active')
    AND public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
  )
  OR (
    role IN ('owner', 'manager')
    AND status IN ('pending', 'active')
    AND public.is_org_member_with_role(org_id, ARRAY['owner'])
  )
);

CREATE POLICY "org_members_update"
ON public.org_members FOR UPDATE TO public
USING (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
)
WITH CHECK (
  (
    role IN ('staff', 'viewer')
    AND public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
  )
  OR (
    role IN ('owner', 'manager')
    AND public.is_org_member_with_role(org_id, ARRAY['owner'])
  )
);
