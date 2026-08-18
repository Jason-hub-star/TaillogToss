-- B2B-001 / AUTH-001: narrow org_dogs visibility to explicit role/assignment scope.
-- Owners/managers/staff may see their organization dogs. Assigned trainers see
-- only their active assignments. Parents/owners see their own dog rows.

DROP POLICY IF EXISTS "org_dogs_select" ON public.org_dogs;
DROP POLICY IF EXISTS "org_dogs_insert" ON public.org_dogs;
DROP POLICY IF EXISTS "org_dogs_update" ON public.org_dogs;
DROP POLICY IF EXISTS "org_dogs_delete" ON public.org_dogs;

CREATE POLICY "org_dogs_select"
ON public.org_dogs FOR SELECT TO public
USING (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager','staff'])
  OR parent_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.dogs d
    WHERE d.id = org_dogs.dog_id
      AND d.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.dog_assignments da
    WHERE da.org_id = org_dogs.org_id
      AND da.dog_id = org_dogs.dog_id
      AND da.trainer_user_id = (SELECT auth.uid())
      AND da.status = 'active'
  )
);

CREATE POLICY "org_dogs_insert"
ON public.org_dogs FOR INSERT TO public
WITH CHECK (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
);

CREATE POLICY "org_dogs_update"
ON public.org_dogs FOR UPDATE TO public
USING (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
)
WITH CHECK (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
);

CREATE POLICY "org_dogs_delete"
ON public.org_dogs FOR DELETE TO public
USING (
  public.is_org_member_with_role(org_id, ARRAY['owner','manager'])
);
