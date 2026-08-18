-- B2B IAP order scope.
-- Parity: IAP-001, B2B-001
--
-- B2B 결제 복구/멱등성 검증은 주문 행이 어느 조직/훈련사 스코프에 묶였는지
-- DB에 남아 있어야 한다. 기존 B2C RLS(user_id = auth.uid())는 유지하고,
-- 서버(service role)가 검증한 B2B 컨텍스트만 저장한다.

ALTER TABLE public.toss_orders
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trainer_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_toss_orders_org_pending
  ON public.toss_orders(org_id, created_at)
  WHERE org_id IS NOT NULL AND grant_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_toss_orders_trainer_pending
  ON public.toss_orders(trainer_user_id, created_at)
  WHERE trainer_user_id IS NOT NULL AND grant_status = 'pending';

ALTER TABLE public.toss_orders
  DROP CONSTRAINT IF EXISTS ck_toss_orders_b2b_scope_xor;

ALTER TABLE public.toss_orders
  ADD CONSTRAINT ck_toss_orders_b2b_scope_xor
  CHECK (
    (org_id IS NULL AND trainer_user_id IS NULL)
    OR
    (org_id IS NOT NULL AND trainer_user_id IS NULL)
    OR
    (org_id IS NULL AND trainer_user_id IS NOT NULL)
  );
