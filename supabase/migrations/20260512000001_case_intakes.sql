-- PRO-INTAKE-001: Pro 상담지 원문/에피소드 저장 단위

create table if not exists public.case_intakes (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  author_user_id uuid references public.users(id) on delete set null,
  author_role text,
  source_context text not null default 'pro_intake'
    check (source_context in ('pro_intake', 'profile_edit', 'trainer_intake')),
  status text not null default 'submitted'
    check (status in ('draft', 'submitted')),
  version integer not null default 1,
  sections jsonb not null default '{}'::jsonb,
  behavior_episodes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_intakes_dog_updated
  on public.case_intakes(dog_id, updated_at desc);

create index if not exists idx_case_intakes_author
  on public.case_intakes(author_user_id, created_at desc);

alter table public.case_intakes enable row level security;

drop policy if exists "case_intakes_owner_select" on public.case_intakes;
create policy "case_intakes_owner_select"
  on public.case_intakes for select
  using (
    exists (
      select 1
      from public.dogs d
      where d.id = case_intakes.dog_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "case_intakes_owner_write" on public.case_intakes;
create policy "case_intakes_owner_write"
  on public.case_intakes for all
  using (
    exists (
      select 1
      from public.dogs d
      where d.id = case_intakes.dog_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.dogs d
      where d.id = case_intakes.dog_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "case_intakes_b2b_member_select" on public.case_intakes;
create policy "case_intakes_b2b_member_select"
  on public.case_intakes for select
  using (
    exists (
      select 1
      from public.dog_assignments da
      join public.org_members om on om.org_id = da.org_id
      where da.dog_id = case_intakes.dog_id
        and da.status = 'active'
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  );

drop policy if exists "case_intakes_b2b_member_write" on public.case_intakes;
create policy "case_intakes_b2b_member_write"
  on public.case_intakes for all
  using (
    exists (
      select 1
      from public.dog_assignments da
      join public.org_members om on om.org_id = da.org_id
      where da.dog_id = case_intakes.dog_id
        and da.status = 'active'
        and om.user_id = auth.uid()
        and om.status = 'active'
        and om.role in ('owner', 'manager', 'staff')
    )
  )
  with check (
    exists (
      select 1
      from public.dog_assignments da
      join public.org_members om on om.org_id = da.org_id
      where da.dog_id = case_intakes.dog_id
        and da.status = 'active'
        and om.user_id = auth.uid()
        and om.status = 'active'
        and om.role in ('owner', 'manager', 'staff')
    )
  );
