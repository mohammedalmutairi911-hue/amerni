-- ═══════════════════════════════════════════════════════════
-- طبقة الإحصائيات المركزية (Central Statistics Service)
-- مصدر حقيقة واحد لكل أرقام الـ Dashboards. كل دالة SECURITY DEFINER
-- وتتحقق من صلاحية المستدعي بنفسها قبل إرجاع أي رقم، وكل الأرقام
-- تُحسب من قاعدة البيانات مباشرة (لا Mock ولا Hardcoded).
-- ═══════════════════════════════════════════════════════════

-- ── 1) إحصائيات لوحة الإدارة (Admin) ──────────────────────────
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'unauthorized';
  end if;

  select jsonb_build_object(
    'users_total',            (select count(*) from public.profiles),
    'users_clients',          (select count(*) from public.profiles where role = 'client'),
    'users_workers_role',     (select count(*) from public.profiles where role = 'worker'),
    'workers_approved',       (select count(*) from public.worker_profiles where is_approved),
    'workers_pending',        (select count(*) from public.worker_profiles where not is_approved),
    'providers_total',        (select count(*) from public.enterprise_providers),
    'providers_approved',     (select count(*) from public.enterprise_providers where is_approved),
    'providers_pending',      (select count(*) from public.enterprise_providers where not is_approved),
    'tasks_total',            (select count(*) from public.tasks),
    'tasks_open',             (select count(*) from public.tasks where status = 'open'),
    'tasks_in_progress',      (select count(*) from public.tasks where status = 'in_progress'),
    'tasks_pending_confirmation', (select count(*) from public.tasks where status = 'pending_confirmation'),
    'tasks_completed',        (select count(*) from public.tasks where status = 'completed'),
    'tasks_cancelled',        (select count(*) from public.tasks where status = 'cancelled'),
    'tasks_disputed',         (select count(*) from public.tasks where status = 'disputed'),
    'tasks_today',            (select count(*) from public.tasks where created_at >= date_trunc('day', now())),
    'tasks_this_week',        (select count(*) from public.tasks where created_at >= date_trunc('week', now())),
    'tasks_this_month',       (select count(*) from public.tasks where created_at >= date_trunc('month', now())),
    'revenue_total',          (select coalesce(round(sum(coalesce(price_final, final_price)) * 0.02, 2), 0)
                                 from public.tasks where status = 'completed'),
    'revenue_pending',        (select coalesce(round(sum(coalesce(price_final, final_price)) * 0.02, 2), 0)
                                 from public.tasks where status = 'pending_confirmation'),
    'ratings_count',          (select count(*) from public.ratings where is_public),
    'ratings_avg',            (select coalesce(round(avg(stars), 2), 0) from public.ratings where is_public),
    'enterprise_leads_total', (select count(*) from public.enterprise_leads),
    'enterprise_leads_open',  (select count(*) from public.enterprise_leads where status = 'open'),
    'enterprise_leads_matched', (select count(*) from public.enterprise_leads where status = 'matched'),
    'enterprise_leads_closed', (select count(*) from public.enterprise_leads where status = 'closed'),
    'messages_total',         (select count(*) from public.task_messages),
    'notifications_total',    (select count(*) from public.notifications),
    'task_files_total',       (select count(*) from public.task_files),
    'generated_at',           now()
  ) into v_result;

  return v_result;
end;
$$;

-- ── 2) إحصائيات لوحة الفرد (Client) — بياناته فقط ──────────────
create or replace function public.get_client_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  select jsonb_build_object(
    'tasks_total',            (select count(*) from public.tasks where user_id = v_uid or client_id = v_uid),
    'tasks_open',             (select count(*) from public.tasks where (user_id = v_uid or client_id = v_uid) and status = 'open'),
    'tasks_active',           (select count(*) from public.tasks where (user_id = v_uid or client_id = v_uid) and status in ('in_progress')),
    'tasks_pending_confirmation', (select count(*) from public.tasks where (user_id = v_uid or client_id = v_uid) and status = 'pending_confirmation'),
    'tasks_completed',        (select count(*) from public.tasks where (user_id = v_uid or client_id = v_uid) and status = 'completed'),
    'tasks_cancelled',        (select count(*) from public.tasks where (user_id = v_uid or client_id = v_uid) and status = 'cancelled'),
    'ratings_given',          (select count(*) from public.ratings where rater_id = v_uid),
    'notifications_unread',   (select count(*) from public.notifications where user_id = v_uid and read = false),
    'generated_at',           now()
  ) into v_result;

  return v_result;
end;
$$;

-- ── 3) إحصائيات لوحة العامل (Worker) — بياناته فقط ─────────────
create or replace function public.get_worker_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  select jsonb_build_object(
    'tasks_active',           (select count(*) from public.tasks where worker_id = v_uid and status in ('in_progress','pending_confirmation')),
    'tasks_completed',        (select count(*) from public.tasks where worker_id = v_uid and status = 'completed'),
    'earnings_total',         (select coalesce(sum(coalesce(price_final, final_price, worker_price)), 0)
                                 from public.tasks where worker_id = v_uid and status = 'completed'),
    'rating_avg',             (select rating from public.worker_profiles where user_id = v_uid),
    'ratings_count',          (select count(*) from public.ratings r join public.tasks t on t.id = r.task_id where t.worker_id = v_uid and r.is_public),
    'is_approved',            (select is_approved from public.worker_profiles where user_id = v_uid),
    'generated_at',           now()
  ) into v_result;

  return v_result;
end;
$$;

-- ── 4) إحصائيات لوحة مزود الخدمة (Enterprise Provider) ─────────
create or replace function public.get_provider_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  select jsonb_build_object(
    'leads_matched',          (select count(*) from public.enterprise_leads where provider_id = v_uid and status = 'matched'),
    'leads_closed',           (select count(*) from public.enterprise_leads where provider_id = v_uid and status = 'closed'),
    'leads_available',        (select count(*)
                                 from public.enterprise_leads l
                                 join public.enterprise_providers p on p.user_id = v_uid
                                 where l.status = 'open'
                                   and l.category = any(p.categories)
                                   and not exists (
                                     select 1 from public.enterprise_lead_exclusions e
                                     where e.lead_id = l.id and e.provider_id = v_uid
                                   )),
    'commission_pending',     (select count(*) from public.enterprise_leads where provider_id = v_uid and status = 'closed' and not coalesce(commission_paid, false)),
    'is_approved',            (select is_approved from public.enterprise_providers where user_id = v_uid),
    'generated_at',           now()
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated;
grant execute on function public.get_client_dashboard_stats() to authenticated;
grant execute on function public.get_worker_dashboard_stats() to authenticated;
grant execute on function public.get_provider_dashboard_stats() to authenticated;

-- ملاحظة: النسخة المطبقة فعلياً على قاعدة البيانات تتضمن أيضاً حقول:
-- get_client_dashboard_stats: spent_total, tasks_disputed
-- get_worker_dashboard_stats: tasks_in_progress, tasks_pending_confirmation, tasks_cancelled,
--   tasks_completed_this_month, earnings_this_month, commission_due, feed_open_tasks
-- get_provider_dashboard_stats: commission_pending
-- (تم تطبيقها عبر migrations: client_stats_add_spent_total, worker_stats_add_month_and_feed)
