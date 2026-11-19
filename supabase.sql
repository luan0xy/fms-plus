-- FMS+ Supabase schema
-- Run in Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.catalog (
  id uuid primary key,
  title text not null,
  kind text not null check (kind in ('movie','series')),
  description text,
  year integer,
  genre text,
  video_path text not null,
  cover_path text,
  cover_url text,
  published boolean not null default false,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.catalog enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create policy "Users read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Published catalog is readable"
on public.catalog for select to authenticated
using (published = true or (select public.is_admin()));

create policy "Admins insert catalog"
on public.catalog for insert to authenticated
with check ((select public.is_admin()) and owner_id=(select auth.uid()));

create policy "Admins update catalog"
on public.catalog for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins delete catalog"
on public.catalog for delete to authenticated
using ((select public.is_admin()));

-- Create private video bucket and public cover bucket.
insert into storage.buckets(id,name,public)
values ('videos','videos',false),('covers','covers',true)
on conflict(id) do nothing;

create policy "Admin uploads videos"
on storage.objects for insert to authenticated
with check (
  bucket_id='videos'
  and (select public.is_admin())
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

create policy "Admin manages videos"
on storage.objects for delete to authenticated
using (bucket_id='videos' and (select public.is_admin()));

create policy "Published video access"
on storage.objects for select to authenticated
using (
  bucket_id='videos'
  and exists (
    select 1 from public.catalog c
    where c.video_path=storage.objects.name
      and (c.published=true or (select public.is_admin()))
  )
);

create policy "Admin uploads covers"
on storage.objects for insert to authenticated
with check (
  bucket_id='covers'
  and (select public.is_admin())
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

create policy "Admin deletes covers"
on storage.objects for delete to authenticated
using (bucket_id='covers' and (select public.is_admin()));

create policy "Public reads covers"
on storage.objects for select to anon, authenticated
using (bucket_id='covers');

-- Optional: promote your account to administrator.
-- Replace your-email@example.com and run after registering.
-- insert into public.profiles(id,role)
-- select id,'admin' from auth.users where email='your-email@example.com'
-- on conflict(id) do update set role='admin';

-- Automatically create user profiles on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id,role) values(new.id,'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
