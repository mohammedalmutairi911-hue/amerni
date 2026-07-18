-- ═══════════════════════════════════════════
-- أمرني — Migration 007: أمان وجودة المنشآت
-- ═══════════════════════════════════════════

-- ── 1) Content filter على enterprise_leads ──
create or replace function public.enforce_content_filter_enterprise()
returns trigger language plpgsql as $$
declare
  v_text text;
  v_pattern text := '(حشيش|ماريجوانا|كوكايين|هيروين|مخدر|كريستال|قنب|كبتاغون|ترامادول|' ||
    'دعارة|بغاء|عاهرة|مومس|زانية|بورن|قحبة|' ||
    'خمر|كحول|بيرة|ويسكي|فودكا|نبيذ|مسكر|' ||
    'سلاح|مسدس|بندقية|قنبلة|متفجر|ذخيرة|رشاش|' ||
    'احتيال|تزوير|اختراق|سرقة بيانات|هكر موقع)';
begin
  v_text := coalesce(new.company_name,'') || ' ' ||
            coalesce(new.contact_name,'') || ' ' ||
            coalesce(new.description,'');
  if v_text ~* v_pattern then
    raise exception 'المحتوى يخالف سياسة المنصة — لا يمكن إرسال الطلب';
  end if;
  return new;
end; $$;

drop trigger if exists trg_filter_enterprise on public.enterprise_leads;
create trigger trg_filter_enterprise before insert on public.enterprise_leads
  for each row execute function public.enforce_content_filter_enterprise();

-- ── 2) حد أقصى للطول ──
alter table public.enterprise_leads
  drop constraint if exists enterprise_desc_length,
  add constraint enterprise_desc_length check (char_length(description) between 10 and 3000);

alter table public.enterprise_leads
  drop constraint if exists enterprise_company_length,
  add constraint enterprise_company_length check (char_length(company_name) between 2 and 200);

-- ── 3) Rate limiting — حد أقصى 5 طلبات في الساعة من نفس الإيميل ──
create or replace function public.check_enterprise_rate_limit()
returns trigger language plpgsql as $$
begin
  if (
    select count(*) from public.enterprise_leads
    where contact_email = new.contact_email
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'تم تجاوز الحد الأقصى للطلبات — حاول مجدداً بعد ساعة';
  end if;
  return new;
end; $$;

drop trigger if exists trg_enterprise_rate on public.enterprise_leads;
create trigger trg_enterprise_rate before insert on public.enterprise_leads
  for each row execute function public.check_enterprise_rate_limit();

-- ── 4) updated_at auto-update ──
create or replace function public.update_enterprise_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_enterprise_updated_at on public.enterprise_leads;
create trigger trg_enterprise_updated_at before update on public.enterprise_leads
  for each row execute function public.update_enterprise_updated_at();

-- ── 5) Index على contact_email للـ rate limiting ──
create index if not exists idx_enterprise_email on public.enterprise_leads(contact_email);
create index if not exists idx_enterprise_status on public.enterprise_leads(status);
create index if not exists idx_enterprise_created on public.enterprise_leads(created_at desc);
