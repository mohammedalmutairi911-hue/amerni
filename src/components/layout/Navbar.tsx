import { useState } from 'react'
import { LogOut, LayoutDashboard, Briefcase, Shield, Bell, Menu, X, ChevronDown, Users, Gift } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { getAvatar } from '../../lib/supabase'

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { navigate, openAuth, page } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#080808]/90 backdrop-blur border-b border-zinc-900">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('landing')} className="text-xl font-black text-amber-400">
          أمرني
        </button>

        {/* Desktop links - only on landing */}
        {!user && (
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors">كيف تشتغل</button>
            <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">المميزات</button>
            <button onClick={() => scrollTo('trust')} className="hover:text-white transition-colors">الثقة والأمان</button>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && profile ? (
            <div className="relative">
              <button
                onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <img src={profile.avatar_url || getAvatar(profile.full_name)} className="w-7 h-7 rounded-full" alt="" />
                <span className="text-sm hidden sm:block">{profile.full_name}</span>
                <ChevronDown size={14} className="text-zinc-500" />
              </button>

              {dropOpen && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm font-medium">{profile.full_name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                    <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                      profile.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      profile.role === 'worker' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {profile.role === 'admin' ? 'مدير' : profile.role === 'worker' ? 'عامل' : 'عميل'}
                    </span>
                  </div>
                  <div className="p-1">
                    {(profile.role === 'client' || profile.role === 'admin') && (
                      <>
                        <button onClick={() => { navigate('dashboard'); setDropOpen(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                          <LayoutDashboard size={15} /> حسابي
                        </button>
                        <button onClick={() => { navigate('browse'); setDropOpen(false) }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                          <Users size={15} /> تصفح العمال
                        </button>
                      </>
                    )}
                    {profile.role === 'worker' && (
                      <button onClick={() => { navigate('worker'); setDropOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Briefcase size={15} /> مهامي
                      </button>
                    )}
                    {profile.role === 'admin' && (
                      <button onClick={() => { navigate('admin'); setDropOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                        <Shield size={15} /> الإدارة
                      </button>
                    )}
                    <button onClick={() => { signOut(); setDropOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
                      <LogOut size={15} /> خروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => openAuth('login')}
                className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
                دخول
              </button>
              <button onClick={() => openAuth('signup')}
                className="text-sm bg-amber-500 text-black font-bold px-4 py-1.5 rounded-lg hover:bg-amber-400 transition-colors">
                سجّل
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
