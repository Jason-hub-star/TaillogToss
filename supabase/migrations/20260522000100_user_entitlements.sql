-- contactsViral PRO 1일권 entitlement
-- Parity: GROWTH-001, IAP-001

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('PRO_DAY_PASS')),
  source text not null check (source in ('contacts_viral')),
  source_module_id text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_entitlements_user_id
  on public.user_entitlements(user_id);

create index if not exists idx_user_entitlements_active
  on public.user_entitlements(user_id, type, expires_at);

create unique index if not exists user_entitlements_contacts_viral_daily_key
  on public.user_entitlements (
    user_id,
    source,
    source_module_id,
    ((starts_at at time zone 'Asia/Seoul')::date)
  )
  where source = 'contacts_viral'
    and type = 'PRO_DAY_PASS'
    and source_module_id is not null;

alter table public.user_entitlements enable row level security;

drop policy if exists "user_entitlements_service_role_all" on public.user_entitlements;
create policy "user_entitlements_service_role_all"
  on public.user_entitlements
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements
  for select
  to authenticated
  using (auth.uid() = user_id);
