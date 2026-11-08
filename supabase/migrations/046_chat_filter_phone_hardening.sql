-- محادثة الطلب: سد ثغرات أرقام الجوال في فلتر الرسائل (السيرفر هو الحماية الفعلية —
-- فلتر الواجهة يقدر أي أحد يتجاوزه بطلب مباشر).
--  1) الأرقام بمسافات/شرطات/نقاط (05 5123 4567، 055-123-4567) كانت تمر — صارت تنمسك.
--  2) الأرقام العربية/الفارسية (٠٥٥…) تتحول لأرقام عادية قبل الفحص.
--  3) استثناء روابط الملفات كان يمرر أي رسالة "تحتوي" الرابط — صار الاستثناء للرسالة
--     اللي هي رابط ملف من تخزين المنصة فقط، واسم الملف (بعد #) ينفحص، ولو فيه رقم
--     ينشال الاسم ويبقى الملف.
--  4) نفس الشي للرسائل الصوتية.
-- روابط قوقل ماب: معرّف المكان والإحداثيات ما تنحسب أرقام، وباقي الرابط ينفحص كامل.

create or replace function public.chat_text_has_contact(p text)
 returns boolean
 language plpgsql
 immutable
 set search_path to 'public', 'pg_temp'
as $function$
declare
  n   text;
  sep constant text := '[\s\-\.\(\)_/\\,،]*';
begin
  if p is null or p = '' then return false; end if;
  n := translate(p, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');

  -- 9 أرقام فأكثر متتالية
  if n ~ '\d{9,}' then return true; end if;
  -- جوال سعودي بأي فواصل: 05xxxxxxxx / 5xxxxxxxx / +966 5xxxxxxxx / 00966…
  if n ~ ('(^|[^\d])((\+|00)' || sep || '966' || sep || '|966' || sep || '|0' || sep || ')?5(' || sep || '\d){8}([^\d]|$)') then return true; end if;
  -- رقم ثابت سعودي 01x xxx xxxx
  if n ~ ('(^|[^\d])0' || sep || '1' || sep || '[1-7](' || sep || '\d){7}([^\d]|$)') then return true; end if;
  -- رقم دولي يبدأ بـ + أو 00 وبعده 8 أرقام فأكثر
  if n ~ ('(\+|(^|[^\d])00)' || sep || '\d(' || sep || '\d){7,}') then return true; end if;
  -- إيميل
  if n ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' then return true; end if;
  -- منصات تواصل وعبارات طلب التواصل خارج المنصة
  if n ~* '(واتس|whatsapp|wa\.me|تيليغرام|تيليجرام|تلغرام|telegram|t\.me/|snapchat|سناب|instagram|انستغرام|انستا|تويتر|twitter)' then return true; end if;
  if n ~* '(تواصل\s*معي\s*على|كلمني\s*على|راسلني\s*على|اتصل\s*(علي|فيني)\s*على)' then return true; end if;
  return false;
end;
$function$;

-- يفك ترميز اسم الملف بعد # بما يكفي للفحص (الأرقام العربية/الفارسية المرمّزة تتحول لأرقام)
create or replace function public.chat_decode_fragment(p text)
 returns text
 language plpgsql
 immutable
 set search_path to 'public', 'pg_temp'
as $function$
declare
  s text := coalesce(p, '');
  i int;
begin
  for i in 0..9 loop
    s := regexp_replace(s, '%D9%A' || i, i::text, 'gi');   -- ٠-٩  U+0660..0669
    s := regexp_replace(s, '%DB%B' || i, i::text, 'gi');   -- ۰-۹  U+06F0..06F9
  end loop;
  s := regexp_replace(s, '%2B', '+', 'gi');
  s := regexp_replace(s, '%40', '@', 'gi');
  s := regexp_replace(s, '%20', ' ', 'gi');
  s := regexp_replace(s, '%[0-9A-F]{2}', ' ', 'gi');        -- باقي الحروف المرمّزة
  return s;
end;
$function$;

create or replace function public.filter_message_content()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_check text := new.content;
  v_frag  text;
begin
  -- رسالة صوتية: "🎤 " + رابط من تخزين المنصة فقط
  if new.content ~ '^🎤 https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/chat-media/[A-Za-z0-9/_.\-]+$' then
    return new;
  end if;

  -- صورة/ملف: الرسالة كلها رابط من تخزين المنصة، واسم الملف اختياري بعد #
  if new.content ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/(chat-media|task-files)/[A-Za-z0-9/_.\-]+(#[^\s]*)?$' then
    v_frag := substring(new.content from '#(.*)$');
    if v_frag is not null and public.chat_text_has_contact(public.chat_decode_fragment(v_frag)) then
      new.content := split_part(new.content, '#', 1);   -- نشيل الاسم ونخلي الملف
    end if;
    return new;
  end if;

  -- رابط قوقل ماب لوحده: معرّف المكان (cid/ftid) ما ينحسب رقم، وباقي الرابط ينفحص
  if new.content ~* '^https?://((www\.|maps\.)?google\.[a-z.]{2,6}/(maps)?[^\s]*|maps\.app\.goo\.gl/[a-z0-9_-]+[^\s]*|goo\.gl/maps/[a-z0-9_-]+[^\s]*)$' then
    v_check := regexp_replace(new.content, '[?&](cid|ftid)=[0-9a-fx:]+', '', 'gi');
    -- الإحداثيات (24.7135517) والزوم (10z) نشيلها، وباقي الرابط يمر على فلتر التواصل كامل
    v_check := regexp_replace(v_check, '-?\d{1,3}\.\d{3,}', ' ', 'g');
    v_check := regexp_replace(v_check, '[!/,]\d+(\.\d+)?[a-z]\b', ' ', 'gi');
    v_check := regexp_replace(v_check, '!\d[a-z]\d+', ' ', 'gi');
    if public.chat_text_has_contact(v_check) then
      new.content := 'تم حذف هذه الرسالة لاحتوائها على معلومات تواصل خارجية.';
      new.is_filtered := true;
    end if;
    return new;
  end if;

  if public.chat_text_has_contact(v_check) then
    new.content := 'تم حذف هذه الرسالة لاحتوائها على معلومات تواصل خارجية.';
    new.is_filtered := true;
  end if;
  return new;
end;
$function$;
