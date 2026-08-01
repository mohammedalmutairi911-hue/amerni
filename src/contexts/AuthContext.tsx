import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

interface AuthCtx {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, role: string, platform?: string) => Promise<{ error: any }>
  signUpPlatform?: string
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile(data)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    // Timeout safety for mobile - max 8 seconds loading
    const timeout = setTimeout(() => { setLoading(false) }, 8000)
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string, role: string, platform: string = 'individuals') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `https://amerniksa.com?platform=${platform}`,
        data: { full_name: fullName, role, platform }
      }
    })
    if (!error && data.user) {
      // TikTok Pixel - تسجيل ناجح
      try { (window as any).ttq?.track('CompleteRegistration') } catch {}
      // Google Ads / GA4 - حدث تحويل: تسجيل عميل جديد
      try { (window as any).gtag?.('event', 'sign_up', { method: 'email' }) } catch {}
      // ملاحظة: إنشاء الـ profile يتم حصراً عبر trigger قاعدة البيانات
      // (on_auth_user_created → handle_new_user) اعتماداً على بيانات التسجيل أعلاه.
      // لا نكتب الـ profile من العميل حتى لا يوجد مساران لإنشاء نفس السجل.
      setTimeout(async () => {
        await fetchProfile(data.user!.id)
      }, 500)
    }
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) await fetchProfile(data.user.id)
    return { error }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://amerniksa.com' }
    })
  }

  const signOut = async () => {
    // احذف اشتراك Push من الجهاز و DB قبل تسجيل الخروج
    try {
      const { disablePushNotifications } = await import('../lib/push')
      await disablePushNotifications()
    } catch { /* soft-fail */ }
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}
