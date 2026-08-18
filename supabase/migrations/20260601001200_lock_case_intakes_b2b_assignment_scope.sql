-- PRO-INTAKE-001 / B2B-001 / AUTH-001:
-- Case intake content can contain detailed behavior episodes. Keep org-wide
-- read/write access to owner/manager/staff, but bind trainer reads to their
-- own active dog assignment.

DROP POLICY IF EXISTS "case_intakes_b2b_member_select" ON public.case_intakes;
DROP POLICY IF EXISTS "case_intakes_b2b_member_write" ON public.case_intakes;

CREATE POLICY "case_intakes_b2b_member_select"
ON public.case_intakes FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.org_dogs od
    WHERE od.dog_id = case_intakes.dog_id
      AND od.status = 'active'
      AND public.is_org_member_with_role(od.org_id, ARRAY['owner','manager','staff'])
  )
  OR EXISTS (
    SELECT 1
    FROM public.dog_assignments da
    WHERE da.dog_id = case_intakes.dog_id
      AND da.trainer_user_id = (SELECT auth.uid())
      AND da.status = 'active'
      AND (
        da.org_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.org_dogs od
          WHERE od.org_id = da.org_id
            AND od.dog_id = da.dog_id
            AND od.status = 'active'
        )
      )
  )
);

CREATE POLICY "case_intakes_b2b_member_write"
ON public.case_intakes FOR ALL TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.org_dogs od
    WHERE od.dog_id = case_intakes.dog_id
      AND od.status = 'active'
      AND public.is_org_member_with_role(od.org_id, ARRAY['owner','manager','staff'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.org_dogs od
    WHERE od.dog_id = case_intakes.dog_id
      AND od.status = 'active'
      AND public.is_org_member_with_role(od.org_id, ARRAY['owner','manager','staff'])
  )
);
