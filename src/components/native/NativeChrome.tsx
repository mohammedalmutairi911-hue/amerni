// واجهة التطبيق الأصلي (أندرويد/iOS) فقط — الموقع لا يستخدم أي شيء من هذا الملف.
// تعطي شعور التطبيق: ترويسة مضغوطة مع زر رجوع، شريط تبويبات سفلي حسب الدور،
// وقائمة «المزيد» تضم باقي الخيارات (الدعم، الإشعارات، الإحالة، الخروج…).

import { useEffect, useState } from 'react'
import {
  ChevronRight, Home, Users, LifeBuoy, Menu, Briefcase, Shield, Building2, LayoutGrid,
  Bell, Gift, Wallet, LogOut, X, UserPlus, LogIn, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { getAvatar } from '../../lib/supabase'
import { getHomePage, goToUserHome, profilePlatform } from '../../lib/homePage'
import { NotificationBell } from '../ui/NotificationBell'
import { Logo } from '../Logo'

const MORE_EVENT = 'amerni:native-more'
export const openNativeMore = () => window.dispatchEvent(new Event(MORE_EVENT))

const TITLES: Record<string, string> = {
  dashboard: 'لوحتي', worker: 'لوحتي', admin: 'الإدارة', 'admin-enterprises': 'إدارة المنشآت',
  support: 'الدعم', browse: 'تصفّح المنفّذين', bounties: 'الفرص المتاحة', earn: 'اكسب مع أمرني',
  referral: 'دعوة صديق', 'worker-profile': 'ملف المنفّذ', 'notification-settings': 'الإشعارات',
  verify: 'أمرني للتحقق', 'verify-report': 'تقرير التحقق', landing: 'الخدمات',
  enterprises: 'المنشآت', 'provider-dashboard': 'لوحتي',
}

interface Tab { page: string; label: string; icon: any }

function tabsFor(profile: any): Tab[] {
  const home = getHomePage(profile)
  if (profile?.role === 'admin') return [
    { page: 'admin', label: 'الإدارة', icon: Shield },
    { page: 'admin-enterprises', label: 'المنشآت', icon: Building2 },
    { page: 'support', label: 'الدعم', icon: LifeBuoy },
  ]
  if (profilePlatform(profile) === 'enterprises') return [
    { page: home, label: 'الرئيسية', icon: Home },
    { page: 'support', label: 'الدعم', icon: LifeBuoy },
  ]
  if (profile?.role === 'worker') return [
    { page: 'worker', label: 'لوحتي', icon: Home },
    { page: 'bounties', label: 'الفرص', icon: Briefcase },
    { page: 'support', label: 'الدعم', icon: LifeBuoy },
  ]
  return [
    { page: 'dashboard', label: 'الرئيسية', icon: Home },
    { page: 'landing', label: 'الخدمات', icon: LayoutGrid },
    { page: 'browse', label: 'المنفّذون', icon: Users },
    { page: 'support', label: 'الدعم', icon: LifeBuoy },
  ]
}

// صفحات لها شريطها السفلي الخاص (أقسام اللوحة) — لا نكرّر الشريط فوقها
const OWN_BAR_PAGES = ['dashboard', 'worker', 'enterprises', 'provider-dashboard', 'lead-detail']
// صفحات بلا شريط تبويبات (دخول/تسجيل/ضيف)
const NO_BAR_PAGES = ['landing', 'join', 'verify']

export function nativeTabBarVisible(page: string, profile: any, user: any) {
  if (!user || !profile) return false
  if (OWN_BAR_PAGES.includes(page)) return false
  if (page === 'landing' && profile.role !== 'admin' && profilePlatform(profile) === 'individuals' && profile.role === 'client') return true
  return !NO_BAR_PAGES.includes(page)
}

// ───────────────────────── الترويسة العلوية ─────────────────────────
export function NativeTopBar() {
  const { profile } = useAuth()
  const { page, navigate } = useApp()
  const tabs = tabsFor(profile)
  const isRoot = tabs.some(t => t.page === page)

  const back = () => {
    if (window.history.length > 1) window.history.back()
    else goToUserHome(navigate, profile)
  }

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 px-2 flex items-center">
        <div className="w-12 flex justify-start">
          {!isRoot ? (
            <button onClick={back} aria-label="رجوع" className="w-11 h-11 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100">
              <ChevronRight size={24} />
            </button>
          ) : (
            <Logo size={26} textOnly={false} className="pr-2" />
          )}
        </div>
        <h1 className="flex-1 text-center text-base font-bold text-slate-900 truncate">{TITLES[page] || 'أمرني'}</h1>
        <div className="w-12 flex justify-end">
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

// ───────────────────────── الشريط السفلي ─────────────────────────
export function NativeTabBar() {
  const { user, profile } = useAuth()
  const { page, navigate } = useApp()
  const visible = nativeTabBarVisible(page, profile, user)

  useEffect(() => {
    document.documentElement.classList.toggle('native-tabbed', visible)
    return () => document.documentElement.classList.remove('native-tabbed')
  }, [visible])

  if (!visible) return null
  const tabs = tabsFor(profile)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      dir="rtl"
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ page: p, label, icon: Icon }) => {
          const active = page === p
          return (
            <button key={p} onClick={() => navigate(p)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${active ? 'text-primary-600' : 'text-slate-400'}`}>
              {active && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-primary-500" />}
              <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
              <span className={`text-[11px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          )
        })}
        <button onClick={openNativeMore} className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-400">
          <Menu size={22} strokeWidth={1.9} />
          <span className="text-[11px] font-medium">المزيد</span>
        </button>
      </div>
    </nav>
  )
}

