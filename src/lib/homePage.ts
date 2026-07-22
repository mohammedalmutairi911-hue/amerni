// Helper واحد مسؤول عن تحديد الصفحة الرئيسية الصحيحة حسب دور المستخدم ومنصته.
// يُستخدم من جميع شعارات "أمرني" في التطبيق حتى يذهب المستخدم دائماً للمكان الصحيح
// عند الضغط على الشعار، بدلاً من التوجيه الثابت إلى 'landing'.
//
// قواعد التنقل (طبقاً لطلب المستخدم):
//   - زائر (غير مسجل)                                → landing (الصفحة الرئيسية العامة)
//   - admin                                          → admin
//   - platform = 'enterprises' + role = 'client'     → enterprises   (لوحة المنشآت)
//   - platform = 'enterprises' + role = 'worker'     → provider-dashboard (لوحة مزود المنشآت)
//   - platform = 'individuals' + role = 'client'     → dashboard     (لوحة الأفراد)
//   - platform = 'individuals' + role = 'worker'     → worker        (لوحة العامل)
//
// ملاحظة: نستخدم loose typing لأن Profile لا يحوي platform في التايبس الحالية،
// لكن الحقل موجود فعلياً في قاعدة البيانات (يُشار له في App.tsx بنفس الأسلوب).

import type { Profile } from '../types'

export type HomePage =
  | 'landing'
  | 'dashboard'
  | 'worker'
  | 'enterprises'
  | 'provider-dashboard'
  | 'admin'

type MaybeProfile = (Profile & { platform?: string }) | null | undefined

export function getHomePage(profile: MaybeProfile): HomePage {
  // زائر → الصفحة الرئيسية العامة
  if (!profile) return 'landing'

  // أدمن → لوحة الأدمن دائماً (بغض النظر عن platform)
  if (profile.role === 'admin') return 'admin'

  const platform = (profile as any).platform

  // مستخدم منصة المنشآت
  if (platform === 'enterprises') {
    return profile.role === 'worker' ? 'provider-dashboard' : 'enterprises'
  }

  // مستخدم منصة الأفراد (الافتراضية)
  return profile.role === 'worker' ? 'worker' : 'dashboard'
}

// دالة مساعدة تجمع الحساب + التنقل + تنظيف حالة الـ gateway (amerni_mode)
// عند العودة للـ landing فقط (زائر). لا تُعدّل هذه الحالة لبقية الحالات.
export function goHome(
  navigate: (p: string, opts?: { replace?: boolean }) => void,
  profile: MaybeProfile,
) {
  const target = getHomePage(profile)
  if (target === 'landing') {
    // نظّف mode المخزّن حتى يعود الزائر لشاشة اختيار الوجهة (أفراد/منشآت)
    sessionStorage.removeItem('amerni_mode')
  }
  navigate(target)
}
