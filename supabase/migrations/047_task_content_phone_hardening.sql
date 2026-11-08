-- وصف/عنوان الطلب: نفس فحص المحادثة (046) — أرقام بمسافات/شرطات، أرقام عربية، +966…
-- قبل كان الوصف بس ويمسك 9 أرقام متتالية فقط، والعنوان ما ينفحص أبداً.
-- الكلمات القديمة (جوال/تلفون/اتصل بي…) باقية مثل ما كانت.
create or replace function public.filter_task_content()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v text := coalesce(new.title, '') || E'\n' || coalesce(new.description, '');
begin
  if public.chat_text_has_contact(v)
     or v ~* '(تواصل معي|راسلني|اتصل بي|ارسل لي|تلفون|جوال|موبايل)' then
    raise exception 'يحتوي الطلب على معلومات تواصل خارجية غير مسموحة — اكتب الطلب بدون أرقام أو حسابات تواصل، والتواصل يكون داخل محادثة الطلب';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_filter_task_content on public.tasks;
create trigger trg_filter_task_content
  before insert or update of description, title on public.tasks
  for each row execute function public.filter_task_content();
