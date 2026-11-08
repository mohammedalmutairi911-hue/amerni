-- محادثة الطلب: روابط قوقل ماب من نوع ?cid=1234567890123 كان يمسكها نمط \d{9,}
-- فتنحذف الرسالة كأنها رقم جوال. لو الرسالة رابط خرائط فقط (بدون مسافات)
-- نشيل معرّف المكان (cid/ftid) قبل الفحص — وباقي الرابط يمر على كل الفلاتر
-- كالعادة، فرقم جوال مدسوس داخل الرابط يبقى ينحذف.
create or replace function public.filter_message_content()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
declare
  patterns text[] := array[
    '\d{9,}',
    '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    '(?i)(واتس|whatsapp|تيليغرام|telegram|snapchat|سناب|instagram|انستغرام|تويتر|twitter)',
    '(?i)(تواصل\s*معي\s*على|كلمني\s*على|راسلني\s*على)'
  ];
  p text;
  v_check text := new.content;
begin
  if new.content ~ 'supabase\.co/storage' or new.content ~ '^🎤 https' then
    return new;
  end if;
  if new.content ~* '^https?://((www\.|maps\.)?google\.[a-z.]{2,6}/(maps)?[^\s]*|maps\.app\.goo\.gl/[a-z0-9_-]+[^\s]*|goo\.gl/maps/[a-z0-9_-]+[^\s]*)$' then
    v_check := regexp_replace(new.content, '[?&](cid|ftid)=[0-9a-fx:]+', '', 'gi');
  end if;
  foreach p in array patterns loop
    if v_check ~ p then
      new.content := 'تم حذف هذه الرسالة لاحتوائها على معلومات تواصل خارجية.';
      new.is_filtered := true;
      return new;
    end if;
  end loop;
  return new;
end;
$function$;
