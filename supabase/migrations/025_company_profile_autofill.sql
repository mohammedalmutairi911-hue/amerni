-- بروفايل الشركة المحفوظ للتعبئة التلقائية (مبني على أفضل ممارسات Thumbtack/Greenhouse)
create table if not exists public.company_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text, contact_name text, contact_phone text, company_size text,
  updated_at timestamptz default now());
alter table public.company_profiles enable row level security;
create policy "own_company_profile" on public.company_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- trigger upsert_company_profile يحفظ البيانات تلقائياً عند أول طلب (موثق بالكامل في القاعدة)
