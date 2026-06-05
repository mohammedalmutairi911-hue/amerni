import { useState, useEffect } from 'react'
import { Sparkles, Shield, CheckCircle, Zap, Users, Star, ArrowLeft, Bot, UserCheck, Loader2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const EXAMPLES = [
  'أبي أحد يتأكد لي إذا المحل مفتوح',
  'أحتاج أحد يجيب غرض من السوق',
  'أبي أحد يصور موقع أو منتج',
  'أحتاج أحد يمر على مكان عني',
  'أبي أحد يوصل شيء',
  'أحتاج أحد يطابق لي معلومة',
]

const STEPS = [
  { n: '١', icon: Sparkles, title: 'اكتب اللي تبيه', desc: 'اكتب طلبك بأي كلام. ما في خيارات أو تصنيفات.' },
  { n: '٢', icon: Zap, title: 'عامل يقبل على طول', desc: 'الطلب يوصل للعمال المناسبين فوراً.' },
  { n: '٣', icon: Users, title: 'تكلمه وتابع', desc: 'محادثة مباشرة تفتح تلقائياً.' },
]

const TRUST = [
  'التحقق من الهوية الوطنية السعودية',
  'تحقق AI من صورة الهوية',
  'فلوسك محمية لحين إتمام الشغل',
  'دعم مباشر بالعربي ٢٤/٧',
  'خصوصيتك محمية وبياناتك سرية',
  'تواصل مباشر مع العامل عبر المنصة فقط',
]

export function LandingPage() {
  const { navigate } = useApp()
  const { user, signUp, signIn, refreshProfile } = useAuth()
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [taskInput, setTaskInput] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isNew, setIsNew] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % EXAMPLES.length); setVisible(true) }, 300)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const handleStart = () => {
    if (user) {
      // Save task and go to dashboard
      if (taskInput.trim()) saveTaskAndNavigate()
      else navigate('dashboard')
    } else {
      setShowAuth(true)
    }
  }

  const saveTaskAndNavigate = async () => {
    if (!user || !taskInput.trim()) { navigate('dashboard'); return }
    await supabase.from('tasks').insert({
      client_id: user.id, user_id: user.id,
      title: taskInput.trim(),
      description: taskInput.trim(),
      category: 'أخرى', city: 'الرياض',
      use_ai: false, status: 'open'
    })
    navigate('dashboard')
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('الرياض')

  const handleAuth = async () => {
    setError('')
    if (isNew) {
      if (!name.trim()) { setError('أدخل اسمك'); return }
      if (!phone.trim() || phone.length < 9) { setError('أدخل رقم الجوال'); return }
      if (!email.trim() || !email.includes('@')) { setError('أدخل بريد إلكتروني صحيح'); return }
      if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    } else {
      if (!email.trim()) { setError('أدخل بريدك الإلكتروني'); return }
      if (!password) { setError('أدخل كلمة المرور'); return }
    }
    setLoading(true)

    if (isNew) {
      const { error: err } = await signUp(email.trim(), password, name.trim(), 'client')
      if (err) { setError('البريد مسجل مسبقاً — جرب "عندي حساب"'); setLoading(false); return }
    } else {
      const { error: err } = await signIn(email.trim(), password)
      if (err) { setError('البريد أو كلمة المرور خاطئة'); setLoading(false); return }
    }

    if (taskInput.trim()) {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        await supabase.from('tasks').insert({
          client_id: u.id, user_id: u.id,
          title: taskInput.trim(), description: taskInput.trim(),
          category: 'أخرى', city,
          use_ai: false, status: 'open'
        })
      }
    }

    setLoading(false)
    setShowAuth(false)
    navigate('dashboard')
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-amber-500/5 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#080808_100%)]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-8">
            <Sparkles size={13} /> أمرني — اطلب أي شي في السعودية
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-tight">
            <span className="text-white">اطلب</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">أي شيء.</span>
            <br />
            <span className="text-white text-4xl sm:text-5xl">ننجزه لك.</span>
          </h1>
          <p className="text-zinc-400 text-lg mb-10">منصة سعودية تربطك بعمال موثوقين لإنجاز أي مهمة يومية.</p>

          {/* Main input */}
          <div className="relative max-w-xl mx-auto mb-4">
            <div className="flex items-center gap-3 bg-[#111] border border-zinc-800 rounded-2xl px-5 py-4 focus-within:border-amber-500/50 transition-all shadow-2xl">
              <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && taskInput.trim() && handleStart()}
                placeholder={visible ? EXAMPLES[idx] : ''}
                className="flex-1 text-right bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
              />
              <button onClick={handleStart}
                className="bg-amber-500 text-black text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors flex-shrink-0 flex items-center gap-1.5">
                اطلب <ArrowLeft size={14} />
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-600 mb-10">اكتب أي شيء واضغط اطلب — مجاني تماماً</p>

          {/* Stats */}
          <div className="flex justify-center gap-8 text-center flex-wrap">
            {[['١٠٬٠٠٠+', 'طلب اتنجز'], ['٢٤٠٠+', 'عامل موثوق'], ['٩٨٪', 'نسبة الرضا']].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-black text-amber-400">{v}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth modal — task + register combined */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-zinc-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">{isNew ? 'سجّل وانشر طلبك' : 'أهلاً بعودتك'}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{isNew ? 'خطوة وحدة وطلبك ينشر فوراً' : 'ادخل عشان تتابع طلباتك'}</p>
              </div>
              <button onClick={() => setShowAuth(false)} className="text-zinc-500 hover:text-white p-1"><X size={18} /></button>
            </div>

            {/* Task preview */}
            {taskInput.trim() && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-zinc-500 mb-1">طلبك</p>
                <p className="text-sm text-amber-300 font-medium">"{taskInput}"</p>
              </div>
            )}

            {/* Toggle */}
            <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 mb-5">
              {[{ v: true, l: 'حساب جديد' }, { v: false, l: 'عندي حساب' }].map(({ v, l }) => (
                <button key={l} onClick={() => { setIsNew(v); setError('') }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isNew === v ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {isNew && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">الاسم الكامل *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="محمد العتيبي"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              )}

              {isNew && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">رقم الجوال *</label>
                  <div className="flex gap-2">
                    <span className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-400 flex-shrink-0">🇸🇦 +966</span>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="05XXXXXXXX" maxLength={10}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">البريد الإلكتروني *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
              </div>

              {isNew && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">مدينتك</label>
                  <select value={city} onChange={e => setCity(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none">
                    {['الرياض','جدة','مكة','المدينة','الدمام','الخبر','تبوك','أبها','حائل','جازان'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">كلمة المرور *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
                {isNew && <p className="text-xs text-zinc-600 mt-1">6 أحرف على الأقل</p>}
              </div>

              {error && <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}

              <button onClick={handleAuth} disabled={loading}
                className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                {loading && <Loader2 size={15} className="animate-spin" />}
                {isNew ? (taskInput.trim() ? '✅ سجّل وانشر الطلب' : 'إنشاء حساب') : 'دخول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-4">كيف تشتغل؟</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">بسيطة كالرسالة</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all">
                <div className="text-5xl font-black text-zinc-800 mb-4">{n}</div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-amber-500" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-zinc-900/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-4">المميزات</div>
            <h2 className="text-3xl sm:text-4xl font-bold">مختلفون عن الكل</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: Bot, title: 'ذكاء اصطناعي', desc: 'اقتراح سعر مناسب، تحقق من الهوية، حماية المحادثة' },
              { icon: UserCheck, title: 'عمال موثوقون', desc: 'كل عامل مرّ بفحص هوية صارم وموافقة الأدمن' },
              { icon: Shield, title: 'دفع آمن', desc: 'الطلب يكتمل فقط بعد تأكيد العميل استلام الخدمة' },
              { icon: Star, title: 'تقييم شفاف', desc: 'كل طلب ينتهي بتقييم يبني سمعة العامل' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-amber-500" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-6">
                <Shield size={13} className="text-emerald-500" /> الثقة والأمان
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">مبنية على الثقة.<br />وكل شخص موثوق.</h2>
              <p className="text-zinc-500 mb-8 leading-relaxed">في المملكة، الثقة هي الأساس. كل عامل يمر بتحقق من الهوية الوطنية وفحص AI صارم.</p>
              <button onClick={handleStart}
                className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors flex items-center gap-2">
                اطلب الآن <ArrowLeft size={16} />
              </button>
            </div>
            <div className="space-y-2.5">
              {TRUST.map(t => (
                <div key={t} className="flex items-center gap-4 bg-[#0d0d0d] border border-zinc-800 rounded-xl px-5 py-3.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={13} className="text-emerald-500" />
                  </div>
                  <span className="text-sm text-zinc-300">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-zinc-900/10">
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-gradient-to-b from-zinc-900 to-[#0d0d0d] border border-zinc-800 rounded-3xl px-8 py-16">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-6">
              <Star size={13} fill="currentColor" /> جاهز تطلب؟
            </div>
            <h2 className="text-3xl font-bold mb-4">أي شيء تبيه — اطلبه الحين</h2>
            <p className="text-zinc-500 mb-8">بس اكتب اللي تبيه. ما في تعقيد.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={handleStart} className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors">ابدأ الآن</button>
              <button onClick={() => { setShowAuth(true); setIsNew(true) }} className="border border-zinc-700 text-zinc-300 px-6 py-3 rounded-xl hover:border-zinc-600 transition-colors">أشتغل معكم</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 py-8 px-4 text-center text-zinc-600 text-sm">
        <p>© ٢٠٢٦ أمرني — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  )
}
