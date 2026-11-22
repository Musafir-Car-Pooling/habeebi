drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or account_type = 'provider'
  or exists (select 1 from public.service_requests r where r.citizen_id = profiles.id)
  or exists (select 1 from public.reviews v where v.citizen_id = profiles.id)
);
drop policy if exists "media read auth" on storage.objects;
create policy "media read auth" on storage.objects for select to authenticated using (
  bucket_id = 'media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.service_requests r where r.voice_url = storage.objects.name)
  )
);