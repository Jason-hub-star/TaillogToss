-- IAP-001: a Toss order id must not be reusable under a new idempotency key.
--
-- The Edge function also checks toss_order_id before grant activation, but this
-- ledger constraint keeps the invariant at DB level for service-role writes.

CREATE UNIQUE INDEX IF NOT EXISTS uq_toss_orders_toss_order_id
  ON public.toss_orders(toss_order_id)
  WHERE toss_order_id IS NOT NULL;
