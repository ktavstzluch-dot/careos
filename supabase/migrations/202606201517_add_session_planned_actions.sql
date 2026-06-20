alter table public.care_sessions
  add column if not exists planned_actions jsonb not null default '[]'::jsonb;
