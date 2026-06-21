-- ═══════════════════════════════════════════════════════════
-- أمرني — Migration 002: مزامنة شاملة بين الكود وقاعدة البيانات
-- يصلح 7 مشاكل مكتشفة في الفحص الشامل
-- ═══════════════════════════════════════════════════════════

-- ── 1) جدول tasks — إضافة كل الأعمدة الناقصة ──────────────
alter table public.tasks
  add column if not exists client_id        uuid references auth.users(id) on delete cascade,
  add column if not exists city              text,
  add column if not exists deadline          text,  -- نص حر مثل 'أسرع وقت ممكن' أو 'خلال يومين' — ليس timestamp (تأكدنا من NewTaskPage.tsx سطر 287)
  add column if not exists price_suggested   numeric,
  add column if not exists price_final       numeric,
  add column if not exists completion_note   text,
  add column if not exists completion_proof  text,
  add column if not exists referred_by       uuid references auth.users(id);

-- نزامن client_id مع user_id تلقائياً عند الإدراج (الكود يكتب الاثنين بنفس القيمة)
update public.tasks set client_id = user_id where client_id is null and user_id is not null;

-- ── 2) توسعة قيود status المسموحة لتشمل القيم التي يستخدمها الكود فعلياً ──
-- ملاحظة: الفحص الشامل أكد أن الكود (8 مواضع) يستخدم 'open' حصرياً كحالة البداية،
-- و'waiting_for_worker' كانت من نسخة schema أقدم. نبقيها مدعومة لأي بيانات قديمة فقط.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (
  status in (
    'waiting_for_worker',                    -- قيمة قديمة (توافق رجعي فقط)
    'open',                                   -- ✅ القيمة الفعلية المستخدمة في كل الكود الحالي
    'in_progress',
    'pending_confirmation',                  -- العامل سلّم، بانتظار تأكيد العميل
    'completed',
    'cancelled',
    'disputed'
  )
);

-- ترحيل أي صفوف قديمة بحالة waiting_for_worker إلى open لتوحيد القيمة مع الكود الحالي
update public.tasks set status = 'open' where status = 'waiting_for_worker';

-- اجعل 'open' الافتراضي الجديد (يطابق ما يكتبه NewTaskPage.tsx فعلياً)
alter table public.tasks alter column status set default 'open';

-- ── 3) جدول worker_profiles — إضافة الأعمدة الناقصة ───────
alter table public.worker_profiles
  add column if not exists schedule      jsonb default '{}'::jsonb,
  add column if not exists total_tasks   int default 0;

-- نزامن total_tasks مع completed_tasks الموجود مسبقاً (الكود الجديد يستخدم total_tasks)
update public.worker_profiles set total_tasks = completed_tasks where total_tasks = 0;

-- ── 4) جدول task_messages — إضافة عمود is_blocked المستخدم في كل الكود ──
alter table public.task_messages
  add column if not exists is_blocked boolean default false;

-- نزامن العمود القديم is_system_message مع is_blocked الجديد (للتوافق العكسي فقط، الكود الحالي لا يستخدم is_system_message)
-- لا حذف لـ is_system_message حفاظاً على البيانات التاريخية

-- ── 5) فهارس أداء على الأعمدة الجديدة الأكثر استخداماً ────
create index if not exists idx_tasks_client_id   on public.tasks(client_id);
create index if not exists idx_tasks_city         on public.tasks(city);
create index if not exists idx_tasks_referred_by  on public.tasks(referred_by);
create index if not exists idx_tasks_status       on public.tasks(status);

-- ── 6) تحديث سياسات RLS لتشمل client_id كمرادف لـ user_id ──
drop policy if exists "client_own_tasks" on public.tasks;
create policy "client_own_tasks" on public.tasks for all using (
  auth.uid() = user_id or auth.uid() = client_id
);

-- ── 6.1) إصلاح حرج: سياسة رؤية العمال للطلبات كانت تتحقق من 'waiting_for_worker'
--        وهي قيمة لا يكتبها الكود أبداً (يكتب 'open' دائماً) — فكان العمال لا يرون أي طلب!
drop policy if exists "worker_see_tasks" on public.tasks;
create policy "worker_see_tasks" on public.tasks for select using (
  status in ('open', 'waiting_for_worker') or worker_id = auth.uid()
);

-- ── 6.2) إصلاح دالة accept_task لنفس السبب — كانت تتحقق من قيمة لا تحدث أبداً
create or replace function public.accept_task(
  p_task_id uuid, p_worker_id uuid, p_worker_price numeric
) returns text language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.tasks
    where id = p_task_id and status in ('open', 'waiting_for_worker')
  ) then
    return 'not_available';
  end if;
  update public.tasks set
    worker_id = p_worker_id, status = 'in_progress',
    worker_price = p_worker_price, negotiation_status = 'pending',
    updated_at = now()
  where id = p_task_id and status in ('open', 'waiting_for_worker');
  insert into public.notifications (user_id, type, title, body, task_id)
  select coalesce(client_id, user_id), 'task_accepted', 'تم قبول طلبك!', 'عامل بدأ العمل على طلبك.', p_task_id
  from public.tasks where id = p_task_id;
  return 'ok';
end; $$;

-- ── 7) دالة آمنة لتسليم المهمة (تستبدل التحديث المباشر غير الآمن في WorkerDashboard.tsx) ──
create or replace function public.submit_task_completion(
  p_task_id uuid,
  p_price numeric,
  p_note text default null,
  p_proof_url text default null
) returns text language plpgsql security definer as $$
declare v_client_id uuid;
begin
  if not exists (
    select 1 from public.tasks
    where id = p_task_id and worker_id = auth.uid() and status = 'in_progress'
  ) then
    return 'unauthorized_or_invalid_state';
  end if;

  update public.tasks set
    status = 'pending_confirmation',
    price_final = p_price,
    completion_note = p_note,
    completion_proof = p_proof_url,
    updated_at = now()
  where id = p_task_id
  returning coalesce(client_id, user_id) into v_client_id;

  insert into public.task_messages (task_id, sender_id, content, is_blocked)
  values (p_task_id, auth.uid(), '🏁 العامل أعلن إنهاء الطلب — بانتظار تأكيد العميل للاستلام.', false);

  if v_client_id is not null then
    insert into public.notifications (user_id, type, title, body, task_id)
    values (v_client_id, 'task_completed', 'طلبك اكتمل ✅', 'راجع وأكد الاستلام', p_task_id);
  end if;

  return 'ok';
end; $$;
