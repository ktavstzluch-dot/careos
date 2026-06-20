create table if not exists public.care_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  dependent_id uuid not null references public.dependents(id) on delete cascade,
  title text not null,
  care_type text,
  caregiver_name text not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  notes text,
  instructions text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.care_sessions
  add column if not exists care_type text,
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_at timestamptz,
  add column if not exists notes text,
  add column if not exists instructions text,
  add column if not exists summary text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists care_sessions_family_start_idx
on public.care_sessions (family_id, starts_at);

create index if not exists care_sessions_dependent_idx
on public.care_sessions (dependent_id);

alter table public.care_sessions enable row level security;

grant select, insert, update, delete on table public.care_sessions to authenticated;

drop policy if exists "Users can view own care sessions" on public.care_sessions;

create policy "Users can view own care sessions"
on public.care_sessions
for select
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can create own care sessions" on public.care_sessions;

create policy "Users can create own care sessions"
on public.care_sessions
for insert
to authenticated
with check (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own care sessions" on public.care_sessions;

create policy "Users can update own care sessions"
on public.care_sessions
for update
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
)
with check (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete own care sessions" on public.care_sessions;

create policy "Users can delete own care sessions"
on public.care_sessions
for delete
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);
