-- 041: رفع عمولة الأفراد من 2% إلى 5% في دوال قاعدة البيانات
-- تُنفَّذ يدوياً من Supabase SQL Editor (موافقة صاحب المنصة).
-- تعيد إنشاء 4 دوال بنفس تعريفها الحالي مع استبدال 0.02 ← 0.05 فقط.
do $$
declare f text; def text;
begin
  foreach f in array array['confirm_task_completion','get_admin_dashboard_stats','get_worker_dashboard_stats','payment_create_request']
  loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = f and p.prokind = 'f';
    if def is null then raise exception 'function % not found', f; end if;
    execute replace(def, '0.02', '0.05');
  end loop;
end $$;
