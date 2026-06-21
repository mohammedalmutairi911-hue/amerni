import { supabase } from './supabase'

// فريق تحليل البيانات: تتبع خفيف الوزن للأحداث المهمة في رحلة المستخدم
// (funnel) — يُستخدم لاحقاً لفهم نقاط التسرّب وأكثر الفئات طلباً
export async function trackEvent(
  eventName: string,
  userId?: string | null,
  metadata: Record<string, any> = {}
) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId || null,
      metadata,
    })
  } catch {
    // فشل التتبع لا يجب أن يكسر أي تجربة مستخدم فعلية — صامت تماماً
  }
}
