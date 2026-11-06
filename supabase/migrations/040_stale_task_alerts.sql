-- 040: تنبيه تلقائي للطلبات المفتوحة التي مر عليها ساعتان بدون قبول
--  - يُنبَّه الأدمن (فيصل الإشعار عبر trg_send_push الموجود)
--  - يُرسل للعميل «نتابع طلبك»
-- لا تغيير في الجداول. يُنفَّذ مرة واحدة من Supabase SQL Editor بعد مراجعته.

create extension if not exists pg_cron;

create or replace function public.alert_stale_tasks()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  t record;
  n integer := 0;
begin
  for t in
    select id, title, city, category, coalesce(client_id, user_id) as owner_id, created_at
    from public.tasks
    where status = 'open'
      and worker_id is null
      and created_at <= now() - interval '2 hours'
      and created_at >  now() - interval '48 hours'
      and not exists (
        select 1 from public.notifications x
        where x.task_id = tasks.id and x.type = 'stale_task'
      )
    order by created_at
    limit 20
  loop
    -- للأدمن
    insert into public.notifications (user_id, type, title, body, task_id)
    select p.id, 'stale_task', '⏳ طلب ينتظر رد',
           'طلب "' || t.title || '" (' || coalesce(t.city, '') || ' - ' || coalesce(t.category, '') || ') بدون قبول من ساعتين',
           t.id
    from public.profiles p
    where p.role = 'admin';

    -- للعميل
    if t.owner_id is not null then
      insert into public.notifications (user_id, type, title, body, task_id)
      values (t.owner_id, 'task_followup', 'نتابع طلبك',
              'طلبك "' || t.title || '" لسا ينتظر منفّذ، وفريق أمرني يتابعه ويدوّر لك على الأنسب.',
              t.id);
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- مو للمستخدمين: يشغّله الجدولة فقط
revoke all on function public.alert_stale_tasks() from public, anon, authenticated;

-- كل ١٥ دقيقة (يُعاد جدولته بأمان لو نُفّذ الملف مرتين)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'alert-stale-tasks';
    perform cron.schedule('alert-stale-tasks', '*/15 * * * *', 'select public.alert_stale_tasks()');
  end if;
end $$;
