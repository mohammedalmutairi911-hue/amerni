import { useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles, MapPin, Tag, DollarSign, Bot, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'

const CATEGORIES = [
  { id: 'توصيل ومشاوير', emoji: '🚗', desc: 'توصيل وشراء ومشاوير' },
  { id: 'تحقق ومتابعة', emoji: '🔍', desc: 'التحقق من مكان أو معلومة' },
  { id: 'تصوير ومحتوى', emoji: '📸', desc: 'تصوير ومقاطع وتصميم' },
  { id: 'مساعدة إدارية', emoji: '📋', desc: 'معاملات وأوراق وترجمة' },
  { id: 'تسوق', emoji: '🛍️', desc: 'شراء منتجات من محلات' },
  { id: 'تعليم وشرح', emoji: '📚', desc: 'شرح وتعليم ومساعدة دراسية' },
  { id: 'صيانة وتركيب', emoji: '🔧', desc: 'إصلاح وتركيب وصيانة' },
  { id: 'أخرى', emoji: '✨', desc: 'أي شيء ثاني' },
]

const CITIES = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'حائل', 'جازان', 'القصيم', 'نجران']

interface Props {
  initialTask?: string
  onClose: () => void
}

export function NewTaskPage({ initialTask = '', onClose }: Props) {
  const { user, signUp, signIn } = useAuth()
  const { navigate } = useApp()

  const [step, setStep] = useState<'details' | 'auth'>('details')
  const [isNew, setIsNew] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [task, setTask] = useState({
    title: initialTask,
    description: '',
    category: '',
    city: 'الرياض',
    budget: '',
    use_ai: false,
  })

  const [auth, setAuth] = useState({ name: '', phone: '', email: '', password: '' })
  const setA = (k: string, v: string) => setAuth(a => ({ ...a, [k]: v }))
  const setT = (k: string, v: any) => setTask(t => ({ ...t, [k]: v }))

  // AI category auto-detection
  const detectCategory = (title: string): string => {
    const t = title.toLowerCase()
    if (/توصيل|يجيب|يوصل|مشوار|سوق|شراء|طلب/.test(t)) return 'توصيل ومشاوير'
    if (/صور|تصوير|فيديو|محتوى/.test(t)) return 'تصوير ومحتوى'
    if (/تحقق|يتأكد|يشوف|يمر|يتفقد/.test(t)) return 'تحقق ومتابعة'
    if (/ترجمة|معاملة|ورقة|طباعة|إداري/.test(t)) return 'مساعدة إدارية'
    if (/تسوق|شراء|منتج/.test(t)) return 'تسوق'
    if (/شرح|تعليم|دراسة|درس/.test(t)) return 'تعليم وشرح'
    if (/صيانة|تركيب|إصلاح/.test(t)) return 'صيانة وتركيب'
    return 'أخرى'
  }

  const saveTask = async (uid: string) => {
    // Auto-detect category if not selected
    const finalCategory = task.category && task.category !== 'أخرى' 
      ? task.category 
      : detectCategory(task.title)
    
    const { data, error } = await supabase.from('tasks').insert({
      client_id: uid, user_id: uid,
      title: task.title.trim(),
      description: task.description.trim() || task.title.trim(),
      category: finalCategory,
      city: task.city,
      use_ai: task.use_ai,
      status: 'open',
      price_suggested: task.budget ? Number(task.budget) : null
    }).select().single()
    if (error) {
      console.error('Task save error:', error)
      setError('حدث خطأ: ' + error.message)
      return false
    }
    
    // Auto-notify matching workers
    if (data) {
      const { data: workers } = await supabase
        .from('worker_profiles')
        .select('user_id')
        .eq('is_approved', true)
        .eq('is_online', true)
        .contains('skills', [finalCategory])
        .eq('city', task.city)
      
      if (workers && workers.length > 0) {
        await supabase.from('notifications').insert(
          workers.map(w => ({
            user_id: w.user_id,
            title: 'طلب جديد يناسبك! ⚡',
            body: task.title.trim(),
            task_id: data.id
          }))
        )
      }
    }
    // Track "أخرى" requests for future auto-categories
    if (finalCategory === 'أخرى') {
      const keywords = task.title.trim().split(' ').slice(0, 2).join(' ')
      supabase.from('category_requests').upsert(
        { category: keywords, count: 1 },
        { onConflict: 'category' }
      ).then(() => {})
    }
    return true
  }

  const handleNext = () => {
    if (!task.title.trim()) { setError('اكتب طلبك أولاً'); return }
    setError('')
    if (user) {
      handleSaveLoggedIn()
    } else {
      setStep('auth')
    }
  }

  const handleSaveLoggedIn = async () => {
    setLoading(true)
    const ok = await saveTask(user!.id)
    setLoading(false)
    if (ok !== false) {
      navigate('dashboard')
      onClose()
    }
  }

  const handleAuth = async () => {
    setError('')
    if (isNew) {
      if (!auth.name.trim()) { setError('أدخل اسمك الكامل'); return }
      const phone = auth.phone.replace(/\s/g, '')
      if (!phone.startsWith('05') || phone.length !== 10) { setError('رقم الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام'); return }
      if (!auth.email.includes('@')) { setError('أدخل بريد إلكتروني صحيح'); return }
      if (auth.password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    } else {
      if (!auth.email) { setError('أدخل بريدك الإلكتروني'); return }
      if (!auth.password) { setError('أدخل كلمة المرور'); return }
    }

    setLoading(true)
    let uid = ''

    if (isNew) {
      const { error: err } = await signUp(auth.email.trim(), auth.password, auth.name.trim(), 'client')
      if (err) { setError('البريد مسجل — جرب "عندي حساب"'); setLoading(false); return }
      await new Promise(r => setTimeout(r, 800))
      const { data: { user: u } } = await supabase.auth.getUser()
      uid = u?.id || ''
    } else {
      const { error: err } = await signIn(auth.email.trim(), auth.password)
      if (err) { setError('بريد أو كلمة مرور خاطئة'); setLoading(false); return }
      await new Promise(r => setTimeout(r, 500))
      const { data: { user: u } } = await supabase.auth.getUser()
      uid = u?.id || ''
    }

    if (uid && task.title.trim()) {
      const ok = await saveTask(uid)
      if (ok === false) { setLoading(false); return }
    }
    setLoading(false)
    navigate('dashboard')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#080808] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080808]/95 backdrop-blur border-b border-zinc-900 px-4 py-4 flex items-center justify-between">
        <button onClick={step === 'auth' ? () => setStep('details') : onClose}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
          <ArrowRight size={16} /> {step === 'auth' ? 'رجوع' : 'إلغاء'}
        </button>
        <div className="text-amber-400 font-black text-lg">أمرني</div>
        <div className="flex gap-1">
          {['details', 'auth'].map((s, i) => (
            <div key={s} className={`w-8 h-1 rounded-full transition-all ${
              step === s ? 'bg-amber-500' : i < ['details','auth'].indexOf(step) ? 'bg-amber-500/40' : 'bg-zinc-800'
            }`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {step === 'details' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">وش تبي؟</h1>
              <p className="text-zinc-500 text-sm">اكتب طلبك وسنوصله لعامل مناسب</p>
            </div>

            {/* Task input */}
            <div>
              <textarea
                value={task.title}
                onChange={e => setT('title', e.target.value)}
                placeholder="مثال: أبي أحد يجيب لي غداء من مطعم ليلى في حي النزهة..."
                rows={3}
                autoFocus
                className="w-full bg-[#111] border-2 border-zinc-800 focus:border-amber-500 rounded-2xl px-5 py-4 text-white text-base outline-none transition-colors resize-none placeholder-zinc-600"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-zinc-300">التصنيف</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setT('category', cat.id)}
                    className={`text-right px-4 py-3 rounded-xl border transition-all ${
                      task.category === cat.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-zinc-800 bg-[#111] hover:border-zinc-700'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.emoji}</span>
                      <div>
                        <p className={`text-sm font-medium ${task.category === cat.id ? 'text-amber-300' : 'text-white'}`}>{cat.id}</p>
                        <p className="text-xs text-zinc-500">{cat.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* City & Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-amber-500" /> المدينة
                </label>
                <select value={task.city} onChange={e => setT('city', e.target.value)}
                  className="w-full bg-[#111] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-colors">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-zinc-300 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-amber-500" /> ميزانيتك
                </label>
                <div className="flex items-center gap-2 bg-[#111] border border-zinc-800 rounded-xl px-4 py-2.5 focus-within:border-amber-500 transition-colors">
                  <input type="number" value={task.budget} onChange={e => setT('budget', e.target.value)}
                    placeholder="مثال: 80" className="flex-1 bg-transparent text-sm outline-none" />
                  <span className="text-zinc-500 text-sm">ريال</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-300">تفاصيل إضافية (اختياري)</label>
              <textarea value={task.description} onChange={e => setT('description', e.target.value)}
                placeholder="أي تفاصيل تساعد العامل على فهم الطلب بشكل أفضل..."
                rows={2}
                className="w-full bg-[#111] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors resize-none placeholder-zinc-600" />
            </div>

            {/* AI option */}
            <div onClick={() => setT('use_ai', !task.use_ai)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                task.use_ai ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-[#111] hover:border-zinc-700'
              }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${task.use_ai ? 'bg-purple-500/20' : 'bg-zinc-800'}`}>
                <Bot size={22} className={task.use_ai ? 'text-purple-400' : 'text-zinc-500'} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">أريد حل بالذكاء الاصطناعي</p>
                <p className="text-xs text-zinc-500 mt-0.5">أسرع وأرخص — مناسب للشرح والبحث والكتابة</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                task.use_ai ? 'bg-purple-500 border-purple-500' : 'border-zinc-600'
              }`}>
                {task.use_ai && <CheckCircle size={14} className="text-white" />}
              </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-950/30 px-4 py-2.5 rounded-xl">{error}</p>}

            <button onClick={handleNext} disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {user ? 'نشر الطلب' : 'التالي — إنشاء حساب'} <ArrowLeft size={16} />
            </button>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black mb-1">{isNew ? 'سجّل وانشر طلبك' : 'أهلاً بعودتك'}</h1>
              <p className="text-zinc-500 text-sm">خطوة وحدة وطلبك ينشر فوراً</p>
            </div>

            {/* Task summary */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-400 font-medium mb-1">طلبك</p>
                  <p className="text-sm text-white">{task.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    <span>{task.category || 'أخرى'}</span>
                    <span>📍 {task.city}</span>
                    {task.budget && <span>💰 {task.budget} ريال</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex gap-1 bg-zinc-900 rounded-2xl p-1">
              {[{ v: true, l: 'حساب جديد' }, { v: false, l: 'عندي حساب' }].map(({ v, l }) => (
                <button key={l} onClick={() => { setIsNew(v); setError('') }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    isNew === v ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                  }`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {isNew && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">الاسم الكامل *</label>
                  <input value={auth.name} onChange={e => setA('name', e.target.value)} placeholder="محمد العتيبي"
                    className="w-full bg-[#111] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors" />
                </div>
              )}
              {isNew && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">رقم الجوال *</label>
                  <div className="flex gap-2">
                    <span className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-zinc-400 flex-shrink-0">🇸🇦 +966</span>
                    <input type="tel" value={auth.phone} onChange={e => setA('phone', e.target.value.replace(/\D/g, ''))}
                      placeholder="05XXXXXXXX" maxLength={10}
                      className="flex-1 bg-[#111] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">البريد الإلكتروني *</label>
                <input type="email" value={auth.email} onChange={e => setA('email', e.target.value)} placeholder="example@gmail.com"
                  className="w-full bg-[#111] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">كلمة المرور *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={auth.password} onChange={e => setA('password', e.target.value)}
                    placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    className="w-full bg-[#111] border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-400 bg-red-950/30 px-4 py-2.5 rounded-xl">{error}</p>}

              <button onClick={handleAuth} disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {isNew ? '✅ سجّل وانشر الطلب' : 'دخول ونشر الطلب'}
              </button>

              <p className="text-xs text-zinc-600 text-center">
                بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
