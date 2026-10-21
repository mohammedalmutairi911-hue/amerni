-- سحب صلاحية التنفيذ العامة عن دوال SECURITY DEFINER وإبقائها للمسجّلين فقط،
-- وقفل دوال الـ triggers والدوال الداخلية عن الجميع.
do $$
declare r record;
begin
  for r in
    select p.oid, p.proname,
           format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) sig,
           p.prorettype::regtype::text ret
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    if r.ret not in ('trigger','event_trigger')
       and r.proname not in ('admin_hard_delete_user','admin_write_audit','payment_mark_paid','payment_mark_failed') then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
    if r.proname in ('is_admin','payments_is_admin','is_super_admin','get_platform_stats','notify_admins_new_worker') then
      execute format('grant execute on function %s to anon', r.sig);
    end if;
  end loop;
end $$;

alter function public.confirm_task_completion(uuid) set search_path = public, pg_temp;

drop policy if exists worker_see_tasks on public.tasks;
create policy worker_see_tasks on public.tasks for select to authenticated
  using (status in ('open','waiting_for_worker') or worker_id = auth.uid());
