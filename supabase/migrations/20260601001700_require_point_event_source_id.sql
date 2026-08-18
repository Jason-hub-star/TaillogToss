-- Require point_events to be tied to a concrete source row before payout.
-- Parity: AD-001, GROWTH-001, SEC-REWARD
--
-- The drainer uses point-event-{point_events.id} as the Toss idempotency key,
-- while the DB dedup boundary is (user_id, event_type, source_id). A nullable
-- source_id would weaken that DB-level duplicate guard, so new queue rows must
-- carry the source event id.

ALTER TABLE public.point_events
  ADD CONSTRAINT point_events_source_id_required
  CHECK (source_id IS NOT NULL) NOT VALID;
