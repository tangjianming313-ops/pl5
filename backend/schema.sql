-- 广东来总AI排码 · Supabase backend foundation v1
-- Run once in Supabase SQL Editor. No credentials are stored in this repository.
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor uuid not null references auth.users(id),
  action text not null,
  target_key text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log(created_at desc);

-- SECURITY DEFINER avoids recursive RLS checks against admin_members.
create or replace function public.is_site_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.admin_members where user_id = (select auth.uid()));
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

alter table public.user_profiles enable row level security;
alter table public.admin_members enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "profile owner select" on public.user_profiles;
create policy "profile owner select" on public.user_profiles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_site_admin()));
drop policy if exists "profile owner insert" on public.user_profiles;
create policy "profile owner insert" on public.user_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "profile owner update" on public.user_profiles;
create policy "profile owner update" on public.user_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "admin members read own" on public.admin_members;
create policy "admin members read own" on public.admin_members for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select to anon,authenticated using (key in ('public_notice','default_digits'));
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings for all to authenticated using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read" on public.admin_audit_log for select to authenticated using ((select public.is_site_admin()));
-- Do not grant client-side writes to audit logs. Add server-side RPC later.

revoke all on public.admin_members from anon,authenticated;
grant select on public.admin_members to authenticated;
revoke all on public.admin_audit_log from anon,authenticated;
grant select on public.admin_audit_log to authenticated;
grant select,insert,update on public.user_profiles to authenticated;
grant select on public.site_settings to anon,authenticated;
grant insert,update,delete on public.site_settings to authenticated;

insert into public.site_settings(key,value) values
('default_digits','{"enabled":false,"allowed":["0123456789","0123456789","0123456789","0123456789"]}'::jsonb),
('public_notice','{"enabled":false,"title":"","message":""}'::jsonb)
on conflict (key) do nothing;

-- IMPORTANT: add the first admin manually in Supabase SQL Editor, after creating
-- the intended Supabase Auth user and verifying their UUID:
-- insert into public.admin_members(user_id) values ('YOUR_VERIFIED_AUTH_USER_UUID');
-- Never insert public-facing passwords, service_role keys, or secret keys in GitHub.
