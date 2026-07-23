// نقطة الدخول الرسمية للمنصة هي صفحة الاختيار (Landing gateway).
// شعار الموقع من أي مكان يعود دائماً لهذه الصفحة، بغضّ النظر عن دور المستخدم.
// للأزرار المخصّصة للعودة للوحة (مثل "حسابي" / "لوحتي") نستخدم goToUserHome.

import type { Profile } from '../types'

export type HomePage =
  | 'landing'
  | 'dashboard'
  | 'worker'
  | 'enterprises'
  | 'provider-dashboard'
  | 'admin'

type MaybeProfile = (Profile & { platform?: string }) | null | undefined

// يُرجع الصفحة الرئيسية الخاصة بالمستخدم (لوحته) حسب الدور والمنصة.
// يُستخدم في:
//   - AuthModal بعد login/signup الناجح (توجيه صريح مبرَّر بحدث المصادقة).
//   - أزرار "حسابي" / "لوحتي" المخصّصة داخل الواجهة.
// لا يُستخدم لتنقّل الشعار.
export function getHomePage(profile: MaybeProfile): HomePage {
  if (!profile) return 'landing'
  if (profile.role === 'admin') return 'admin'
  const platform = (profile as any).platform
  if (platform === 'enterprises') {
    return profile.role === 'worker' ? 'provider-dashboard' : 'enterprises'
  }
  return profile.role === 'worker' ? 'worker' : 'dashboard'
}

export type Portal = 'individuals' | 'enterprises'

// المنصة التي ينتمي لها الحساب (افتراضياً الأفراد للحسابات القديمة).
export function profilePlatform(profile: MaybeProfile): Portal {
  return ((profile as any)?.platform === 'enterprises' ? 'enterprises' : 'individuals')
}

// هل يُعتبر المستخدم "مسجّلاً" داخل هذه البوابة؟
// الأدمن هو الاستثناء الوحيد: حساب واحد يصل لكل البوابات.
// أي حساب آخر يُعامل كزائر داخل البوابة التي لا ينتمي لها،
// فيظهر له "تسجيل الدخول / إنشاء حساب" ولا تُعاد استخدام جلسة النظام الآخر.
export function isUserInPortal(profile: MaybeProfile, portal: Portal): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  return profilePlatform(profile) === portal
}

// ── شعار الموقع / "الرئيسية" ──
// المستخدم المسجَّل يعود إلى Home الخاصة بنظامه:
//   - حساب منشآت  → بوابة المنشآت
//   - حساب أفراد   → واجهة الأفراد (وليس شاشة اختيار أفراد/منشآت)
// الزائر أو الأدمن → بوابة الاختيار العامة.
export function goHome(
  navigate: (p: string, opts?: { replace?: boolean }) => void,
  profile?: MaybeProfile,
) {
  const isAdmin = profile?.role === 'admin'

  if (profile && !isAdmin) {
    if (profilePlatform(profile) === 'enterprises') {
      navigate('enterprises')
      return
    }
    // أفراد → Home الأفراد
    navigate('landing')
    try {
      window.history.replaceState(
        { ...(window.history.state || {}), page: 'landing', amerni_mode: 'individuals' },
        '',
      )
    } catch { /* تجاهل بصمت */ }
    return
  }

  // زائر أو أدمن → بوابة الاختيار
  try {
    if ((window.history.state as any)?.amerni_mode) {
      window.history.replaceState({ page: 'landing' }, '', window.location.pathname)
    }
  } catch { /* تجاهل بصمت */ }
  sessionStorage.removeItem('amerni_mode')
  navigate('landing')
}

// ── زر "لوحتي" / "حسابي" ── يوجّه المستخدم للوحته حسب الدور.
// هذا هو "الزر المخصّص للعودة إلى لوحة التحكم" المذكور في متطلبات المنصة.
// لا يُستخدم للشعار.
export function goToUserHome(
  navigate: (p: string, opts?: { replace?: boolean }) => void,
  profile: MaybeProfile,
) {
  const target = getHomePage(profile)
  if (target === 'landing') {
    // زائر بلا حساب — أرسله للـ landing نفسها
    goHome(navigate)
    return
  }
  navigate(target)
}
