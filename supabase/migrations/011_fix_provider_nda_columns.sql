-- إصلاح أعمدة NDA المفقودة في enterprise_providers
alter table public.enterprise_providers
  add column if not exists nda_accepted boolean default false,
  add column if not exists nda_accepted_at timestamptz,
  add column if not exists provider_id uuid;
alter table public.enterprise_leads
  add column if not exists matched_provider_id uuid references public.enterprise_providers(id) on delete set null;
