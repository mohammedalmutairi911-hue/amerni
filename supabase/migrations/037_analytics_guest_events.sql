-- السماح للزوار غير المسجلين بتسجيل أحداث القمع (landing_view / request_started)
-- بدون هذه السياسة كان insert يفشل بصمت لأن auth.uid() = user_id لا تتحقق مع user_id = null.
-- ملاحظة: عمود قاعدة الإنتاج هو event_type (وليس event_name كما في 002) — العميل يكتب event_type.
-- مقيّدة: إدراج فقط، user_id يجب أن يكون null، أسماء أحداث محددة، وحجم metadata محدود.
create policy analytics_events_insert_guest on public.analytics_events
  for insert to anon, authenticated
  with check (
    user_id is null
    and event_type in ('landing_view', 'request_started')
    and octet_length(metadata::text) < 1000
  );
