alter table public.families enable row level security;

drop policy if exists "Users can view own families" on public.families;

create policy "Users can view own families"
on public.families
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can update own families" on public.families;

create policy "Users can update own families"
on public.families
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can create own families" on public.families;

create policy "Users can create own families"
on public.families
for insert
to authenticated
with check (owner_id = auth.uid());
