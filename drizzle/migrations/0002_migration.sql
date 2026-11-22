create table public.provider_services (
  provider_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  primary key (provider_id, category_id)
);
grant select, insert, delete on public.provider_services to authenticated;
grant all on public.provider_services to service_role;
alter table public.provider_services enable row level security;
create policy "ps read" on public.provider_services for select to authenticated using (true);
create policy "ps ins" on public.provider_services for insert to authenticated with check (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "ps del" on public.provider_services for delete to authenticated using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));

insert into public.provider_services (provider_id, category_id)
select id, category_id from public.profiles where category_id is not null on conflict do nothing;

create or replace function public.is_my_service(_cat uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.provider_services ps join public.profiles p on p.id = ps.provider_id
    where ps.provider_id = auth.uid() and ps.category_id = _cat and not p.blocked)
$$;

drop policy "req read" on public.service_requests;
create policy "req read" on public.service_requests for select to authenticated using (
  citizen_id = auth.uid() or provider_id = auth.uid()
  or (status = 'open' and public.is_my_service(category_id))
  or public.has_role(auth.uid(),'admin'));

drop policy "bids insert" on public.bids;
create policy "bids insert" on public.bids for insert to authenticated with check (
  provider_id = auth.uid() and status = 'pending'
  and exists (select 1 from public.service_requests r where r.id = request_id and r.status='open' and public.is_my_service(r.category_id)));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cats uuid[] := '{}';
begin
  begin
    select coalesce(array_agg(x::uuid), '{}') into cats
    from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'category_ids', '[]'::jsonb)) x;
  exception when others then cats := '{}'; end;
  insert into public.profiles (id, full_name, account_type, category_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
    case when cardinality(cats) = 0 then 'citizen' else 'provider' end, cats[1]);
  insert into public.profile_private (id, phone, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.email,''));
  insert into public.provider_services (provider_id, category_id)
  select new.id, c from unnest(cats) c
  where exists (select 1 from public.service_categories sc where sc.id = c) on conflict do nothing;
  if lower(new.email) = 'pp@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id,'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id,'user') on conflict do nothing;
  return new;
end $$;

alter table public.app_settings alter column app_name set default 'HaBeeBi';
update public.app_settings set app_name = 'HaBeeBi' where id = 1;