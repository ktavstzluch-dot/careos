create table if not exists public.care_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  session_id uuid not null references public.care_sessions(id) on delete cascade,
  dependent_id uuid not null references public.dependents(id) on delete cascade,
  source text not null default 'added'
    check (source in ('planned', 'added')),
  planned_action_id text,
  event_type text not null
    check (event_type in ('meal', 'nap', 'walk', 'medicine', 'activity', 'custom', 'note', 'photo')),
  label text not null,
  notes text,
  photo_url text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_events_session_created_idx
on public.care_events (session_id, created_at);

create index if not exists care_events_session_completed_idx
on public.care_events (session_id, completed_at);

create index if not exists care_events_family_created_idx
on public.care_events (family_id, created_at);

alter table public.care_events enable row level security;

grant select, insert, update, delete on table public.care_events to authenticated;

drop policy if exists "Users can view own care events" on public.care_events;

create policy "Users can view own care events"
on public.care_events
for select
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can create own care events" on public.care_events;

create policy "Users can create own care events"
on public.care_events
for insert
to authenticated
with check (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own care events" on public.care_events;

create policy "Users can update own care events"
on public.care_events
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

drop policy if exists "Users can delete own care events" on public.care_events;

create policy "Users can delete own care events"
on public.care_events
for delete
to authenticated
using (
  family_id in (
    select id from public.families where owner_id = auth.uid()
  )
);
