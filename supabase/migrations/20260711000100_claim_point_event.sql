-- SEC-2 (도그푸딩 감사 2026-07-11): point_events 원자적 claim.
-- process-point-events 드레이너가 SELECT→지급→마킹 순서라, 두 실행이 겹치거나
-- 지급 후 중단되면 같은 이벤트가 재지급(at-least-once)됐다. 지급 "이전"에 원자적으로
-- processed=true 로 claim 해, 하나의 실행만 지급하도록 보장한다(at-most-once).
--
-- 반환: true = 이번 호출이 claim 성공(지급 진행) / false = 이미 처리됨(건너뜀).

create or replace function public.claim_point_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.point_events
     set processed = true,
         processed_at = now()
   where id = p_event_id
     and processed = false;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

-- service_role(Edge 드레이너) 전용 — anon/authenticated 직접 호출 차단.
revoke all on function public.claim_point_event(uuid) from public, anon, authenticated;
grant execute on function public.claim_point_event(uuid) to service_role;
