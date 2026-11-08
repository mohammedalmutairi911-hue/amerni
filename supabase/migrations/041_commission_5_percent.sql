-- 041: رفع عمولة الأفراد من 2% إلى 5% في دوال قاعدة البيانات
-- طُبّق على الإنتاج 2026-11-08 (مع تعديل نص "عمولة ١٪" إلى ٥٪ في close_enterprise_lead).
-- الأفراد: 4 دوال (0.02 ← 0.05). المنشآت: close_enterprise_lead (0.01 ← 0.05).
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

do $$
declare def text;
begin
  select pg_get_functiondef(p.oid) into def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'close_enterprise_lead' and p.prokind = 'f';
  if def is null then raise exception 'function close_enterprise_lead not found'; end if;
  execute replace(def, 'p_contract_value*0.01', 'p_contract_value*0.05');
end $$;
