-- ═══════════════════════════════════════════════════════
-- أمرني — Migration 008: تطوير المنشآت المراحل ١-٤
-- ═══════════════════════════════════════════════════════

-- ── 1) إضافة حقل contract_value لحساب العمولة ──
alter table public.enterprise_leads
  add column if not exists contract_value  numeric,
  add column if not exists commission_paid boolean default false,
  add column if not exists provider_id     uuid references public.enterprise_providers(id) on delete set null,
  add column if not exists nda_accepted    boolean default false,
  add column if not exists nda_accepted_at timestamptz;

-- ── 2) تحسين enterprise_providers ──
alter table public.enterprise_providers
  add column if not exists bio          text,
  add column if not exists rating       numeric(3,1) default 0,
  add column if not exists deals_count  int default 0,
  add column if not exists linkedin_url text,
  add column if not exists website_url  text,
  add column if not exists city         text,
  add column if not exists updated_at   timestamptz default now();

-- ── 3) جدول enterprise_subscriptions للمرحلة ٣ ──
create table if not exists public.enterprise_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  company_name text not null,
  email        text not null,
  plan         text not null check (plan in ('starter','pro','enterprise')),
  status       text default 'pending' check (status in ('pending','active','cancelled')),
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz default now()
);
alter table public.enterprise_subscriptions enable row level security;
create policy "admin_all_subs" on public.enterprise_subscriptions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "insert_sub" on public.enterprise_subscriptions for insert with check (true);

-- ── 4) SLA: دالة تُعيد الطلبات المتأخرة أكثر من 24 ساعة ──
create or replace function public.get_overdue_enterprise_leads()
returns table(id uuid, company_name text, contact_email text, created_at timestamptz)
language sql security definer as $$
  select id, company_name, contact_email, created_at
  from public.enterprise_leads
  where status = 'new'
    and created_at < now() - interval '24 hours'
  order by created_at asc;
$$;

-- ── 5) Indexes إضافية ──
create index if not exists idx_leads_provider   on public.enterprise_leads(provider_id);
create index if not exists idx_leads_commission on public.enterprise_leads(commission_paid);
create index if not exists idx_providers_approved on public.enterprise_providers(is_approved);
