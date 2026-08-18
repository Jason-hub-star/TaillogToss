-- B2B-001 / AUTH-001: bind dog_assignments RLS to the target dog scope.
-- Org-scoped assignments must reference an active dog in the same org.
-- Personal assignments must reference a dog owned by the caller.

DROP POLICY IF EXISTS "dog_assignments_select" ON public.dog_assignments;
DROP POLICY IF EXISTS "dog_assignments_insert" ON public.dog_assignments;
DROP POLICY IF EXISTS "dog_assignments_update" ON public.dog_assignments;

CREATE POLICY "dog_assignments_select" ON public.dog_assignments
FOR SELECT TO public
USING (
  (
    trainer_user_id = (SELECT auth.uid())
    AND (
      (
        org_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.org_dogs od
          WHERE od.org_id = dog_assignments.org_id
            AND od.dog_id = dog_assignments.dog_id
            AND od.status = 'active'
        )
      )
      OR (
        org_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.dogs d
          WHERE d.id = dog_assignments.dog_id
            AND d.user_id = (SELECT auth.uid())
        )
      )
    )
  )
  OR (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
);

CREATE POLICY "dog_assignments_insert" ON public.dog_assignments
FOR INSERT TO public
WITH CHECK (
  (
    org_id IS NOT NULL
    AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    org_id IS NOT NULL
    AND trainer_user_id = (SELECT auth.uid())
    AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager', 'staff', 'trainer'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    org_id IS NULL
    AND trainer_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = dog_assignments.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "dog_assignments_update" ON public.dog_assignments
FOR UPDATE TO public
USING (
  (
    org_id IS NOT NULL
    AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    org_id IS NOT NULL
    AND trainer_user_id = (SELECT auth.uid())
    AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager', 'staff', 'trainer'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    org_id IS NULL
    AND trainer_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = dog_assignments.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  (
    org_id IS NOT NULL
    AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    org_id IS NOT NULL
    AND trainer_user_id = (SELECT auth.uid())
    AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager', 'staff', 'trainer'])
    AND EXISTS (
      SELECT 1
      FROM public.org_dogs od
      WHERE od.org_id = dog_assignments.org_id
        AND od.dog_id = dog_assignments.dog_id
        AND od.status = 'active'
    )
  )
  OR (
    org_id IS NULL
    AND trainer_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.dogs d
      WHERE d.id = dog_assignments.dog_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
);
