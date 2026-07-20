import { useState } from 'react'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'

export function AuthModal() {
  const { signIn, signUp } = useAuth()
  const { authTab, authPlatform, authPrefill, closeAuth, navigate } = useApp()
  const [tab, setTab] = useState<'login' | 'signup'>(authTab)
  const [role, setRole] = useState<'client' | 'worker'>('client')
  const [form, setForm] = useState({ name: authPrefill?.name || '', email: authPrefill?.email || '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendDone, setResendDone] = useState(false)

  const isEnterprise = authPlatform === 'enterprises'
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError('')
    if (!form.email || !form.password) { setError('أكمل البيانات'); return }
    if (tab === 'signup' && !form.name) { setError('أدخل اسمك'); return }
    setLoading(true)
    if (tab === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) {
        const msg = error.message?.toLowerCase() || ''
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          setError('__email_confirm__')
        } else {
          setError('بريد أو كلمة مرور خاطئة')
        }
        setLoading(false)
        return
      }
    } else {
      // في المنشآت الدور دائماً client (الشركة)، الفصل عبر platform
      const signupRole = isEnterprise ? 'client' : role
      const { error } = await signUp(form.email, form.password, form.name, signupRole, authPlatform)
      if (error) { setError(error.message); setLoading(false); return }
    }
    setLoading(false)
    closeAuth()
    // التوجيه حسب المنصة
    if (isEnterprise) {
      // بعد التسجيل كشركة — روح لطلباتي مباشرة
      navigate('enterprises')
      // نستخدم event عشان EnterprisesPage يفتح تبويب طلباتي
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('enterprises:open-my-requests'))
      }, 600)
    } else if (tab === 'signup') {
      if (role === 'worker') navigate('worker')
      else navigate('dashboard')
    } else {
      navigate('dashboard')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 relative">
        <button onClick={closeAuth} aria-label="إغلاق نافذة التسجيل" className="absolute top-4 left-4 text-slate-400 hover:text-slate-900">
          <X size={18} />
        </button>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6">
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-900'
              }`}>
              {t === 'login' ? 'دخول' : 'حساب جديد'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">الاسم الكامل</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="محمد العتيبي"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 transition-colors" />
              </div>

              {/* Role selection — للأفراد فقط، المنشآت شركات */}
              {!isEnterprise && (
              <div>
                <label className="block text-xs text-slate-400 mb-2">أنا</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'client', label: 'أطلب خدمة', desc: 'أريد شخص ينجز لي شيء' },
                    { v: 'worker', label: 'أشتغل معكم', desc: 'أريد قبول طلبات وكسب' }
                  ].map(({ v, label, desc }) => (
                    <button key={v} onClick={() => setRole(v as any)}
                      className={`text-right p-3 rounded-xl border transition-all ${
                        role === v ? 'border-primary-500 bg-primary-500/10' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="example@gmail.com"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 transition-colors" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">كلمة المرور</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 transition-colors" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error === '__email_confirm__' ? (
            <div className="bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl mb-1">📧</p>
              <p className="text-secondary-400 font-bold text-sm mb-1">تحقق من بريدك أولاً</p>
              <p className="text-slate-500 text-xs mb-2">أرسلنا رابط التأكيد على <span className="text-slate-900">{form.email}</span></p>
              {resendDone ? (
                <p className="text-secondary-400 text-xs">✅ تم إرسال رابط جديد</p>
              ) : (
                <button onClick={async () => {
                  await supabase.auth.resend({ type: 'signup', email: form.email.trim() })
                  setResendDone(true)
                }} className="text-xs text-primary-400 underline underline-offset-2 hover:text-primary-300 transition-colors">
                  لم يصلني البريد — أعد الإرسال
                </button>
              )}
            </div>
          ) : (
            <>
              {error && <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <button onClick={submit} disabled={loading}
                className="w-full bg-primary-500 text-white font-bold py-2.5 rounded-xl hover:bg-primary-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={15} className="animate-spin" />}
                {tab === 'login' ? 'دخول' : 'إنشاء حساب'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
