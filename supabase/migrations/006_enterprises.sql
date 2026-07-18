-- ═══════════════════════════════════════════
-- أمرني — قسم المنشآت (B2B)
-- ═══════════════════════════════════════════

-- ── 1. Enterprise Leads (طلبات المنشآت) ─────
create table if not exists public.enterprise_leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  company_name    text not null,
  contact_name    text not null,
  contact_email   text not null,
  contact_phone   text,
  company_size    text check (company_size in ('1-10','11-50','51-200','201-500','500+')),
  category        text not null,
  description     text not null,
  budget_range    text,
  status          text default 'new' check (status in ('new','reviewing','matched','closed')),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.enterprise_leads enable row level security;
create policy "lead_own" on public.enterprise_leads for all using (auth.uid() = user_id);
create policy "admin_all_leads" on public.enterprise_leads for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "insert_lead" on public.enterprise_leads for insert with check (true);

-- ── 2. Enterprise Providers (مزودو الخدمة للمنشآت) ─────
create table if not exists public.enterprise_providers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  company_name    text not null,
  contact_name    text not null,
  contact_email   text not null,
  contact_phone   text,
  categories      text[] not null default '{}',
  description     text,
  cr_number       text,
  is_approved     boolean default false,
  created_at      timestamptz default now()
);
alter table public.enterprise_providers enable row level security;
create policy "provider_own" on public.enterprise_providers for all using (auth.uid() = user_id);
create policy "admin_all_providers" on public.enterprise_providers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "insert_provider" on public.enterprise_providers for insert with check (true);
