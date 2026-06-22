import { useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles, MapPin, DollarSign, Bot, CheckCircle, Loader2, Eye, EyeOff, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { filterContent } from '../lib/contentFilter'
import { trackEvent } from '../lib/analytics'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'

const SUGGESTED_CATS = ['توصيل ومشاوير', 'تصوير ومحتوى', 'تحقق ومتابعة', 'مساعدة إدارية', 'تسوق', 'تعليم وشرح', 'صيانة وتركيب', 'أخرى']
const CITIES = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'حائل', 'جازان', 'القصيم', 'نجران']

const detectCategory = (title: string): string => {
  const t = title
  if (/توصيل|يجيب|يوصل|مشوار|سوق/.test(t)) return 'توصيل ومشاوير'
  if (/صور|تصوير|فيديو|محتوى/.test(t)) return 'تصوير ومحتوى'
  if (/تحقق|يتأكد|يشوف|يمر|يتفقد/.test(t)) return 'تحقق ومتابعة'
  if (/ترجمة|معاملة|ورقة|إداري/.test(t)) return 'مساعدة إدارية'
  if (/تسوق|شراء|منتج/.test(t)) return 'تسوق'
  if (/شرح|تعليم|دراسة/.test(t)) return 'تعليم وشرح'
  if (/صيانة|تركيب|إصلاح/.test(t)) return 'صيانة وتركيب'
  return ''
}

interface Props { initialTask?: string; onClose: () => void }

