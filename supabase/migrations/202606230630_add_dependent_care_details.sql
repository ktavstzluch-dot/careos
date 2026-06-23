alter table public.dependents
add column if not exists care_details jsonb not null default '{}'::jsonb;

alter table public.dependents
drop constraint if exists dependents_care_details_is_object;

alter table public.dependents
add constraint dependents_care_details_is_object
check (jsonb_typeof(care_details) = 'object');
