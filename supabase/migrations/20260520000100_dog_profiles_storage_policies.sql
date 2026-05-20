-- APP-001 / UIUX-006: allow authenticated users to manage their own dog profile photos.

insert into storage.buckets (id, name, public)
values ('dog-profiles', 'dog-profiles', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "dog_profiles_public_read" on storage.objects;
create policy "dog_profiles_public_read"
on storage.objects for select
to public
using (bucket_id = 'dog-profiles');

drop policy if exists "dog_profiles_owner_insert" on storage.objects;
create policy "dog_profiles_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dog-profiles'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "dog_profiles_owner_update" on storage.objects;
create policy "dog_profiles_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'dog-profiles'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'dog-profiles'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "dog_profiles_owner_delete" on storage.objects;
create policy "dog_profiles_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'dog-profiles'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
