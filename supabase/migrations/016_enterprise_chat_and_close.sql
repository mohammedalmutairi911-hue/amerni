-- شات المنشآت + إغلاق الطلب
create table if not exists public.enterprise_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.enterprise_leads(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('company','provider','admin')),
  content text not null,
  is_system boolean default false,
  created_at timestamptz default now()
);
alter table public.enterprise_messages enable row level security;
create policy "ent_msg_participants" on public.enterprise_messages for select using (
  exists (select 1 from public.enterprise_leads l where l.id = lead_id and (l.user_id = auth.uid() or l.provider_id = auth.uid()))
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "ent_msg_send" on public.enterprise_messages for insert with check (
  exists (select 1 from public.enterprise_leads l where l.id = lead_id and (l.user_id = auth.uid() or l.provider_id = auth.uid()))
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create index if not exists idx_ent_msg_lead on public.enterprise_messages(lead_id, created_at);
-- دالة close_enterprise_lead موثّقة في القاعدة (SECURITY DEFINER)
