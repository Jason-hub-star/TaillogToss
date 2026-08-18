-- IAP-001 / AUTH-001: subscriptions are a server-owned entitlement ledger.
-- Clients may read their own current state, but activation/token changes must
-- come from verify-iap-order/FastAPI service-role paths after Toss validation.

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_delete" ON public.subscriptions;

CREATE POLICY "users read own subscriptions"
ON public.subscriptions FOR SELECT TO public
USING (user_id = (SELECT auth.uid()));