export function NewTaskPage({ initialTask = '', onClose }: Props) {
  const { user, signUp, signIn, signInWithGoogle } = useAuth()
  const { navigate } = useApp()
  const [step, setStep] = useState<'details' | 'auth'>('details')
  
  const goToAuth = () => {
    setStep('auth')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const [isNew, setIsNew] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [task, setTask] = useState({
    title: initialTask,
    description: '',
    category: detectCategory(initialTask),
    customCategory: '',
    city: 'الرياض',
    budget: '',
    use_ai: false,
    deadline: '',
  })
  const [auth, setAuth] = useState({ name: '', phone: '', email: '', password: '' })
  const setT = (k: string, v: any) => setTask(t => ({ ...t, [k]: v }))
  const setA = (k: string, v: string) => setAuth(a => ({ ...a, [k]: v }))

  // Auto-detect category when title changes
  const handleTitleChange = (val: string) => {
    setT('title', val)
    const detected = detectCategory(val)
    if (detected) setT('category', detected)
  }

  const getFinalCategory = () => {
    if (task.category === 'أخرى') return task.customCategory || 'أخرى'
    return task.category || 'أخرى'
  }

  const saveTask = async (uid: string): Promise<boolean> => {
    const finalCategory = getFinalCategory()
    // نقرأ كود الإحالة المحفوظ (إن وجد) من localStorage — اتُقط عند فتح الموقع بـ ?ref=
    // نحوله من 8 أحرف مختصرة إلى UUID كامل عبر البحث في profiles (الرابط يحتوي أول 8 خانات فقط)
    let referredByUid: string | null = null
    const refCode = localStorage.getItem('amerni_referred_by')
    if (refCode && refCode.length === 8) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .ilike('id', `${refCode}%`)
        .maybeSingle()
      if (referrer && referrer.id !== uid) referredByUid = referrer.id
    }

    // تحويل النص العربي للموعد إلى تاريخ فعلي
    const deadlineMap: Record<string, number> = {
      'أسرع وقت ممكن': 2,
      'خلال ساعتين': 2,
      'اليوم': 8,
      'خلال يومين': 48,
      'هذا الأسبوع': 168,
    }
    let deadlineISO: string | null = null
    if (task.deadline && deadlineMap[task.deadline]) {
      const d = new Date()
      d.setHours(d.getHours() + deadlineMap[task.deadline])
      deadlineISO = d.toISOString()
    } else if (task.deadline && task.deadline.includes('T')) {
      deadlineISO = task.deadline // تاريخ datetime-local
    }

    const { data, error: err } = await supabase.rpc('create_task', {
      p_title:       task.title.trim(),
      p_description: task.description.trim() || task.title.trim(),
      p_category:    finalCategory,
      p_city:        task.city,
      p_budget:      task.budget ? Number(task.budget) : null,
      p_deadline:    deadlineISO,
      p_use_ai:      task.use_ai ?? false
    })

    if (err) {
      console.error('Task error:', err)
      setError('حدث خطأ: ' + err.message)
      return false
    }

    return true
  }

  const handleNext = () => {
    setError('')
    const titleTrimmed = task.title.trim()
    // فريق QA: اكتشف عدم وجود حد أدنى/أقصى لطول العنوان — كان يقبل حرفاً واحداً
    // أو نصاً بآلاف الأحرف يكسر تصميم الواجهة عند العمال الذين يستعرضون الطلبات
    if (!titleTrimmed) { setError('اكتب طلبك أولاً'); return }
    if (titleTrimmed.length < 5) { setError('اكتب وصفاً أوضح لطلبك (5 أحرف على الأقل)'); return }
    if (titleTrimmed.length > 150) { setError('عنوان الطلب طويل جداً — اختصره لـ150 حرف كحد أقصى'); return }
    if (task.description.trim().length > 2000) { setError('وصف الطلب طويل جداً — اختصره لـ2000 حرف كحد أقصى'); return }

    // فلتر المحتوى المحظور
    const filterResult = filterContent(task.title + ' ' + task.description)
    if (filterResult.blocked) {
      setError('⛔ ' + filterResult.reason + ' — هذا الطلب مخالف لسياسة المنصة والأنظمة السعودية')
      return
    }
    
    if (!task.category) { setError('حدد تصنيف الطلب'); return }
    if (task.category === 'أخرى' && !task.customCategory.trim()) { setError('اكتب التصنيف في خانة أخرى'); return }
    if (user) {
      setLoading(true)
      saveTask(user.id).then(ok => {
        setLoading(false)
        if (ok) { navigate('dashboard'); onClose() }
      })
    } else {
      goToAuth()
    }
  }

  const handleAuth = async () => {
    setError('')
    if (isNew) {
      if (!auth.name.trim()) { setError('أدخل اسمك الكامل'); return }
      if (!agreedTerms) { setError('يجب الموافقة على الشروط والأحكام للمتابعة'); return }
      const phone = auth.phone.replace(/\s/g, '')
      if (!phone.startsWith('05') || phone.length !== 10) { setError('الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام'); return }
      if (!auth.email.includes('@')) { setError('أدخل بريد إلكتروني صحيح'); return }
      if (auth.password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
    } else {
      if (!auth.email) { setError('أدخل بريدك الإلكتروني'); return }
      if (!auth.password) { setError('أدخل كلمة المرور'); return }
    }
    setLoading(true)
    if (isNew) {
      const { error: err } = await signUp(auth.email.trim(), auth.password, auth.name.trim(), 'client')
      // لو في خطأ — على الأرجح الإيميل مسجل بس ما مُأكَّد
      if (err) {
        setLoading(false)
        setShowEmailConfirm(true)
        return
      }
      await new Promise(r => setTimeout(r, 1000))
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (task.title.trim()) {
          localStorage.setItem('pending_task', JSON.stringify({
            title: task.title.trim(), category: getFinalCategory(),
            city: task.city, budget: task.budget,
          }))
        }
        setLoading(false)
        setShowEmailConfirm(true)
        return
      }
      const uid = session.user.id
      if (task.title.trim()) {
        const ok = await saveTask(uid)
        if (!ok) { setLoading(false); return }
      }
      setLoading(false)
      navigate('dashboard')
      onClose()
      return
    } else {
      const { error: err } = await signIn(auth.email.trim(), auth.password)
      if (err) { setError('بريد أو كلمة مرور خاطئة'); setLoading(false); return }
      await new Promise(r => setTimeout(r, 500))
    }

    const { data: { user: u } } = await supabase.auth.getUser()
    const uid = u?.id || ''
    if (!uid) { setError('حدث خطأ — حاول مرة ثانية'); setLoading(false); return }

    if (task.title.trim()) {
      const ok = await saveTask(uid)
      if (!ok) { setLoading(false); return }
    }

    setLoading(false)
    navigate('dashboard')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto" style={{WebkitOverflowScrolling: "touch"}}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 px-4 py-3.5 flex items-center justify-between">
        <button onClick={step === 'auth' ? () => setStep('details') : onClose}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm">
          <ArrowRight size={16} /> {step === 'auth' ? 'رجوع' : 'إلغاء'}
        </button>
        <span className="text-primary-400 font-black text-lg">أمرني</span>
        <div className="flex gap-1.5">
          {['details','auth'].map((s, i) => (
            <div key={s} className={`h-1 rounded-full transition-all ${step === s ? 'w-6 bg-primary-500' : 'w-3 bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 sm:py-8 pb-20">
        {/* Step 1: Task details */}
        {step === 'details' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black mb-1">وش تبي؟</h1>
              <p className="text-slate-400 text-sm">اكتب طلبك وسنوصله لعامل مناسب</p>
            </div>

            {/* Task title */}
            <div>
              <label className="block text-xs text-slate-500 mb-2 font-medium">طلبك *</label>
              <textarea value={task.title} onChange={e => handleTitleChange(e.target.value)}
                placeholder="مثال: أبي أحد يجيب لي غداء من مطعم في حي النزهة الرياض..." rows={2} autoFocus
                className="w-full bg-white border-2 border-slate-200 focus:border-primary-500 rounded-2xl px-4 py-3.5 text-slate-900 text-sm outline-none transition-colors resize-none placeholder-slate-400" />
            </div>

            {/* Category - buttons + free text for أخرى */}
            <div>
              <label className="block text-xs text-slate-500 mb-2 font-medium flex items-center gap-1.5">
                <Tag size={12} className="text-primary-500" /> التصنيف *
                {task.category && task.category !== 'أخرى' && !task.customCategory && (
                  <span className="text-primary-400 text-xs">— تم اكتشافه تلقائياً ✨</span>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 mb-3">
                {SUGGESTED_CATS.map(cat => (
                  <button key={cat} type="button"
                    onClick={() => { setT('category', cat); if (cat !== 'أخرى') setT('customCategory', '') }}
                    className={`text-right px-4 py-3 rounded-xl border transition-all ${
                      task.category === cat
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <p className={`text-sm font-medium ${task.category === cat ? 'text-primary-300' : 'text-slate-900'}`}>{cat}</p>
                  </button>
                ))}
              </div>
              {/* Free text when أخرى selected */}
              {task.category === 'أخرى' && (
                <div className="mt-2">
                  <input
                    value={task.customCategory}
                    onChange={e => setT('customCategory', e.target.value)}
                    placeholder="اكتب التصنيف هنا..."
                    autoFocus
                    className="w-full bg-white border-2 border-primary-500/50 focus:border-primary-500 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* City & Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-2 font-medium flex items-center gap-1"><MapPin size={11} className="text-primary-500" /> المدينة</label>
                <select value={task.city} onChange={e => setT('city', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-2 font-medium flex items-center gap-1"><DollarSign size={11} className="text-primary-500" /> ميزانيتك</label>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-primary-500 transition-colors">
                  <input type="number" value={task.budget} onChange={e => setT('budget', e.target.value)}
                    placeholder="80" className="flex-1 bg-transparent text-sm outline-none text-slate-900" />
                  <span className="text-slate-400 text-xs">ريال</span>
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs text-slate-500 mb-2 font-medium">⏰ وقت الإنجاز المطلوب</label>
              <div className="flex gap-2 flex-wrap">
                {['أسرع وقت ممكن', 'خلال ساعتين', 'اليوم', 'خلال يومين', 'هذا الأسبوع'].map(d => (
                  <button key={d} type="button" onClick={() => setT('deadline', d)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${task.deadline === d ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs text-slate-500 mb-2 font-medium">تفاصيل إضافية (اختياري)</label>
              <textarea value={task.description} onChange={e => setT('description', e.target.value)}
                placeholder="أي تفاصيل تساعد العامل..." rows={2}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors resize-none placeholder-slate-400 text-slate-900" />
            </div>

            {/* AI toggle */}
            <div onClick={() => setT('use_ai', !task.use_ai)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${task.use_ai ? 'border-purple-500 bg-purple-500/10' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${task.use_ai ? 'bg-purple-500/20' : 'bg-slate-100'}`}>
                <Bot size={20} className={task.use_ai ? 'text-purple-400' : 'text-slate-400'} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-900">أريد حل بالذكاء الاصطناعي</p>
                <p className="text-xs text-slate-400 mt-0.5">أسرع وأرخص — للشرح والبحث والكتابة</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.use_ai ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                {task.use_ai && <CheckCircle size={13} className="text-slate-900" />}
              </div>
            </div>

            {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-4 py-3 rounded-xl">{error}</p>}

            <button onClick={handleNext} disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-400 text-slate-900 font-bold py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {user ? 'نشر الطلب' : 'التالي — إنشاء حساب'} <ArrowLeft size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Auth */}
        {step === 'auth' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black mb-1">{isNew ? 'سجّل وانشر طلبك' : 'أهلاً بعودتك'}</h1>
              <p className="text-slate-400 text-sm">خطوة وحدة وطلبك ينشر فوراً</p>
            </div>

            {/* Google Sign In - prominent at top */}
            <button onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              تسجيل الدخول بـ Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">أو بالبريد الإلكتروني</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Task summary */}
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles size={15} className="text-primary-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-primary-400 font-medium mb-1">طلبك</p>
                  <p className="text-sm text-slate-900 font-medium">{task.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                    <span>{getFinalCategory()}</span>
                    <span>📍 {task.city}</span>
                    {task.budget && <span>💰 {task.budget} ريال</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex gap-1 bg-white rounded-2xl p-1">
              {[{ v: true, l: 'حساب جديد' }, { v: false, l: 'عندي حساب' }].map(({ v, l }) => (
                <button key={l} onClick={() => { setIsNew(v); setError('') }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isNew === v ? 'bg-primary-500 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {isNew && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">الاسم الكامل *</label>
                    <input value={auth.name} onChange={e => setA('name', e.target.value)} placeholder="محمد العتيبي"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">رقم الجوال * (يبدأ بـ 05)</label>
                    <div className="flex gap-2">
                      <span className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-500 flex-shrink-0">🇸🇦 +966</span>
                      <input type="tel" value={auth.phone} maxLength={10}
                        onChange={e => setA('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="05XXXXXXXX"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
                    </div>
                    {auth.phone.length > 0 && auth.phone.length < 10 && (
                      <p className="text-xs text-slate-400 mt-1">{auth.phone.length}/10 أرقام</p>
                    )}
                    {auth.phone.length === 10 && !auth.phone.startsWith('05') && (
                      <p className="text-xs text-red-400 mt-1">يجب أن يبدأ بـ 05</p>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">البريد الإلكتروني *</label>
                <input type="email" value={auth.email} onChange={e => setA('email', e.target.value)} placeholder="example@gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">كلمة المرور *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={auth.password} onChange={e => setA('password', e.target.value)}
                    placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleAuth()}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {!isNew && (
                <div className="text-left">
                  <button onClick={async () => {
                    if (!auth.email) { setError('أدخل بريدك أولاً'); return }
                    setShowReset(true)
                    await supabase.auth.resetPasswordForEmail(auth.email.trim(), { redirectTo: 'https://amerniksa.com' })
                    setResetSent(true)
                  }} className="text-xs text-primary-400 hover:underline">
                    نسيت كلمة المرور؟
                  </button>
                  {resetSent && <p className="text-xs text-secondary-400 mt-1">✅ تم إرسال رابط الاستعادة لبريدك</p>}
                </div>
              )}

              {isNew && (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={() => setAgreedTerms(!agreedTerms)}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${agreedTerms ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                      {agreedTerms && <span className="text-slate-900 text-xs font-bold">✓</span>}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      أوافق على الشروط والأحكام وسياسة الخصوصية — أقرّ بأن المنصة وسيط فقط وغير مسؤولة عن أي نزاع ينشأ بين الطرفين
                    </p>
                  </div>
                </div>
              )}

              {showEmailConfirm ? (
                <div className="bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">📧</div>
                  <p className="text-secondary-400 font-bold text-base mb-1">تحقق من بريدك</p>
                  <p className="text-slate-500 text-sm">أرسلنا رابط التأكيد على <span className="text-slate-900 font-medium">{auth.email}</span></p>
                  <p className="text-slate-400 text-xs mt-2">بعد التأكيد ادخل وطلبك سينشر</p>
                </div>
              ) : (
                <>
                  {error && <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-4 py-3 rounded-xl">{error}</p>}
                  <button onClick={handleAuth} disabled={loading}
                    className="w-full bg-primary-500 hover:bg-primary-400 text-slate-900 font-bold py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20">
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {isNew ? '✅ سجّل وانشر الطلب' : 'دخول ونشر الطلب'}
                  </button>
                  <p className="text-xs text-slate-400 text-center">بالتسجيل أنت توافق على شروط الاستخدام</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
