insert into storage.buckets (id, name, public)
values ('care-photos', 'care-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload care photos" on storage.objects;

create policy "Authenticated users can upload care photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'care-photos');

drop policy if exists "Authenticated users can view care photos" on storage.objects;

create policy "Authenticated users can view care photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'care-photos');

drop policy if exists "Authenticated users can delete care photos" on storage.objects;

create policy "Authenticated users can delete care photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'care-photos');
