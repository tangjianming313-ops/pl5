-- AI HUB future backend schema; apply only after configuring Supabase Auth and RLS.
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
alter table public.catalog_products enable row level security;
alter table public.subscription_records enable row level security;
create policy "Public reads published products" on public.catalog_products for select to anon, authenticated using (status = 'published');
create policy "Owner reads records" on public.subscription_records for select to authenticated using (auth.uid() = user_id);
create policy "Owner inserts records" on public.subscription_records for insert to authenticated with check (auth.uid() = user_id);
create policy "Owner updates records" on public.subscription_records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Owner deletes records" on public.subscription_records for delete to authenticated using (auth.uid() = user_id);
-- No client-side catalog mutation policy: admin writes must be server-side and audited.
-- Never expose a Supabase service_role key in frontend code.
