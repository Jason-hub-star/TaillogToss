-- AI-001 / UIUX-005: async AI coaching generation jobs.

create table if not exists public.coaching_generation_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  report_type public.report_type not null default 'DAILY',
  user_context text,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'completed', 'failed')),
  coaching_id uuid references public.ai_coaching(id) on delete set null,
  error_code text,
  error_message text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.coaching_generation_jobs enable row level security;

create index if not exists idx_coaching_generation_jobs_user_dog_status
  on public.coaching_generation_jobs(user_id, dog_id, status);

create index if not exists idx_coaching_generation_jobs_dog_created
  on public.coaching_generation_jobs(dog_id, created_at desc);

create unique index if not exists uq_coaching_generation_jobs_active_user_dog
  on public.coaching_generation_jobs(user_id, dog_id)
  where status in ('pending', 'generating');

drop policy if exists "coaching_generation_jobs_owner_select" on public.coaching_generation_jobs;
create policy "coaching_generation_jobs_owner_select"
on public.coaching_generation_jobs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "coaching_generation_jobs_owner_insert" on public.coaching_generation_jobs;
create policy "coaching_generation_jobs_owner_insert"
on public.coaching_generation_jobs for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "coaching_generation_jobs_owner_update" on public.coaching_generation_jobs;
create policy "coaching_generation_jobs_owner_update"
on public.coaching_generation_jobs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
