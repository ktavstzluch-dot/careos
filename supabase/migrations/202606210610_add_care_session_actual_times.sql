alter table public.care_sessions
add column if not exists actual_started_at timestamptz,
add column if not exists actual_ended_at timestamptz;
