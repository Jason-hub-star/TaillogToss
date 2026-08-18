-- LOG-001 / AUTH-001 / B2B-001: prevent client-side audit spoofing.
-- Direct public clients may create/update logs only inside their dog/org/assignment
-- scope and may not set recorded_by to another user. FastAPI continues to set
-- recorded_by from the verified JWT user.

DROP POLICY IF EXISTS "behavior_logs_b2b_insert" ON public.behavior_logs;
DROP POLICY IF EXISTS "behavior_logs_b2b_update" ON public.behavior_logs;

CREATE POLICY "behavior_logs_b2b_insert"
ON public.behavior_logs FOR INSERT TO public
WITH CHECK (
  (
    recorded_by IS NULL
    OR recorded_by = (SELECT auth.uid())
  )
  AND (
    dog_id IN (
      SELECT dogs.id
      FROM public.dogs
      WHERE dogs.user_id = (SELECT auth.uid())
    )
    OR (
      org_id IS NOT NULL
      AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager', 'staff'])
      AND EXISTS (
        SELECT 1
        FROM public.org_dogs od
        WHERE od.org_id = behavior_logs.org_id
          AND od.dog_id = behavior_logs.dog_id
          AND od.status = 'active'
      )
    )
    OR dog_id IN (
      SELECT dog_assignments.dog_id
      FROM public.dog_assignments
      WHERE dog_assignments.trainer_user_id = (SELECT auth.uid())
        AND dog_assignments.status = 'active'
        AND (
          dog_assignments.org_id = behavior_logs.org_id
          OR (dog_assignments.org_id IS NULL AND behavior_logs.org_id IS NULL)
        )
    )
  )
);

CREATE POLICY "behavior_logs_b2b_update"
ON public.behavior_logs FOR UPDATE TO public
USING (
  recorded_by = (SELECT auth.uid())
  OR dog_id IN (
    SELECT dogs.id
    FROM public.dogs
    WHERE dogs.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (
    recorded_by IS NULL
    OR recorded_by = (SELECT auth.uid())
  )
  AND (
    dog_id IN (
      SELECT dogs.id
      FROM public.dogs
      WHERE dogs.user_id = (SELECT auth.uid())
    )
    OR (
      org_id IS NOT NULL
      AND public.is_org_member_with_role(org_id, ARRAY['owner', 'manager', 'staff'])
      AND EXISTS (
        SELECT 1
        FROM public.org_dogs od
        WHERE od.org_id = behavior_logs.org_id
          AND od.dog_id = behavior_logs.dog_id
          AND od.status = 'active'
      )
    )
    OR dog_id IN (
      SELECT dog_assignments.dog_id
      FROM public.dog_assignments
      WHERE dog_assignments.trainer_user_id = (SELECT auth.uid())
        AND dog_assignments.status = 'active'
        AND (
          dog_assignments.org_id = behavior_logs.org_id
          OR (dog_assignments.org_id IS NULL AND behavior_logs.org_id IS NULL)
        )
    )
  )
);
