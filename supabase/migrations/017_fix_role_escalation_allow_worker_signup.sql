-- إصلاح trigger تصعيد الأدوار: كان يمنع تسجيل العمال الجدد
-- السماح بترقية النفس من client إلى worker فقط، منع admin
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer as $$
begin
  if old.role is distinct from new.role then
    if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      return new;
    end if;
    if auth.uid() = new.id and old.role = 'client' and new.role = 'worker' then
      return new;
    end if;
    raise exception 'غير مصرح بتغيير الدور';
  end if;
  return new;
end; $$;
