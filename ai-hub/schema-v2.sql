-- AI HUB MVP v0.3. Run in Supabase SQL Editor as the project owner.
-- Compatible with the v0.2 tables; safe to re-run for policies and seed rows.
-- Never expose a service_role key in web code.
create extension if not exists pgcrypto;

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  official_url text not null,
  category text not null default 'chat',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  authorized_resale boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  plan_label text not null default '',
  renewal_date date not null,
  created_at timestamptz not null default now()
);

alter table public.subscription_records add column if not exists source_id text;
create unique index if not exists unique_subscription_source
  on public.subscription_records(user_id,source_id) where source_id is not null;

alter table public.catalog_products enable row level security;
alter table public.subscription_records enable row level security;
alter table public.staff_members enable row level security;

-- Remove legacy policies from v0.2 first.
drop policy if exists "Public reads published products" on public.catalog_products;
drop policy if exists "Owner reads records" on public.subscription_records;
drop policy if exists "Owner inserts records" on public.subscription_records;
drop policy if exists "Owner updates records" on public.subscription_records;
drop policy if exists "Owner deletes records" on public.subscription_records;

-- Staff assignments can only be changed from the trusted SQL Editor or a
-- later dedicated server-side action; browser clients have no staff write policy.
drop policy if exists "Staff can read own membership" on public.staff_members;
create policy "Staff can read own membership" on public.staff_members
 for select to authenticated using (user_id = (select auth.uid()));

-- Anyone can read published information; staff can also see drafts.
create policy "Public reads published products" on public.catalog_products
 for select to anon, authenticated using (status = 'published');
drop policy if exists "Staff can view all products" on public.catalog_products;
create policy "Staff can view all products" on public.catalog_products
 for select to authenticated using (
   exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()))
 );
drop policy if exists "Staff can add products" on public.catalog_products;
create policy "Staff can add products" on public.catalog_products
 for insert to authenticated with check (
   exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()))
 );
drop policy if exists "Staff can edit products" on public.catalog_products;
create policy "Staff can edit products" on public.catalog_products
 for update to authenticated
 using (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid())))
 with check (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid())));
drop policy if exists "Staff can delete products" on public.catalog_products;
create policy "Staff can delete products" on public.catalog_products
 for delete to authenticated
 using (exists (select 1 from public.staff_members s where s.user_id = (select auth.uid())));

create policy "Owner reads records" on public.subscription_records
 for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner inserts records" on public.subscription_records
 for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Owner updates records" on public.subscription_records
 for update to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));
create policy "Owner deletes records" on public.subscription_records
 for delete to authenticated using (user_id = (select auth.uid()));

-- Ensure no general-purpose browser role can modify staff membership.
revoke all on public.staff_members from anon,authenticated;
grant select on public.staff_members to authenticated;
grant select on public.catalog_products to anon,authenticated;
grant insert,update,delete on public.catalog_products to authenticated;
grant select,insert,update,delete on public.subscription_records to authenticated;

-- Starter information-only catalog. These are external official links,
-- not authorized resold products, and do not accept payment in AI HUB.
insert into public.catalog_products (slug,name,description,official_url,category,status,authorized_resale)
values
 ('chatgpt','ChatGPT','通用 AI 助手、编程、写作与分析','https://chatgpt.com/pricing/','chat','published',false),
 ('claude','Claude','文字处理、代码与长文档分析','https://claude.com/pricing','chat','published',false),
 ('gemini','Gemini','Google AI 多模态助手','https://gemini.google/subscriptions/','chat','published',false),
 ('deepseek','DeepSeek','AI 对话与推理服务','https://www.deepseek.com/','chat','published',false),
 ('perplexity','Perplexity','AI 搜索与研究','https://www.perplexity.ai/pro','research','published',false),
 ('midjourney','Midjourney','AI 图像生成','https://www.midjourney.com/plans','creative','published',false)
on conflict (slug) do nothing;

-- After first admin has logged in via email, find UID in Authentication > Users,
-- then run in SQL Editor (replace the placeholder UUID):
-- insert into public.staff_members(user_id) values ('YOUR_AUTH_USER_UUID')
-- on conflict (user_id) do nothing;
