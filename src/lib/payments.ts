// ══════════════════════════════════════════════════════════════════════════
// أمرني · طبقة الدفع في الواجهة (آمنة)
// ──────────────────────────────────────────────────────────────────────────
// لا يوجد هنا أي مفتاح سرّي. تبدأ الدفعة باستدعاء الدالة الآمنة على السيرفر
// (paymob-create-payment) التي تنشئ الـ Intention بمفتاح محفوظ في بيئة Supabase
// فقط، ثم نحوّل المتصفح لصفحة Paymob unified checkout بالـ client_secret العام.
// ══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabase'
import { Browser } from '@capacitor/browser'
import { isNativeApp } from './platform'

export interface StartPaymentResult {
  ok: boolean
  error?: string
}

// عنوان Paymob unified checkout (المنطقة السعودية)
const UNIFIED_CHECKOUT = 'https://ksa.paymob.com/unifiedcheckout/'

/**
 * يبدأ دفعة لمهمة محدّدة: ينادي الدالة الآمنة، ثم يحوّل المتصفح لصفحة الدفع.
 * كل التحقق (الملكية، السعر، الحالة) يتم داخل السيرفر — لا نثق بأي مبلغ من العميل.
 */
export async function startTaskPayment(taskId: string): Promise<StartPaymentResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { ok: false, error: 'يجب تسجيل الدخول أولاً' }

  const { data, error } = await supabase.functions.invoke('paymob-create-payment', {
    body: { task_id: taskId },
  })

  if (error) {
    return { ok: false, error: parseInvokeError(error) }
  }
  if (!data?.client_secret || !data?.public_key) {
    return { ok: false, error: (data && data.error) || 'تعذّر بدء عملية الدفع' }
  }

  const url = `${UNIFIED_CHECKOUT}?publicKey=${encodeURIComponent(data.public_key)}` +
    `&clientSecret=${encodeURIComponent(data.client_secret)}`
  if (isNativeApp()) {
    // داخل التطبيق: نفتح بوابة الدفع في متصفح داخلي (يحفظ جلسة الدخول في التطبيق)
    // وعند إغلاقه نعيد تحميل التطبيق ليظهر وضع الدفع المحدَّث (الويب هوك يحدّثه من السيرفر).
    await Browser.addListener('browserFinished', () => {
      Browser.removeAllListeners()
      window.location.reload()
    })
    await Browser.open({ url, presentationStyle: 'fullscreen' })
    return { ok: true }
  }
  window.location.href = url
  return { ok: true }
}

function parseInvokeError(error: unknown): string {
  // functions.invoke يرجّع FunctionsHttpError مع context.json() أحياناً
  const anyErr = error as { message?: string }
  return anyErr?.message || 'تعذّر الاتصال ببوابة الدفع'
}
