-- IAP-001 / AUTH-001: toss_orders is a server-verified ledger.
-- Clients may read their own order rows, but inserts/updates must come from
-- service-role Edge/FastAPI verification paths only.

DROP POLICY IF EXISTS "toss_orders_user_insert" ON public.toss_orders;
DROP POLICY IF EXISTS "toss_orders_user_update" ON public.toss_orders;

DROP POLICY IF EXISTS "toss_orders_user_select" ON public.toss_orders;
CREATE POLICY "toss_orders_user_select"
ON public.toss_orders FOR SELECT TO public
USING (user_id = (SELECT auth.uid()));
