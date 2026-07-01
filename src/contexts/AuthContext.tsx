import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

interface AuthCtx {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: any }>
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

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://amerniksa.com',
        data: { full_name: fullName, role }
      }
    })
    if (!error && data.user) {
      // TikTok Pixel - تسجيل ناجح
      try { (window as any).ttq?.track('CompleteRegistration') } catch {}
      // انتظر شوي وبعدين احفظ البروفايل مع الـ role الصح
      // ملاحظة: الـtrigger handle_new_user في قاعدة البيانات يسوي هذا تلقائياً عند التسجيل،
      // هذا upsert احتياطي فقط لو تأخر الـtrigger أو لتحديث role بدقة بعد التسجيل
      setTimeout(async () => {
        try {
          await supabase.from('profiles').upsert({
            id: data.user!.id, email, full_name: fullName, role, phone_verified: false
          })
        } catch {
          // تجاهل الخطأ بصمت — الـtrigger في قاعدة البيانات غالباً أنشأ البروفايل أصلاً
        }
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
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}
