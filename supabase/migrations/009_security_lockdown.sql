-- ═══════════════════════════════════════════════════════
-- أمرني — Migration 009: إغلاق الثغرات الأمنية
-- سد تسريب البيانات الشخصية والحساسة
-- ═══════════════════════════════════════════════════════

-- ── 1) 🚨 profiles: منع قراءة الإيميلات والجوالات للعموم ──
-- الثغرة: read_profiles using (true) تكشف إيميل وجوال كل مستخدم
drop policy if exists "read_profiles" on public.profiles;

-- المسجلون فقط يشوفون أسماء بعض (للمحادثات) — بدون إيميل/جوال نستخدم view
create policy "authenticated_read_profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

-- ── 2) 🚨 worker_profiles: إخفاء الهوية والأرباح ──
-- الثغرة: read_worker_profiles using (true) تكشف رقم الهوية وصورتها والعنوان والأرباح
drop policy if exists "read_worker_profiles" on public.worker_profiles;

-- Public view آمن يعرض فقط الأعمدة غير الحساسة
create or replace view public.workers_public as
  select
    id, user_id, full_name, city, skills, rating,
    completed_tasks, availability_status, is_online,
    is_approved, verification_level, bio, id_verified
  from public.worker_profiles
  where is_approved = true;

grant select on public.workers_public to anon, authenticated;

-- المزود يشوف ملفه كامل + الأدمن يشوف الكل (موجودة أصلاً)
-- الجمهور يستخدم الـ view فقط
create policy "authenticated_read_workers_limited" on public.worker_profiles
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    -- العملاء الذين لديهم مهمة نشطة مع هذا العامل يمكنهم رؤيته
    or exists (
      select 1 from public.tasks t
      where t.worker_id = worker_profiles.user_id
        and (t.user_id = auth.uid() or t.client_id = auth.uid())
    )
  );

-- ── 3) worker_schedule: تقييد القراءة للمسجلين ──
drop policy if exists "read_schedule" on public.worker_schedule;
create policy "authenticated_read_schedule" on public.worker_schedule
  for select using (auth.role() = 'authenticated');

-- ── 4) enterprise_leads: تشديد الإدراج ──
-- منع القراءة بعد الإدراج للزوار (user_id=null leads يشوفها الأدمن فقط)
drop policy if exists "lead_own" on public.enterprise_leads;
create policy "lead_own" on public.enterprise_leads
  for select using (auth.uid() = user_id and user_id is not null);

-- ── 5) audit log: تسجيل عمليات الأدمن الحساسة ──
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references auth.users(id),
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb,
  created_at  timestamptz default now()
);
alter table public.admin_audit_log enable row level security;
create policy "admin_read_audit" on public.admin_audit_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_insert_audit" on public.admin_audit_log
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── 6) منع تغيير الدور الذاتي (privilege escalation) ──
-- الثغرة المحتملة: مستخدم يحدّث role='admin' لنفسه
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer as $$
begin
  if old.role is distinct from new.role then
    -- فقط الأدمن يغير الأدوار
    if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      raise exception 'غير مصرح بتغيير الدور';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ── 7) منع تعديل الحقول المالية من المستخدم ──
create or replace function public.protect_worker_financials()
returns trigger language plpgsql security definer as $$
begin
  -- المستخدم العادي لا يعدل أرباحه أو تقييمه أو حالة الاعتماد بنفسه
  if auth.uid() = new.user_id and not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    new.total_earnings := old.total_earnings;
    new.rating := old.rating;
    new.completed_tasks := old.completed_tasks;
    new.is_approved := old.is_approved;
    new.id_verified := old.id_verified;
    new.verification_level := old.verification_level;
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_financials on public.worker_profiles;
create trigger trg_protect_financials before update on public.worker_profiles
  for each row execute function public.protect_worker_financials();