// زر «المزيد» يُدرج داخل أشرطة اللوحات الموجودة (مكان زر الخروج في التطبيق)
export function NativeMoreButton({ className = '' }: { className?: string }) {
  return (
    <button onClick={openNativeMore} className={className}>
      <Menu size={20} />
      <span className="text-[10px] font-medium">المزيد</span>
    </button>
  )
}

// ───────────────────────── قائمة «المزيد» ─────────────────────────
export function NativeMoreSheet() {
  const { user, profile, signOut } = useAuth()
  const { navigate } = useApp()
  const [open, setOpen] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)

  useEffect(() => {
    const h = () => setOpen(true)
    window.addEventListener(MORE_EVENT, h)
    return () => window.removeEventListener(MORE_EVENT, h)
  }, [])

  if (!open || !user || !profile) return null
  const close = () => { setOpen(false); setConfirmOut(false) }
  const go = (p: string) => { close(); navigate(p) }
  const isAdmin = profile.role === 'admin'
  const isEnt = profilePlatform(profile) === 'enterprises'
  const isWorker = profile.role === 'worker'

  const items: { icon: any; label: string; page: string; show: boolean }[] = [
    { icon: Home, label: 'حسابي', page: getHomePage(profile), show: true },
    { icon: Users, label: 'تصفّح المنفّذين', page: 'browse', show: !isEnt && (isAdmin || !isWorker) },
    { icon: Briefcase, label: 'الفرص المتاحة', page: 'bounties', show: !isEnt && !isAdmin && isWorker },
    { icon: Sparkles, label: 'اكسب مع أمرني', page: 'earn', show: !isEnt && !isAdmin && !isWorker },
    { icon: Gift, label: 'دعوة صديق', page: 'referral', show: !isEnt && !isAdmin },
    { icon: Shield, label: 'لوحة الإدارة', page: 'admin', show: isAdmin },
    { icon: Building2, label: 'إدارة المنشآت', page: 'admin-enterprises', show: isAdmin },
    { icon: Wallet, label: 'أمرني للتحقق', page: 'verify', show: !isEnt && !isAdmin },
    { icon: LifeBuoy, label: 'الدعم والمساعدة', page: 'support', show: true },
    { icon: Bell, label: 'إعدادات الإشعارات', page: 'notification-settings', show: true },
  ]

  return (
    <div className="fixed inset-0 z-[120]" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/50" onClick={close} />
      <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto native-sheet-in"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <img src={profile.avatar_url || getAvatar(profile.full_name)} className="w-12 h-12 rounded-full" alt="" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{profile.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={close} aria-label="إغلاق" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {!confirmOut ? (
          <div className="p-3">
            {items.filter(i => i.show).map(({ icon: Icon, label, page }) => (
              <button key={page + label} onClick={() => go(page)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-700 active:bg-slate-100 text-right">
                <Icon size={20} className="text-primary-500" />
                <span className="flex-1 font-medium">{label}</span>
              </button>
            ))}
            <button onClick={() => setConfirmOut(true)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-600 active:bg-red-50 text-right mt-1">
              <LogOut size={20} />
              <span className="flex-1 font-medium">تسجيل الخروج</span>
            </button>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="font-bold text-slate-900 mb-1">تسجيل الخروج؟</p>
            <p className="text-sm text-slate-500 mb-5">راح تحتاج تسجّل دخولك مرة ثانية.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOut(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium">إلغاء</button>
              <button onClick={async () => { close(); await signOut(); navigate('landing') }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold">خروج</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────── شاشة الترحيب للزائر ─────────────────────────
export function NativeWelcome({ onBrowse }: { onBrowse: () => void }) {
  const { openAuth, navigate } = useApp()
  return (
    <div className="min-h-screen-safe bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col" dir="rtl"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="bg-white rounded-3xl p-5 shadow-2xl mb-6"><Logo size={64} /></div>
        <h1 className="text-3xl font-black mb-3">أمرني</h1>
        <p className="text-primary-100 leading-relaxed max-w-xs">عندك شي تبي أحد يسويه؟ اكتب طلبك وبتلقى شخص يخلّصه لك بكل سهولة.</p>
      </div>
      <div className="px-6 pb-8 space-y-3">
        <button onClick={() => openAuth('signup', 'individuals')}
          className="w-full bg-secondary-500 text-slate-900 font-black py-4 rounded-2xl text-base flex items-center justify-center gap-2 active:opacity-80">
          <UserPlus size={20} /> إنشاء حساب
        </button>
        <button onClick={() => openAuth('login', 'individuals')}
          className="w-full bg-white/10 border border-white/25 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 active:opacity-80">
          <LogIn size={20} /> تسجيل الدخول
        </button>
        <div className="flex gap-3 pt-1">
          <button onClick={() => navigate('enterprises')} className="flex-1 text-sm text-primary-100 py-3 rounded-xl bg-white/5 active:opacity-80">بوابة المنشآت</button>
          <button onClick={() => navigate('join')} className="flex-1 text-sm text-primary-100 py-3 rounded-xl bg-white/5 active:opacity-80">سجّل كمنفّذ</button>
        </div>
        <button onClick={onBrowse} className="w-full text-sm text-primary-200 underline underline-offset-4 py-2">تصفّح الخدمات أولاً</button>
      </div>
    </div>
  )
}
