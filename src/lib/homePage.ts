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

// ── شعار الموقع ── يعود دائماً لصفحة الـ Landing (البوابة الرسمية).
// السلوك: يمسح mode الاختيار المخزّن (أفراد/منشآت) حتى تظهر البوابة من جديد.
// المعامل الثاني (_profile) موجود للتوافق الخلفي فقط ولا يؤثّر على الوجهة.
export function goHome(
  navigate: (p: string, opts?: { replace?: boolean }) => void,
  _profile?: MaybeProfile,
) {
  // امسح mode المحفوظ في history state إن وُجد
  try {
    if ((window.history.state as any)?.amerni_mode) {
      window.history.replaceState({}, '', window.location.pathname)
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
