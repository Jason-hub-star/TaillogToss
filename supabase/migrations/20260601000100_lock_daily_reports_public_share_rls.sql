-- B2B-001 / AUTH-001: close anonymous daily_reports list/read.
-- Public parent access must go through FastAPI token + phone-last4 verification.

DROP POLICY IF EXISTS "daily_reports_select" ON public.daily_reports;

CREATE POLICY "daily_reports_select"
ON public.daily_reports FOR SELECT TO public
USING (
  ((created_by_org_id IS NOT NULL) AND public.is_org_member(created_by_org_id))
  OR ((created_by_trainer_id IS NOT NULL) AND (created_by_trainer_id = (SELECT auth.uid())))
  OR public.is_parent_of_dog(dog_id)
);
