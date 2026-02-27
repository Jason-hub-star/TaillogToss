-- Phase 11 (MSG-001): expand noti_history for Smart Message persistence and cooldown tracking.

alter table public.noti_history
  add column if not exists template_set_code varchar,
  add column if not exists notification_type varchar,
  add column if not exists success boolean not null default true,
  add column if not exists error_code varchar,
  add column if not exists idempotency_key varchar,
  add column if not exists provider_channels jsonb not null default '[]'::jsonb;

update public.noti_history
set template_set_code = coalesce(template_set_code, template_code)
where template_set_code is null;

create index if not exists idx_noti_history_user_sent_at
  on public.noti_history (user_id, sent_at desc);

create unique index if not exists uq_noti_history_idempotency_key
  on public.noti_history (idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'noti_history_notification_type_check'
      and conrelid = 'public.noti_history'::regclass
  ) then
    alter table public.noti_history
      add constraint noti_history_notification_type_check
      check (
        notification_type is null
        or notification_type in (
          'log_reminder',
          'streak_alert',
          'coaching_ready',
          'training_reminder',
          'surge_alert',
          'promo'
        )
      );
  end if;
end $$;
