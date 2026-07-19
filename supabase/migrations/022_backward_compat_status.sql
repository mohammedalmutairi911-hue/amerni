-- توافق خلفي: قبول new/reviewing وتحويلها لـ open (يمنع خطأ النسخة القديمة)
alter table public.enterprise_leads drop constraint if exists enterprise_leads_status_check;
alter table public.enterprise_leads add constraint enterprise_leads_status_check
  check (status in ('open','matched','closed','cancelled','new','reviewing'));
create or replace function public.normalize_lead_status()
returns trigger language plpgsql as $$
begin
  if new.status in ('new','reviewing') then new.status := 'open'; end if;
  return new;
end; $$;
drop trigger if exists trg_normalize_lead_status on public.enterprise_leads;
create trigger trg_normalize_lead_status before insert on public.enterprise_leads
  for each row execute function public.normalize_lead_status();
