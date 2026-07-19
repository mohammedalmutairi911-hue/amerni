-- تحويل المنشآت لسوق مفتوح: الطلب ينزل فوراً → كل مزودي الفئة → أول من يقبل
alter table public.enterprise_leads drop constraint if exists enterprise_leads_status_check;
alter table public.enterprise_leads add constraint enterprise_leads_status_check check (status in ('open','matched','closed','cancelled'));
update public.enterprise_leads set status='open' where status in ('new','reviewing');
create table if not exists public.enterprise_lead_exclusions (
  lead_id uuid references public.enterprise_leads(id) on delete cascade,
  provider_id uuid references auth.users(id) on delete cascade,
  excluded_at timestamptz default now(), primary key (lead_id, provider_id));
alter table public.enterprise_lead_exclusions enable row level security;
create policy "excl_read" on public.enterprise_lead_exclusions for select using (true);
-- RLS: company_own_leads + provider_marketplace_leads + دوال provider_accept_lead / company_change_provider
-- (موثقة بالكامل في القاعدة عبر MCP)
