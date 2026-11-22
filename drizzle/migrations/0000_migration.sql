create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin','user');

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default '🛠️',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.service_categories to anon, authenticated;
grant insert, update, delete on public.service_categories to authenticated;
grant all on public.service_categories to service_role;
alter table public.service_categories enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "cats read" on public.service_categories for select to anon, authenticated using (true);
create policy "cats admin ins" on public.service_categories for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "cats admin upd" on public.service_categories for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "cats admin del" on public.service_categories for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  account_type text not null default 'citizen' check (account_type in ('citizen','provider')),
  category_id uuid references public.service_categories(id) on delete set null,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles self upd" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null default '',
  email text not null default ''
);
grant select, update on public.profile_private to authenticated;
grant all on public.profile_private to service_role;
alter table public.profile_private enable row level security;
create policy "private self" on public.profile_private for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "private self upd" on public.profile_private for update to authenticated using (id = auth.uid());

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') and new.blocked is distinct from old.blocked then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on public.profiles for each row execute function public.guard_profile_update();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cat uuid;
begin
  begin cat := nullif(new.raw_user_meta_data->>'category_id','')::uuid; exception when others then cat := null; end;
  insert into public.profiles (id, full_name, account_type, category_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
    case when cat is null then 'citizen' else 'provider' end, cat);
  insert into public.profile_private (id, phone, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.email,''));
  if lower(new.email) = 'pp@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id,'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id,'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.my_category() returns uuid language sql stable security definer set search_path = public as $$
  select category_id from public.profiles where id = auth.uid() and account_type = 'provider' and not blocked
$$;

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  description text not null,
  price_aed numeric(10,2) not null check (price_aed > 0),
  lat double precision,
  lng double precision,
  address text,
  voice_url text,
  status text not null default 'open' check (status in ('open','accepted','completed','cancelled')),
  provider_id uuid references public.profiles(id) on delete set null,
  accepted_bid_id uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.service_requests to authenticated;
grant all on public.service_requests to service_role;
alter table public.service_requests enable row level security;
create policy "req read" on public.service_requests for select to authenticated using (
  citizen_id = auth.uid() or provider_id = auth.uid()
  or (status = 'open' and category_id = public.my_category())
  or public.has_role(auth.uid(),'admin'));
create policy "req insert" on public.service_requests for insert to authenticated with check (citizen_id = auth.uid() and status = 'open');
create policy "req upd" on public.service_requests for update to authenticated using (citizen_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "req del" on public.service_requests for delete to authenticated using (citizen_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  amount_aed numeric(10,2) not null check (amount_aed > 0),
  eta_minutes int not null default 30,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (request_id, provider_id)
);
grant select, insert, update, delete on public.bids to authenticated;
grant all on public.bids to service_role;
alter table public.bids enable row level security;
create policy "bids read" on public.bids for select to authenticated using (
  provider_id = auth.uid()
  or exists (select 1 from public.service_requests r where r.id = request_id and r.citizen_id = auth.uid())
  or public.has_role(auth.uid(),'admin'));
create policy "bids insert" on public.bids for insert to authenticated with check (
  provider_id = auth.uid() and status = 'pending'
  and exists (select 1 from public.service_requests r where r.id = request_id and r.status='open' and r.category_id = public.my_category()));
create policy "bids upd citizen" on public.bids for update to authenticated using (
  exists (select 1 from public.service_requests r where r.id = request_id and r.citizen_id = auth.uid()));
create policy "bids del" on public.bids for delete to authenticated using (provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.accept_bid(_bid_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.bids; r public.service_requests;
begin
  select * into b from public.bids where id = _bid_id;
  if not found then raise exception 'Bid not found'; end if;
  select * into r from public.service_requests where id = b.request_id;
  if r.citizen_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if r.status <> 'open' then raise exception 'Request is not open'; end if;
  update public.bids set status = case when id = _bid_id then 'accepted' else 'rejected' end where request_id = r.id;
  update public.service_requests set status='accepted', provider_id=b.provider_id, accepted_bid_id=b.id where id = r.id;
end $$;

create or replace function public.complete_request(_request_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.service_requests set status='completed'
  where id = _request_id and status='accepted' and (citizen_id = auth.uid() or provider_id = auth.uid());
  if not found then raise exception 'Not allowed'; end if;
end $$;

create or replace function public.get_contacts(_request_id uuid)
returns table(citizen_phone text, provider_phone text) language sql stable security definer set search_path = public as $$
  select (select phone from public.profile_private where id = r.citizen_id),
         (select phone from public.profile_private where id = r.provider_id)
  from public.service_requests r
  where r.id = _request_id and r.status in ('accepted','completed')
    and (r.citizen_id = auth.uid() or r.provider_id = auth.uid() or public.has_role(auth.uid(),'admin'))
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "msg read" on public.messages for select to authenticated using (
  exists (select 1 from public.service_requests r where r.id = request_id and (r.citizen_id = auth.uid() or r.provider_id = auth.uid()))
  or public.has_role(auth.uid(),'admin'));
create policy "msg insert" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.service_requests r where r.id = request_id
   and r.status in ('accepted','completed') and (r.citizen_id = auth.uid() or r.provider_id = auth.uid())));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  citizen_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "rev read" on public.reviews for select to authenticated using (true);
create policy "rev insert" on public.reviews for insert to authenticated with check (
  citizen_id = auth.uid() and exists (select 1 from public.service_requests r where r.id = request_id
   and r.citizen_id = auth.uid() and r.provider_id = provider_id and r.status = 'completed'));
create policy "rev del" on public.reviews for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  app_name text not null default 'Serviyo',
  slogan text not null default 'An ultimate service provider',
  currency text not null default 'AED',
  commission_pct numeric(5,2) not null default 10
);
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings read" on public.app_settings for select to anon, authenticated using (true);
create policy "settings upd" on public.app_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.app_settings (id) values (1);

insert into public.service_categories (name, icon, sort) values
 ('Electrician','⚡',1),('Plumber','🔧',2),('Home Cleaner','🧽',3),('Maid','🧹',4),
 ('Cook','🍳',5),('Chef','👨‍🍳',6),('Labour','👷',7),('AC Technician','❄️',8),('Painter','🎨',9),('Carpenter','🪚',10);

alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.service_requests;

-- Seed admin account
do $$
declare uid uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where lower(email) = 'pp@gmail.com') then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'pp@gmail.com',
      extensions.crypt('ppllmm', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Serviyo Admin"}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', 'pp@gmail.com', 'email_verified', true), 'email', now(), now(), now());
  end if;
end $$;