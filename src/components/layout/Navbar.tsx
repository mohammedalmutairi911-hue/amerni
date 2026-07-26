import { Logo } from '../Logo'
import { useState, useRef, useEffect } from 'react'
import { LogOut, LayoutDashboard, Shield, ChevronDown, Users, Building2, Bell } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { getAvatar } from '../../lib/supabase'
import { goHome, goToUserHome, isUserInPortal } from '../../lib/homePage'

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { navigate, openAuth } = useApp()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // هل المستخدم عضو في بوابة الأفراد؟ (الأدمن استثناء يصل للجميع)
  // حساب المنشآت داخل بوابة الأفراد يُعامل كزائر: لا نعيد استخدام جلسته.
  const inPortal = !!(user && profile && isUserInPortal(profile, 'individuals'))

  // إغلاق قائمة الحساب عند الضغط خارجها (كانت تبقى مفتوحة)
  useEffect(() => {
    if (!dropOpen) return
    const onDown = (e: Event) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [dropOpen])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-slate-50/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo — يذهب دائماً للصفحة الرئيسية المناسبة حسب دور المستخدم */}
        <button onClick={() => goHome(navigate, profile)} className="text-xl font-black text-primary-400">
          <Logo size={28} />
        </button>

        {!inPortal && (
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-slate-900 transition-colors">كيف تشتغل</button>
            <button onClick={() => scrollTo('features')} className="hover:text-slate-900 transition-colors">المميزات</button>
            <button onClick={() => navigate('enterprises')} className="flex items-center gap-1.5 text-primary-500 font-semibold hover:text-primary-600 transition-colors">
              <Building2 size={14} />
              <span>المنشآت</span>
            </button>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {inPortal && profile ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <img src={profile.avatar_url || getAvatar(profile.full_name)} className="w-7 h-7 rounded-full" alt="" />
                <span className="text-sm block max-w-[7rem] sm:max-w-none truncate">{profile.full_name}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                    <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                      profile.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      profile.role === 'worker' ? 'bg-primary-500/20 text-primary-400' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {profile.role === 'admin' ? 'مدير' : profile.role === 'worker' ? 'عامل' : 'عميل'}
                    </span>
                  </div>
                  <div className="p-1">
                    {/* "حسابي" — الزر المخصّص للعودة للوحة التحكم. يظهر لكل الأدوار بما فيها الأدمن (goToUserHome يوجّهه تلقائياً إلى 'admin'). */}
                    <button onClick={() => { goToUserHome(navigate, profile); setDropOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <LayoutDashboard size={15} /> حسابي
                    </button>
                    {/* "تصفح العمال" — خاص بمنصة الأفراد فقط (browse تصفّح العمال الأفراد) */}
                    {(profile.role === 'client' || profile.role === 'admin') && (profile as any).platform !== 'enterprises' && (
                      <button onClick={() => { navigate('browse'); setDropOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Users size={15} /> تصفح العمال
                      </button>
                    )}
                    {profile.role === 'admin' && (
                      <button onClick={() => { navigate('admin'); setDropOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Shield size={15} /> الإدارة
                      </button>
                    )}
                    {/* رابط المنشآت — يُظهَر فقط لمستخدمي الأفراد (لتصفح القسم) والأدمن، مخفي لمن هو أصلاً في المنشآت.
                        للأدمن: يفتح لوحة إدارة المنشآت (admin-enterprises) وليس السوق العام. */}
                    {(profile as any).platform !== 'enterprises' && (
                      <button onClick={() => { navigate(profile.role === 'admin' ? 'admin-enterprises' : 'enterprises'); setDropOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary-500 hover:bg-primary-50 rounded-lg transition-colors font-medium">
                        <Building2 size={15} /> {profile.role === 'admin' ? 'إدارة المنشآت' : 'المنشآت'}
                      </button>
                    )}
                    <button onClick={() => { navigate('notification-settings'); setDropOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Bell size={15} /> الإشعارات
                    </button>
                    <button onClick={() => { signOut(); setDropOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <LogOut size={15} /> خروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => openAuth('login')}
                className="text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 transition-colors">
                دخول
              </button>
              <button onClick={() => openAuth('signup')}
                className="text-sm bg-primary-500 text-white font-bold px-4 py-1.5 rounded-lg hover:bg-primary-600 transition-colors">
                سجّل
              </button>
              <button onClick={() => navigate('join')}
                className="text-sm bg-secondary-500 text-slate-900 font-bold px-4 py-1.5 rounded-lg hover:bg-secondary-600 transition-colors hidden sm:block">
                سجّل كمزود خدمة
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
