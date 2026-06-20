create table if not exists public.care_moments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  session_id uuid not null references public.care_sessions(id) on delete cascade,
  dependent_id uuid not null references public.dependents(id) on delete cascade,
  note text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists care_moments_session_created_idx
on public.care_moments (session_id, created_at);

create index if not exists care_moments_family_created_idx
on public.care_moments (family_id, created_at);

alter table public.care_moments enable row level security;

grant select, insert, update, delete on table public.care_moments to authenticated;

drop policy if exists "Users can view own care moments" on public.care_moments;

create policy "Users can view own care moments"
on public.care_moments
for select
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can create own care moments" on public.care_moments;

create policy "Users can create own care moments"
on public.care_moments
for insert
to authenticated
with check (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own care moments" on public.care_moments;

create policy "Users can update own care moments"
on public.care_moments
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

drop policy if exists "Users can delete own care moments" on public.care_moments;

create policy "Users can delete own care moments"
on public.care_moments
for delete
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);
