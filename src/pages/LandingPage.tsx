import { useState, useEffect } from 'react'
import { COMPANY } from '../lib/constants'
import { Logo } from '../components/Logo'
import { Sparkles, Shield, CheckCircle, Zap, Users, Star, ArrowLeft, Bot, UserCheck, Loader2, Eye, EyeOff, Mail, Phone, MessageCircle, Info, Send, X, ShoppingBag, FileText, Camera, Search, Truck, Clock, Gift, PenLine, Handshake, Lock, Building2, ShieldCheck, Scale, Landmark, BadgeCheck, Cpu, Users2, ChevronDown, type LucideIcon } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { goHome, getHomePage, goToUserHome, profilePlatform, isUserInPortal } from '../lib/homePage'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'
import { LANDING_IMG, type LandingImgKey } from '../lib/landingImages'
import { NewTaskPage } from './NewTaskPage'
import { ServiceBrowsePage } from './ServiceBrowsePage'

const EXAMPLES = [
  'أبي أحد يوصل طرد من العنوان',
  'أحتاج أحد يشتري لي من السوق',
  'أبي أحد يصور موقع أو منتج',
  'أحتاج أحد يتحقق لي من معلومة',
  'أبي أحد يساعدني في مهمة إدارية',
  'أحتاج أحد يوصلني لمكان',
]

// وعد زمن الرد — يظهر في أكثر من مكان. لا يُغيَّر إلا بعد التأكد أن الفريق يقدر يلتزم به فعلياً.
const RESPONSE_PROMISE = 'نرد عليك خلال ساعة'

// أمثلة على ما يُطلب — أمثلة توضيحية فقط (ليست مهام منفّذة) وتُعرض مُعنوَنة كذلك.
const REQUEST_IDEAS = [
  { icon: ShoppingBag, label: 'تسوّق وتوصيل', img: 'shopping' as LandingImgKey, text: 'أبي أحد يشتري لي غرض من السوق ويوصله لي' },
  { icon: FileText, label: 'معاملات ومراجعات', img: 'gov' as LandingImgKey, text: 'أحتاج أحد يراجع لي معاملة في دائرة حكومية' },
  { icon: Camera, label: 'تصوير', img: 'photo' as LandingImgKey, text: 'أبي أحد يصوّر لي موقع أو منتج ويرسل الصور' },
  { icon: Search, label: 'تحقق ميداني', img: 'verify' as LandingImgKey, text: 'أحتاج أحد يتحقق لي من معلومة أو عنوان على أرض الواقع' },
  { icon: Truck, label: 'توصيل واستلام', img: 'delivery' as LandingImgKey, text: 'أبي أحد يوصّل لي طرد أو يستلمه عني' },
  { icon: Clock, label: 'حجز وطوابير', img: 'queue' as LandingImgKey, text: 'أحتاج أحد يقف لي في طابور أو يحجز لي موعد' },
  { icon: Gift, label: 'هدايا', img: 'gift' as LandingImgKey, text: 'أبي أحد يجهّز لي هدية ويوصلها لشخص في مدينة ثانية' },
  { icon: Sparkles, label: 'طلب خاص', img: 'other' as LandingImgKey, text: 'عندي طلب غريب ما لقيت له منصة…' },
]


// صورة مع بديل أنيق: لو الملف غير موجود تظهر بطاقة تدرّج + أيقونة بدل صورة مكسورة
function Photo({ src, icon: Icon, className = '' }: { src: string; icon: LucideIcon; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 flex items-center justify-center ${className}`}>
        <Icon size={44} strokeWidth={1.25} className="text-white/25" />
      </div>
    )
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
}

function PhotoCard({ idea, onPick, photoClass = 'aspect-[4/5]', tone = 'dark' }: { idea: typeof REQUEST_IDEAS[number]; onPick: (t: string) => void; photoClass?: string; tone?: 'dark' | 'light' }) {
  // نتحقق أن الصورة موجودة فعلاً: بدونها تظهر بطاقة مدمجة أنيقة (لا مربعات فارغة كبيرة)
  const [hasPhoto, setHasPhoto] = useState(false)
  const src = LANDING_IMG[idea.img]
  useEffect(() => {
    const im = new Image()
    im.onload = () => setHasPhoto(im.naturalWidth > 0)
    im.onerror = () => setHasPhoto(false)
    im.src = src
  }, [src])

  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-300'
  if (!hasPhoto) {
    const dark = tone === 'dark'
    return (
      <button onClick={() => onPick(idea.text)}
        className={`group w-full flex items-center gap-3 rounded-2xl p-3.5 text-right transition-colors border ${focus} ${dark ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white' : 'bg-white hover:bg-primary-50 border-slate-200 hover:border-primary-300 text-slate-800 shadow-sm'}`}>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/10 text-primary-200' : 'bg-primary-50 text-primary-600'}`}>
          <idea.icon size={20} strokeWidth={1.75} />
        </span>
        <span className="text-sm font-medium leading-snug">{idea.label}</span>
      </button>
    )
  }
  return (
    <button onClick={() => onPick(idea.text)}
      className={`group relative overflow-hidden rounded-2xl text-right block w-full ${photoClass} ${focus}`}>
      <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center gap-2 text-white">
        <idea.icon size={16} strokeWidth={1.75} className="text-primary-200 flex-shrink-0" />
        <span className="text-sm font-medium">{idea.label}</span>
      </div>
    </button>
  )
}

const FAQ = [
  { q: 'لازم أسجّل قبل ما أكتب طلبي؟', a: 'لا. تكتب طلبك أولاً، وتسجّل في آخر خطوة عشان نربطه بحسابك.' },
  { q: 'كم أنتظر لين يرد علي أحد؟', a: RESPONSE_PROMISE + '.' },
  { q: 'متى أدفع؟', a: 'تتفق على السعر أولاً. الدفع يتم عبر بوابة الدفع ويبقى محفوظاً في المنصة، ولا يصل لمقدم الخدمة إلا بعد ما تأكّد اكتمال الطلب.' },
  { q: 'أي طلب ينقبل؟', a: 'أي طلب ينفَّذ على أرض الواقع ويتوافق مع الأنظمة السعودية. الطلبات المخالفة تُرفض تلقائياً.' },
  { q: 'كيف أشتغل معكم كمقدم خدمة؟', a: 'تسجّل كمقدم خدمة وتُراجع بياناتك قبل القبول، وبعدها تستقبل الطلبات المناسبة لمهاراتك ومدينتك وتستلم أرباحك في محفظتك.' },
]

function FaqList() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {FAQ.map((f, i) => (
        <div key={f.q}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-4 py-4 text-right">
            <span className="font-medium text-slate-900">{f.q}</span>
            <ChevronDown size={18} className={`text-slate-400 flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <p className="pb-4 text-sm text-slate-600 leading-relaxed max-w-prose">{f.a}</p>}
        </div>
      ))}
    </div>
  )
}

const TRUST = [
  'مراجعة بيانات مقدمي الخدمة قبل قبولهم في المنصة',
  'التواصل داخل المنصة بدون مشاركة رقمك',
  'ادفع إلكترونياً بأمان — مدى أو أبل باي',
  'دعم ٢٤/٧ باللغة العربية',
  'خصوصيتك محمية وبياناتك سرية',
  'تواصل مباشر مع مقدم الخدمة عبر المنصة فقط',
]

const STEPS = [
  { n: '١', icon: Sparkles, title: 'اكتب ما تحتاجه', desc: 'صف طلبك بأي كلام — ما في خيارات معقدة.' },
  { n: '٢', icon: Zap, title: 'مقدم خدمة يقبل فوراً', desc: 'طلبك يصل للمناسبين في منطقتك فوراً.' },
  { n: '٣', icon: Users, title: 'تابع وتواصل', desc: 'محادثة مباشرة ومحمية تفتح تلقائياً.' },
]

type Tab = 'home' | 'how' | 'features' | 'trust' | 'about' | 'contact' | 'support' | 'privacy' | 'terms'

const SUPPORT_SYSTEM = `أنت مساعد خدمة عملاء لمنصة "أمرني" السعودية لطلب الخدمات.
مهمتك مساعدة العملاء والعمال بأسلوب ودي وسعودي.
إذا ذكر المستخدم مشكلة في طلب، اطلب منه رقم الطلب.
المنصة تتيح: طلب خدمات يومية، عمال موثوقين، دفع آمن.
للتواصل المباشر: support@amerniksa.com`

interface SupportMsg { role: 'user' | 'assistant'; content: string }

function DirectAuthForm({ mode, onSuccess }: { mode: 'login'|'register'; onSuccess: () => void }) {
  const { signUp, signIn, signInWithGoogle } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [role, setRole] = useState<'client'|'worker'>('client')

  const handleReset = async () => {
    if (!email) { setError('أدخل بريدك الإلكتروني'); return }
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://amerniksa.com'
    })
    setResetSent(true)
    setLoading(false)
  }

  const handle = async () => {
    setError('')
    if (mode === 'register') {
      if (!name.trim()) { setError('أدخل اسمك'); return }
      if (!email.includes('@')) { setError('أدخل بريد إلكتروني صحيح'); return }
      if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }
      setLoading(true)
      try {
        const { error: err } = await signUp(email.trim(), password, name.trim(), role)
        if (err) { setError(err.message || 'حدث خطأ'); setLoading(false); return }
        await new Promise(r => setTimeout(r, 1000))
        const { data: { session } } = await supabase.auth.getSession()
        setLoading(false)
        if (!session) { setError('__email_confirm__'); return }
        onSuccess()
      } catch (e: any) {
        setError('حدث خطأ — حاول مرة ثانية')
        setLoading(false)
      }
    } else {
      if (!email) { setError('أدخل بريدك'); return }
      if (!password) { setError('أدخل كلمة المرور'); return }
      setLoading(true)
      const { error: err } = await signIn(email.trim(), password)
      if (err) {
        const msg = err.message?.toLowerCase() || ''
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          setError('__email_confirm__')
        } else if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong')) {
          setError('بريد أو كلمة مرور خاطئة')
        } else {
          setError(err.message || 'حدث خطأ — حاول مرة ثانية')
        }
        setLoading(false)
        return
      }
      setLoading(false)
      onSuccess()
    }
  }

  return (
    <div className="space-y-3">
      {mode === 'register' && (
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-1">
          <button onClick={() => setRole('client')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'client' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            🙋 أبي أطلب خدمة
          </button>
          <button onClick={() => setRole('worker')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'worker' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            🔧 سجّل كمزود خدمة
          </button>
        </div>
      )}
      <button onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {mode === 'login' ? 'دخول بـ Google' : 'تسجيل بـ Google'}
      </button>
      <div className="flex items-center gap-2"><div className="flex-1 h-px bg-slate-100"/><span className="text-xs text-slate-400">أو</span><div className="flex-1 h-px bg-slate-100"/></div>
      {mode === 'register' && (
        <>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
          <div className="flex gap-2">
            <span className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-500 flex-shrink-0">🇸🇦 +966</span>
            <input type="tel" value={phone} maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
              placeholder="05XXXXXXXX"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
          </div>
        </>
      )}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني"
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور"
        onKeyDown={e => e.key === 'Enter' && handle()}
        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 transition-colors text-slate-900" />
      {mode === 'login' && !showReset && (
        <button onClick={() => setShowReset(true)} className="text-xs text-primary-500 hover:underline text-right w-full">
          نسيت كلمة المرور؟
        </button>
      )}
      {showReset && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="text-xs text-slate-500">سنرسل لك رابط لتغيير كلمة المرور على بريدك</p>
          {resetSent ? (
            <p className="text-secondary-400 text-sm">✅ تم الإرسال — تحقق من بريدك</p>
          ) : (
            <button onClick={handleReset} disabled={loading}
              className="w-full bg-slate-200 hover:bg-zinc-600 text-slate-900 text-sm py-2 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'جاري الإرسال...' : 'أرسل رابط الاستعادة'}
            </button>
          )}
          <button onClick={() => setShowReset(false)} className="text-xs text-slate-400 hover:text-slate-500">إلغاء</button>
        </div>
      )}
      {error === '__email_confirm__' ? (
        <div className="bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">📧</div>
          <p className="text-secondary-400 font-bold mb-1">تحقق من بريدك أولاً</p>
          <p className="text-slate-500 text-sm mb-3">أرسلنا رابط التأكيد على <span className="text-slate-900">{email}</span></p>
          {resetSent ? (
            <p className="text-secondary-400 text-xs">✅ تم إرسال رابط جديد — تفقد بريدك</p>
          ) : (
            <button onClick={async () => {
              await supabase.auth.resend({ type: 'signup', email: email.trim() })
              setResetSent(true)
            }} className="text-xs text-primary-500 underline underline-offset-2 hover:text-primary-300 transition-colors">
              لم يصلني البريد — أعد الإرسال
            </button>
          )}
        </div>
      ) : (
        <>
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>}
          <button onClick={handle} disabled={loading}
            className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
            {mode === 'login' ? 'دخول' : 'إنشاء حساب'}
          </button>
        </>
      )}
    </div>
  )
}

export function LandingPage() {
  const { navigate } = useApp()
  const { user, profile } = useAuth()

  // عضوية بوابة الأفراد — حساب المنشآت هنا يُعامل كزائر (الأدمن استثناء)
  const inPortal = !!(user && profile && isUserInPortal(profile, 'individuals'))

  // ── Gateway: أفراد أو منشآت ──────────────────
  // المستخدم المسجل يتجاوز الشاشة مباشرة.
  // نقرأ الاختيار من history.state بدل sessionStorage — عشان:
  //   1) الزيارة الجديدة (تبويب جديد / رجوع بعد إغلاق) ترجّع لشاشة الاختيار دائماً
  //   2) إعادة تحميل الصفحة (F5) تحتفظ بالوضع الحالي
  //   3) زر رجوع في المتصفح يشتغل صح (يرجّع للـ gateway بدل ما يطلع من الموقع)
  const [mode, setModeRaw] = useState<'individuals' | 'enterprises' | null>(() => {
    // مستخدم أفراد مسجَّل ⇒ Home الأفراد مباشرة (وليس شاشة الاختيار).
    // الزائر ⇒ بوابة الاختيار. الأدمن ⇒ بوابة الاختيار ليختار البوابة التي يشرف عليها.
    if (user && profile && profile.role !== 'admin' && profilePlatform(profile) === 'individuals') {
      return 'individuals'
    }
    return (window.history.state?.amerni_mode as 'individuals' | 'enterprises' | null) || null
  })
  const setMode = (m: 'individuals' | 'enterprises' | null) => {
    // زر "أفراد ↕" (setMode(null)) للرجوع للـ gateway:
    // لو فيه history entry مضاف — استخدم back() عشان يتوافق مع زر رجوع المتصفح
    if (m === null && window.history.state?.amerni_mode) {
      window.history.back()
      return // popstate handler سيسوّي setModeRaw(null)
    }
    setModeRaw(m)
  }
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [taskInput, setTaskInput] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [showBrowse, setShowBrowse] = useState(false)
  const [showAuthDirect, setShowAuthDirect] = useState(false)
  const [authDirectMode, setAuthDirectMode] = useState<'login'|'register'>('login')

  // Contact form
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)

  // Support chat
  const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([
    { role: 'assistant', content: 'أهلاً! أنا مساعد أمرني. كيف أقدر أساعدك اليوم؟ 😊' }
  ])
  const [supportInput, setSupportInput] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  const chooseMode = (m: 'individuals' | 'enterprises') => {
    if (m === 'enterprises') { navigate('enterprises'); return }
    // نضيف history entry جديد — عشان زر رجوع في المتصفح يرجّع للـ gateway
    // بدل ما يطلع المستخدم من الموقع كلياً (كان هذا هو البق)
    if (!window.history.state?.amerni_mode) {
      window.history.pushState({ amerni_mode: 'individuals' }, '')
    }
    // الدخول من البوابة يبدأ دائماً من الصفحة الرئيسية للأفراد.
    // المكوّن لا يُفكَّك عند الرجوع للبوابة عبر الشعار، لذا تبقى حالة العرض
    // الداخلية (التبويب / صفحة الخدمات / نموذج طلب جديد) محفوظة وتُعيد فتح
    // آخر صفحة كان فيها المستخدم. نصفّرها هنا حتى يبدأ دائماً من "الرئيسية".
    // ملاحظة: هذا لا يمسّ زر رجوع/تقدّم المتصفح (history) ولا التنقّل داخل القسم.
    setActiveTab('home')
    setShowBrowse(false)
    setShowNewTask(false)
    setModeRaw('individuals')
  }

  // popstate: لما المستخدم يضغط رجوع/تقدّم في المتصفح، sync الوضع مع history state
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const newMode = (e.state?.amerni_mode as 'individuals' | 'enterprises' | null) || null
      setModeRaw(newMode)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % EXAMPLES.length); setVisible(true) }, 300)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // وضع 'enterprises' محفوظ ⇒ روّح المستخدم لبوابة الشركات (بدون تلويث history)
  useEffect(() => {
    if (mode === 'enterprises') navigate('enterprises', { replace: true })
  }, [mode, navigate])

  // القياس: أول مشاهدة للبوابة (يُستدعى دائماً قبل أي return مبكر)
  useEffect(() => {
    trackEvent('landing_view', user?.id, { mode: mode ?? 'gateway' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startFromGateway = (text: string) => {
    const t = text.trim()
    trackEvent('request_started', user?.id, { source: 'gateway', has_text: !!t, len: t.length })
    chooseMode('individuals')
    if (t) setTaskInput(t)
    setShowNewTask(true)
  }

  // البوابة (نقطة الدخول الرسمية) — تُعرَض لكل زائر أو مستخدم مسجَّل ما لم يختر وجهة.
  // المستخدم المسجَّل يحتفظ بجلسته، ونعرض له اختصار "لوحتي" للانتقال لدشبورده صراحةً.
  if (!mode) {
    const LANDING_FEATURES = [
      { icon: UserCheck, title: 'محترفون معتمدون', desc: 'كل مزوّد خدمة يمر بفحص هوية وتدقيق قبل قبوله في المنصة.', color: 'text-primary-500', bg: 'bg-primary-50' },
      { icon: Shield, title: 'دفع آمن ومضمون', desc: 'الطلب يكتمل فقط بعد تأكيدك استلام الخدمة — حقوقك محفوظة.', color: 'text-secondary-500', bg: 'bg-secondary-50' },
      { icon: MessageCircle, title: 'محادثة محمية', desc: 'تواصل مباشر داخل المنصة بدون مشاركة أرقامك الشخصية.', color: 'text-accent-500', bg: 'bg-accent-50' },
      { icon: Star, title: 'تقييم شفاف', desc: 'كل طلب ينتهي بتقييم حقيقي يبني سمعة مقدّم الخدمة.', color: 'text-blue-500', bg: 'bg-blue-50' },
    ]
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
        {/* ===== شريط علوي: الشعار + تبديل الجمهور + الدخول ===== */}
        <header className="bg-slate-950 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div className="bg-white rounded-xl px-2 py-1 flex-shrink-0"><Logo size={30} /></div>
              {/* تبديل الجمهور: أفراد (الحالي) | منشآت (يفتح صفحة المنشآت) */}
              <nav aria-label="نوع الحساب" className="flex items-center bg-white/10 rounded-full p-1 text-xs sm:text-sm">
                <span className="bg-white text-slate-900 font-bold rounded-full px-3 sm:px-4 py-1.5">أفراد</span>
                <button onClick={() => chooseMode('enterprises')}
                  className="flex items-center gap-1.5 text-slate-200 hover:text-white rounded-full px-3 sm:px-4 py-1.5 transition-colors">
                  <span className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                    <Photo src={LANDING_IMG.enterprises} icon={Building2} className="w-full h-full" />
                  </span>
                  منشآت
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
              <div className="hidden md:flex items-center gap-5 text-slate-300">
                <button onClick={() => { chooseMode('individuals'); setActiveTab('about') }} className="hover:text-white transition-colors">من نحن</button>
                <button onClick={() => { chooseMode('individuals'); setActiveTab('support') }} className="hover:text-white transition-colors">الدعم</button>
                {profile?.role === 'admin' && <button onClick={() => navigate('admin')} className="text-primary-300 hover:text-white transition-colors">الإدارة</button>}
              </div>
              {user && profile ? (
                <button onClick={() => goToUserHome(navigate, profile)} className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-lg transition-colors">حسابي</button>
              ) : (
                <button onClick={() => { chooseMode('individuals'); setAuthDirectMode('login'); setShowAuthDirect(true) }} className="bg-white text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">دخول</button>
              )}
            </div>
          </div>
        </header>

        {/* ===== Hero ===== */}
        <section className="relative bg-gradient-to-br from-slate-950 via-primary-950 to-primary-900 px-4 py-12 sm:py-20 overflow-hidden">
          <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-bold text-white mb-5 leading-[1.3] [text-wrap:balance]">
                استأجر شخص لتنفيذ مهامك
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
                اكتب أي طلب، حتى لو ما لقيت له منصة، ويتولاه شخص من أمرني. بدون تسجيل أولاً وبدون ما تدور وتقارن.
              </p>

              <form onSubmit={e => { e.preventDefault(); startFromGateway(taskInput) }} className="max-w-xl mb-3">
                <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl shadow-black/30 focus-within:ring-4 focus-within:ring-primary-300/40 transition-all">
                  <input
                    value={taskInput} onChange={e => setTaskInput(e.target.value)}
                    placeholder={visible ? EXAMPLES[idx] : ''}
                    aria-label="اكتب طلبك"
                    className="flex-1 min-w-0 bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-base px-3 py-3 outline-none text-right"
                  />
                  <button type="submit"
                    className="bg-primary-500 hover:bg-primary-700 text-white font-bold text-sm sm:text-base px-5 sm:px-7 py-3 rounded-xl transition-colors flex-shrink-0 flex items-center gap-1.5">
                    اطلب <ArrowLeft size={16} />
                  </button>
                </div>
              </form>
              <p className="text-primary-200 text-sm mb-8">{RESPONSE_PROMISE}، وتتفاوض على السعر قبل ما تدفع.</p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300">
                {['تواصل داخل المنصة', 'دفع محفوظ لين تأكيد الإنجاز', 'بياناتك محمية'].map(t => (
                  <div key={t} className="flex items-center gap-1.5"><CheckCircle size={13} className="text-primary-300" /><span>{t}</span></div>
                ))}
              </div>
            </div>

            {/* بطاقات المهام — صور عند توفرها، وإلا بطاقات مدمجة. كل بطاقة تبدأ طلباً */}
            <div>
              <p className="text-slate-400 text-sm mb-3">أو ابدأ من مثال:</p>
              <div className="grid grid-cols-2 gap-3">
                {REQUEST_IDEAS.slice(0, 6).map(r => (
                  <PhotoCard key={r.text} idea={r} onPick={startFromGateway} photoClass="aspect-[4/3]" />
                ))}
              </div>
            </div>
          </div>
          <div className="relative max-w-6xl mx-auto mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-400">
            <button onClick={() => navigate('verify')} className="flex items-center gap-1.5 hover:text-white transition-colors"><ShieldCheck size={15} />تأكد من مورد قبل التعامل معه</button>
          </div>
        </section>

        {/* ===== نقاط الوعد (بدون أرقام مصطنعة) ===== */}
        <section className="py-8 px-4 bg-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[[PenLine, 'اكتب طلبك بكلامك'], [Handshake, 'تتفق على السعر أولاً'], [Lock, 'الدفع محفوظ لين تأكيد الإنجاز'], [MessageCircle, 'محادثة داخل المنصة']].map(([I, l]: any) => (
              <div key={l}>
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-2"><I size={22} strokeWidth={1.75} /></div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-snug">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== أمثلة على ما يُطلب ===== */}
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-2">وش تقدر تطلب؟</h2>
              <p className="text-slate-500">أي شيء قانوني ينفَّذ على أرض الواقع — هذه أمثلة فقط، اكتب طلبك بكلامك</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REQUEST_IDEAS.map(r => (
                <button key={r.text} onClick={() => startFromGateway(r.text)}
                  className="flex items-center gap-3 bg-white border border-slate-200 hover:border-primary-500 hover:bg-primary-50 rounded-2xl p-4 text-right transition-all group">
                  <span className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 transition-colors"><r.icon size={20} strokeWidth={1.75} /></span>
                  <span className="flex-1 text-sm text-slate-700 group-hover:text-primary-600 font-medium">{r.text}</span>
                  <ArrowLeft size={16} className="text-slate-300 group-hover:text-primary-500 flex-shrink-0" />
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">أمثلة توضيحية — ليست مهام منفَّذة</p>
          </div>
        </section>

        {/* ===== أمرني للمنشآت (قسم ثانوي — محفوظ بالكامل) ===== */}
        <section className="py-14 px-4 bg-slate-900">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-right">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">أمرني للمنشآت: خبراء معتمدون عند الطلب</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">حوكمة، توطين، قانوني، مالي وزكاة، جودة وآيزو، أمن سيبراني — اطلب خبيراً بدل ما توظف بدوام كامل.</p>
              <button onClick={() => chooseMode('enterprises')} className="bg-white text-slate-900 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-slate-100 transition-colors">استكشف خدمات المنشآت</button>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
              {[[Landmark, 'حوكمة'], [Users2, 'توطين'], [Scale, 'قانوني'], [FileText, 'مالي/زكاة'], [BadgeCheck, 'جودة/آيزو'], [Cpu, 'أمن سيبراني']].map(([I, l]: any) => (
                <button key={l} onClick={() => chooseMode('enterprises')} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center transition-colors">
                  <I size={22} strokeWidth={1.75} className="text-accent-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-200 font-medium">{l}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===== المميزات ===== */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">لماذا آمرني؟</h2>
              <p className="text-slate-500">لأنه يجمع لك كل خدمة تحتاجها في مكان واحد</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {LANDING_FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
                <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                    <Icon size={20} className={color} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">{title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== مثال من الطلب للإنجاز (تسلسل فعلي) ===== */}
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">من الطلب للإنجاز</h2>
              <p className="text-slate-600 leading-relaxed">هذا مثال على مسار طلب عادي، نفس الخطوات تنطبق على أي شيء تطلبه.</p>
            </div>
            <ol className="lg:col-span-3 space-y-0 border-r-2 border-primary-100 pr-6">
              {[
                ['تكتب طلبك', '«أبي أحد يشتري لي غرض من السوق ويوصله لي» بكلامك، بدون نماذج طويلة.'],
                ['يصلك عرض بسعر', 'مقدم خدمة يقبل الطلب ويقترح سعراً. توافق، أو تتفاوض، أو ترفض.'],
                ['تدفع والمبلغ ينحفظ', 'الدفع يبقى محفوظاً في المنصة ولا يُحوَّل لمقدم الخدمة قبل ما تأكّد الاستلام.'],
                ['تتابع وتؤكد', 'محادثة داخل المنصة طوال التنفيذ. لما يوصلك الطلب تؤكّد ويُحوَّل المبلغ.'],
              ].map(([t, d], i) => (
                <li key={t} className="relative pb-8 last:pb-0">
                  <span className="absolute -right-[2.1rem] top-0.5 w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <h3 className="font-bold text-slate-900 mb-1">{t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-md">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===== مقدمو الخدمة ===== */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2">
            <div className="relative min-h-[260px] md:min-h-[360px]">
              <Photo src={LANDING_IMG.provider} icon={Users} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="px-6 py-12 md:py-16 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">عندك وقت أو مهارة؟ اكسب منها</h2>
              <p className="text-slate-600 leading-relaxed mb-6 max-w-md">سجّل كمقدم خدمة، وتُراجع بياناتك قبل القبول، واستقبل الطلبات المناسبة لمدينتك ومهاراتك. تحدد سعرك وتستلم أرباحك في محفظتك.</p>
              <div>
                <button onClick={() => { chooseMode('individuals'); setAuthDirectMode('register'); setShowAuthDirect(true) }}
                  className="bg-primary-500 hover:bg-primary-700 text-white font-bold px-7 py-3 rounded-xl transition-colors">سجّل كمقدم خدمة</button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== أسئلة شائعة ===== */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">أسئلة شائعة</h2>
            <FaqList />
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-16 px-4 bg-primary-600">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-black text-white mb-3">عندك طلب؟ اكتبه الحين</h2>
            <p className="text-blue-100 mb-8">{RESPONSE_PROMISE} — وبدون تسجيل أولاً</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="bg-white text-primary-600 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                اكتب طلبك
              </button>
              <button onClick={() => chooseMode('enterprises')} className="border-2 border-white/60 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm">
                أمثّل منشأة
              </button>
            </div>
          </div>
        </section>

        {/* ===== Footer كامل ===== */}
        <footer className="bg-slate-900 text-white py-10 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="font-black text-xl text-white mb-1">آمرني</p>
                <p className="text-slate-400 text-sm">منصة الخدمات للأفراد والمنشآت</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <button onClick={() => { chooseMode('individuals'); setActiveTab('about') }} className="hover:text-white transition-colors">من نحن</button>
                <button onClick={() => { chooseMode('individuals'); setActiveTab('privacy') }} className="hover:text-white transition-colors">سياسة الخصوصية</button>
                <button onClick={() => { chooseMode('individuals'); setActiveTab('terms') }} className="hover:text-white transition-colors">الشروط والأحكام</button>
                {profile?.role === 'admin' && (
                  <button onClick={() => navigate('admin')} className="text-primary-300 hover:text-white transition-colors">لوحة الإدارة</button>
                )}
                <button onClick={() => { chooseMode('individuals'); setActiveTab('support') }} className="hover:text-white transition-colors">الدعم الفني</button>
                <button onClick={() => { chooseMode('individuals'); setActiveTab('contact') }} className="hover:text-white transition-colors">اتصل بنا</button>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-6 pt-6 text-center text-slate-500 text-xs">
              © ٢٠٢٦ آمرني — جميع الحقوق محفوظة
            </div>
          </div>
        </footer>
      </div>
    )
  }

  const handleStart = () => {
    if (!taskInput.trim() && user) { goToUserHome(navigate, profile); return }
    setShowNewTask(true)
  }

  const sendContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) return
    setContactLoading(true)
    try {
      await supabase.functions.invoke('send-contact-email', {
        body: {
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
        }
      })
    } catch {}
    setContactSent(true)
    setContactLoading(false)
  }

  const sendSupport = async () => {
    const text = supportInput.trim()
    if (!text || supportLoading) return
    setSupportInput('')
    const newMsgs: SupportMsg[] = [...supportMsgs, { role: 'user', content: text }]
    setSupportMsgs(newMsgs)
    setSupportLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: {
          context: 'individuals',
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })).slice(-10)
        }
      })
      if (error) throw error
      const reply = data?.reply || 'عذراً، حدث خطأ. تواصل معنا على support@amerniksa.com'
      setSupportMsgs(p => [...p, { role: 'assistant', content: reply }])
    } catch {
      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت. تواصل معنا على support@amerniksa.com' }])
    }
    setSupportLoading(false)
  }

  if (showNewTask) return <NewTaskPage initialTask={taskInput} onClose={() => setShowNewTask(false)} />

  const TABS = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'how', label: 'كيف يعمل؟' },
    { id: 'features', label: 'الخدمات' },
    { id: 'trust', label: 'الثقة والأمان' },
    { id: 'about', label: 'من نحن' },
    { id: 'contact', label: 'اتصل بنا' },
    { id: 'support', label: 'الدعم الفني' },
    { id: 'privacy', label: 'سياسة الخصوصية' },
    { id: 'terms', label: 'الشروط والأحكام' },
  ]

  const handleBrowse = () => setShowBrowse(true)
  const handleBounties = () => navigate('bounties')
  const handleEarn = () => navigate('earn')

  if (showBrowse) return <ServiceBrowsePage onClose={() => setShowBrowse(false)} onRequestService={(roleHint) => { setShowBrowse(false); if (roleHint) setTaskInput(roleHint); setShowNewTask(true) }} />

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setMode(null)} className="flex items-center"><Logo size={28} /></button>
            <button onClick={() => setMode(null)} className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 border border-primary-200 hover:bg-primary-200 transition-colors">
              أفراد ↕
            </button>
            <button onClick={() => chooseMode('enterprises')} className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
              <Building2 size={12} /> منشآت
            </button>
          </div>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {TABS.slice(1).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-500/10 text-primary-500' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {inPortal ? (
            <button onClick={() => goToUserHome(navigate, profile)} className="bg-primary-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-primary-700 transition-colors">
              حسابي
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => { setAuthDirectMode('login'); setShowAuthDirect(true) }} className="text-slate-500 hover:text-slate-900 text-sm transition-colors">دخول</button>
              <button onClick={() => { setAuthDirectMode('register'); setShowAuthDirect(true) }} className="bg-primary-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-primary-700 transition-colors">سجّل</button>
            </div>
          )}
        </div>
        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-500 text-white font-bold' : 'text-slate-400 hover:text-slate-900'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 pt-[5.5rem] md:pt-14">

        {/* HOME */}
        {activeTab === 'home' && (
          <div>
            {/* Welcome banner */}
            {user && profile && (
              <div className="flex items-center justify-center gap-2 bg-primary-500/5 border border-primary-500/10 px-5 py-3">
                <span className="text-xl">👋</span>
                <p className="text-primary-500 font-semibold text-sm sm:text-base">
                  أهلاً {(profile as any).full_name?.split(' ')[0] || 'بك'}!
                  <span className="text-slate-500 font-normal mr-2">بماذا يمكننا مساعدتك اليوم؟</span>
                </p>
              </div>
            )}
            {/* Hero */}
            <section className="relative py-16 sm:py-24 flex flex-col items-center justify-center px-4 overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary-500/5 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a08_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a08_1px,transparent_1px)] bg-[size:60px_60px]" />
              </div>
              <div className="relative max-w-3xl mx-auto text-center w-full">
                <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 text-sm text-primary-500 mb-8">
                  <Sparkles size={13} /> آمرني — اطلب أي شيء في السعودية
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-4 sm:mb-6 leading-[1.1]">
                  <span className="text-slate-900">استأجر شخص</span>{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-500 to-accent-500">لتنفيذ مهامك!</span>
                </h1>
                <p className="text-slate-500 text-base sm:text-xl mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed px-2">
                  الذكاء الاصطناعي يساعدك، لكنه ما يقدر ينفذ المهام على أرض الواقع. هنا يجي دور أمرني. اطلب أي مهمة، وحنا نوصلك بالشخص المناسب ينفذها لك.
                </p>

                {/* Search bar */}
                <div className="relative max-w-xl mx-auto mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 bg-white border-2 border-slate-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 focus-within:border-primary-500 transition-all shadow-lg">
                    <Sparkles size={18} className="text-primary-500 flex-shrink-0" />
                    <input
                      value={taskInput} onChange={e => setTaskInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && taskInput.trim() && handleStart()}
                      placeholder={visible ? EXAMPLES[idx] : ''}
                      className="flex-1 text-right bg-transparent text-slate-900 placeholder-slate-400 text-sm outline-none"
                    />
                    <button onClick={handleStart}
                      className="bg-primary-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-colors flex-shrink-0 flex items-center gap-1.5">
                      اطلب <ArrowLeft size={14} />
                    </button>
                  </div>
                </div>

                {/* بطاقات صور: ابدأ من مثال */}
                <p className="text-sm text-slate-500 mb-3 text-right">ابدأ من مثال:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                  {REQUEST_IDEAS.slice(0, 4).map(r => (
                    <PhotoCard key={r.text} idea={r} tone="light"
                      onPick={t => { trackEvent('request_started', user?.id, { source: 'home_card', len: t.length }); setTaskInput(t); setShowNewTask(true) }}
                      photoClass="aspect-[4/5]" />
                  ))}
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-6 sm:gap-12 text-center mb-8">
                  {[[PenLine, 'اكتب طلبك بكلامك'], [Handshake, 'تتفق على السعر أولاً'], [Lock, 'دفع محفوظ لين الإنجاز'], [MessageCircle, 'محادثة داخل المنصة']].map(([I, l]: any) => (
                    <div key={l}>
                      <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-2"><I size={22} strokeWidth={1.75} /></div>
                      <div className="text-xs text-slate-500 mt-1">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Why Amerni section */}
            <section className="py-16 px-4 bg-white">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-black text-center text-slate-900 mb-3">لماذا تختار آمرني؟</h2>
                <p className="text-slate-500 text-center mb-12">لأنه يجمع لك كل خدمة تحتاجها في مكان واحد</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: UserCheck, color: 'text-primary-500', bg: 'bg-primary-50', title: 'محترفون معتمدون', desc: 'يخضع جميع مزودي الخدمة لدينا لعملية فحص وتدقيق صارمة لضمان أعلى معايير الجودة والأمان.' },
                    { icon: Shield, color: 'text-accent-500', bg: 'bg-accent-50', title: 'مدفوعات آمنة', desc: 'احجز وادفع إلكترونياً بكل سهولة وأمان عبر مدى أو أبل باي. نضمن حقوقك المالية حتى اكتمال الخدمة.' },
                    { icon: Star, color: 'text-secondary-500', bg: 'bg-secondary-50', title: 'دعم على مدار الساعة', desc: 'فريق خدمة العملاء لدينا جاهز لمساعدتك في أي وقت لضمان تجربة سلسة ومميزة.' },
                  ].map(({ icon: Icon, color, bg, title, desc }) => (
                    <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                        <Icon size={22} className={color} />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* أمثلة على ما يُطلب (توضيحية) */}
            <section className="py-16 px-4 bg-slate-50">
              <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900">أمثلة على ما تقدر تطلبه</h2>
                  <p className="text-slate-500 text-sm mt-1">اضغط على أي مثال وعدّله على كيفك — أو اكتب طلبك من الصفر</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REQUEST_IDEAS.map(r => (
                    <button key={r.text}
                      onClick={() => { trackEvent('request_started', user?.id, { source: 'home_example', len: r.text.length }); setTaskInput(r.text); setShowNewTask(true) }}
                      className="flex items-center gap-3 bg-white border border-slate-200 hover:border-primary-500 hover:bg-primary-50 rounded-2xl p-4 text-right transition-all group">
                      <span className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 transition-colors"><r.icon size={20} strokeWidth={1.75} /></span>
                      <span className="flex-1 text-sm text-slate-700 group-hover:text-primary-600 font-medium">{r.text}</span>
                      <ArrowLeft size={16} className="text-slate-300 group-hover:text-primary-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">أمثلة توضيحية — ليست مهام منفَّذة.</p>
              </div>
            </section>

            {/* CTA for workers */}
            <section className="py-16 px-4 bg-primary-500">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-black text-white mb-3">عندك وقت أو مهارة؟ اكسب منها</h2>
                <p className="text-blue-100 mb-8">سجّل في دقيقة، واستقبل طلبات الناس في منطقتك — تنفّذ الي تقدر عليه وتحدد سعرك وتستلم فلوسك في محفظتك.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => { setAuthDirectMode('register'); setShowAuthDirect(true) }}
                    className="bg-white text-primary-500 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                    سجّل كمزود خدمة
                  </button>
                  <button onClick={() => setActiveTab('how')}
                    className="border-2 border-white text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
                    تعرف على المزيد
                  </button>
                </div>
              </div>
            </section>

            {/* Explore services */}
            <section className="py-16 px-4 bg-white">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">استكشف خدماتنا</h2>
                    <p className="text-slate-500 text-sm mt-1">كل خدمة تحتاجها في مكان واحد</p>
                  </div>
                  <button onClick={() => setShowBrowse(true)} className="text-primary-500 text-sm font-semibold hover:underline">عرض الكل</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {[
                    { icon: '🚗', label: 'توصيل' },
                    { icon: '📸', label: 'تصوير' },
                    { icon: '🔍', label: 'تحقق' },
                    { icon: '🛍️', label: 'تسوق' },
                    { icon: '📚', label: 'تعليم' },
                    { icon: '⚖️', label: 'استشارات' },
                  ].map(({ icon, label }) => (
                    <button key={label} onClick={() => setShowBrowse(true)}
                      className="bg-slate-50 border border-slate-200 hover:border-primary-500 hover:bg-primary-50 rounded-2xl p-4 text-center transition-all group">
                      <div className="text-3xl mb-2">{icon}</div>
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-primary-500">{label}</p>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-slate-900">
                    <div className="text-2xl mb-3">🚗</div>
                    <h3 className="font-black text-lg mb-1">خدمات التوصيل الفاخرة</h3>
                    <p className="text-blue-100 text-sm mb-4">خدمات نقل وتوصيل خاصة بمهنية عالية وأمان تام، نضمن لك الوصول في الوقت المحدد بأفضل السيارات.</p>
                    <button onClick={() => setShowNewTask(true)} className="bg-white text-primary-500 font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-50 transition-colors">
                      اطلب الآن
                    </button>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="text-2xl mb-3">🛍️</div>
                    <h3 className="font-black text-lg text-slate-900 mb-1">المساعد الشخصي للتسوق</h3>
                    <p className="text-slate-500 text-sm mb-4">اترك عنك عناء الزحام، فريقنا جاهز لشراء كافة مستلزماتك وتوصيلها لباب بيتك.</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary-50 text-primary-500 font-bold px-3 py-1 rounded-full">قيد الإطلاق</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-10 px-4">
              <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="font-black text-xl text-white mb-1">آمرني</p>
                    <p className="text-slate-400 text-sm">منصة الخدمات والمهام اليومية</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                    <button onClick={() => setActiveTab('privacy')} className="hover:text-white transition-colors">سياسة الخصوصية</button>
                    <button onClick={() => setActiveTab('terms')} className="hover:text-white transition-colors">الشروط والأحكام</button>
                    <button onClick={() => setActiveTab('support')} className="hover:text-white transition-colors">الدعم الفني</button>
                    <button onClick={() => setActiveTab('contact')} className="hover:text-white transition-colors">اتصل بنا</button>
                  </div>
                </div>
                <div className="border-t border-slate-800 mt-6 pt-6 text-center text-slate-500 text-xs">
                  © ٢٠٢٦ آمرني — جميع الحقوق محفوظة
                </div>
              </div>
            </footer>
          </div>
        )}

        {/* HOW IT WORKS */}
        {activeTab === 'how' && (
          <section className="py-12 sm:py-20 px-4 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-3">كيف يعمل آمرني؟</h2>
                <p className="text-slate-500">من الطلب للإنجاز في دقائق</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                {STEPS.map(({ n, icon: Icon, title, desc }) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-md transition-all">
                    <div className="text-5xl font-black text-slate-100 mb-4">{n}</div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                      <Icon size={19} className="text-primary-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-primary-500 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">جاهز للبدء؟</h3>
                <p className="text-blue-100 mb-6">اكتب طلبك الآن وسيتواصل معك أفضل المحترفين في منطقتك</p>
                <button onClick={() => setShowNewTask(true)} className="bg-white text-primary-500 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                  اطلب الآن
                </button>
              </div>
            </div>
          </section>
        )}

        {/* FEATURES */}
        {activeTab === 'features' && (
          <section className="py-12 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-2xl sm:text-4xl font-black mb-3">مميزات أمرني</h2>
                <p className="text-slate-400">مختلفون عن الكل</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {[
                  { icon: Bot, title: 'ذكاء اصطناعي', desc: 'اقتراح سعر مناسب، تحقق من الهوية، حماية المحادثة من تبادل الأرقام الخارجية', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                  { icon: UserCheck, title: 'عمال موثوقون', desc: 'كل عامل مرّ بفحص هوية صارم وموافقة الأدمن قبل القبول في المنصة', color: 'text-primary-500', bg: 'bg-primary-500/10 border-primary-500/20' },
                  { icon: Shield, title: 'دفع آمن', desc: 'الطلب يكتمل فقط بعد تأكيد العميل استلام الخدمة — لا خسارة لأي طرف', color: 'text-secondary-400', bg: 'bg-secondary-500/10 border-secondary-500/20' },
                  { icon: Star, title: 'تقييم شفاف', desc: 'كل طلب ينتهي بتقييم حقيقي يبني سمعة العامل ويساعدك باختيار الأفضل', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                  { icon: MessageCircle, title: 'محادثة محمية', desc: 'تواصل مباشر مع العامل داخل المنصة — لا تشارك أرقامك مع أحد', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
                  { icon: Zap, title: 'سرعة الرد', desc: 'العمال المتاحون يشوفون طلبك فوراً ويقبلون في دقائق', color: 'text-primary-500', bg: 'bg-primary-500/10 border-primary-500/20' },
                ].map(({ icon: Icon, title, desc, color, bg }) => (
                  <div key={title} className={`bg-white border rounded-2xl p-6 hover:border-slate-300 transition-all ${bg.split(' ')[1]}`}>
                    <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center mb-4`}>
                      <Icon size={19} className={color} />
                    </div>
                    <h3 className="font-semibold mb-2 text-lg">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TRUST */}
        {activeTab === 'trust' && (
          <section className="py-12 sm:py-20 px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-2xl sm:text-4xl font-black mb-3">الثقة والأمان</h2>
                <p className="text-slate-400 max-w-lg mx-auto">نراجع بيانات مقدمي الخدمة قبل قبولهم — ودفعك محفوظ حتى تأكد اكتمال الخدمة.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
                <div className="space-y-2.5">
                  {TRUST.map(t => (
                    <div key={t} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 transition-all">
                      <div className="w-6 h-6 rounded-full bg-secondary-500/15 border border-secondary-500/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={13} className="text-secondary-500" />
                      </div>
                      <span className="text-sm text-slate-700">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Shield size={18} className="text-secondary-500" /> مراجعة هوية مقدمي الخدمة</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">يخضع جميع مزودي الخدمة لدينا لعملية فحص وتدقيق صارمة لضمان أعلى معايير الجودة والأمان.</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Shield size={18} className="text-primary-500" /> مدفوعات آمنة</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">احجز وادفع إلكترونياً بكل سهولة وأمان عبر مدى أو أبل باي. نضمن لك حقوقك المالية حتى اكتمال الخدمة بنجاح.</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Shield size={18} className="text-blue-500" /> دعم على مدار الساعة</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">فريق خدمة العملاء لدينا جاهز لمساعدتك في أي وقت، لضمان تجربة سلسة ومميزة.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ABOUT */}
        {activeTab === 'about' && (
          <section className="py-12 sm:py-20 px-4 bg-slate-50">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <div className="w-20 h-20 rounded-3xl bg-primary-500 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl font-black text-slate-900">آ</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-4">من نحن</h2>
                <p className="text-slate-500 text-lg leading-relaxed">منصة آمرني — منصة الخدمات والمهام اليومية</p>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">من نحن؟</h3>
                  <p className="text-slate-500 leading-loose">
                    نحن مؤسسة حلول الغد للخدمات الإلكترونية — نقدم منصة آمرني السعودية التي تربطك بمقدّمي خدمات موثوقين في المملكة لإنجاز مهامك وخدماتك اليومية بسرعة وأمان. بدأت الفكرة من حاجة حقيقية: كيف أجد شخصاً موثوقاً يساعدني في مهمة — من توصيل أو تسوّق أو تصوير أو مساعدة إدارية — دون خوف أو تعقيد؟
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">رسالتنا</h3>
                  <p className="text-slate-500 leading-loose">
                    نؤمن أن كل شخص يستحق مساعدة سريعة وموثوقة. سواء كنت تحتاج توصيلاً، تصويراً، مساعدة إدارية، أو استشارة متخصصة — آمرني هنا لتوصيلك بمن يساعدك بسرعة وأمان. هدفنا بناء منظومة خدمات قائمة على الثقة، حيث يكسب مقدم الخدمة بشرف ويحصل العميل على أفضل جودة.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-5">قيمنا</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { emoji: '🆔', title: 'محترفون معتمدون', desc: 'تُراجع بياناتهم قبل قبولهم في المنصة' },
                      { emoji: '⚡', title: 'استجابة سريعة', desc: 'يصلك رد المحترف في دقائق' },
                      { emoji: '💳', title: 'مدفوعات آمنة', desc: 'مدى وأبل باي — مضمون حتى الإنجاز' },
                      { emoji: '⭐', title: 'جودة مضمونة', desc: 'تقييمات حقيقية من عملاء حقيقيين' },
                    ].map(({ emoji, title, desc }) => (
                      <div key={title} className="bg-slate-50 rounded-xl p-4">
                        <div className="text-2xl mb-2">{emoji}</div>
                        <p className="font-bold text-slate-900 text-sm">{title}</p>
                        <p className="text-slate-500 text-xs mt-1">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary-500 rounded-2xl p-8 text-center">
                  <p className="text-slate-900 text-xl font-black mb-2">"آمرني وإحنا ننجز"</p>
                  <p className="text-blue-100 text-sm">أنت تطلب وإحنا نوصلك لمن ينجز</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">عن المؤسسة</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      ['اسم المؤسسة', 'مؤسسة حلول الغد للخدمات الإلكترونية'],
                      ['البنك', 'بنك البلاد'],
                      ['رقم الآيبان', COMPANY.iban],
                      ['البريد الإلكتروني', COMPANY.email],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <span className="text-slate-900 font-medium">{v}</span>
                        <span className="text-slate-400">{k}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CONTACT */}
        {activeTab === 'contact' && (
          <section className="py-12 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-2xl sm:text-4xl font-black mb-3">تواصل معنا</h2>
                <p className="text-slate-400">نحن هنا للمساعدة — تواصل معنا بأي طريقة تناسبك</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Contact info */}
                <div className="space-y-5">
                  <h3 className="font-bold text-lg mb-4">معلومات التواصل</h3>
                  {[
                    { icon: Mail, label: 'البريد الإلكتروني', value: COMPANY.email, color: 'text-primary-500' },
                    { icon: Mail, label: 'البريد الإلكتروني', value: COMPANY.email, color: 'text-primary-500' },
                    { icon: MessageCircle, label: 'الدعم المباشر', value: 'متاح ٢٤/٧ عبر الدردشة', color: 'text-blue-400' },
                    { icon: Shield, label: 'الآيبان — بنك البلاد', value: COMPANY.iban, color: 'text-slate-700' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
                      <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className={color} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="font-medium text-slate-900 mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}

                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h4 className="font-semibold mb-2">ساعات العمل</h4>
                    <div className="space-y-1.5 text-sm text-slate-500">
                      <div className="flex justify-between"><span>الأحد — الخميس</span><span className="text-slate-900">٨ص — ١١م</span></div>
                      <div className="flex justify-between"><span>الجمعة والسبت</span><span className="text-slate-900">١٠ص — ١٠م</span></div>
                      <div className="flex justify-between"><span>الدعم الآلي</span><span className="text-secondary-400">٢٤/٧</span></div>
                    </div>
                  </div>
                </div>

                {/* Contact - direct email */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <Mail size={28} className="text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">راسلنا مباشرة</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">اكتب لنا على بريدنا وسنرد عليك خلال ٢٤ ساعة</p>
                  </div>
                  <a href="mailto:${COMPANY.email}"
                    className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                    <Mail size={16} />
                    {COMPANY.email}
                  </a>
                  <p className="text-xs text-slate-400">سنرد عليك خلال ٢٤ ساعة في أيام العمل</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SUPPORT */}
        {activeTab === 'support' && (
          <section className="py-12 sm:py-20 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-4xl font-black mb-3">الدعم والمساعدة</h2>
                <p className="text-slate-400">مساعد أمرني الذكي متاح ٢٤/٧ — اسأله أي شيء</p>
              </div>

              {/* FAQ quick */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  'كيف أتابع طلبي؟', 'كيف أسجّل كمزود خدمة؟',
                  'فيه مشكلة في طلب', 'كيف يتم الدفع؟'
                ].map(q => (
                  <button key={q} onClick={() => {
                    setSupportMsgs(p => [...p, { role: 'user', content: q }])
                    setSupportInput('')
                    // Auto send
                    const msgs: SupportMsg[] = [...supportMsgs, { role: 'user', content: q }]
                    setSupportLoading(true)
                    supabase.functions.invoke('support-chat', {
                      body: { context: 'individuals', messages: msgs.map(m => ({ role: m.role, content: m.content })) }
                    }).then(({ data }) => {
                      setSupportMsgs(p => [...p, { role: 'assistant', content: data?.reply || 'عذراً، حدث خطأ.' }])
                      setSupportLoading(false)
                    }).catch(() => {
                      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت.' }])
                      setSupportLoading(false)
                    })
                  }}
                    className="text-right px-4 py-3 bg-white border border-slate-200 hover:border-primary-500/30 rounded-xl text-sm text-slate-500 hover:text-slate-900 transition-all">
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                    <Bot size={16} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">مساعد أمرني</p>
                    <div className="flex items-center gap-1.5 text-xs text-secondary-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-pulse" /> متاح الآن
                    </div>
                  </div>
                </div>

                <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
                  {supportMsgs.map((m, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-slate-100'}`}>
                        {m.role === 'assistant' ? <Bot size={13} className="text-primary-500" /> : <span className="text-xs">أ</span>}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {supportLoading && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                        <Bot size={13} className="text-primary-500" />
                      </div>
                      <div className="bg-slate-100 rounded-2xl px-4 py-3 flex gap-1">
                        {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 pb-3 border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-2 focus-within:border-primary-500/40 transition-colors">
                    <input value={supportInput} onChange={e => setSupportInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSupport()}
                      placeholder="اكتب سؤالك..." className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
                    <button onClick={sendSupport} disabled={!supportInput.trim() || supportLoading}
                      className="text-primary-500 hover:text-primary-500 disabled:opacity-30 transition-colors">
                      {supportLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center text-sm text-slate-400">
                للتواصل المباشر: <a href="mailto:${COMPANY.email}" className="text-primary-500 hover:underline">{COMPANY.email}</a>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* PRIVACY */}
      {activeTab === 'privacy' && (
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-black mb-3">سياسة الخصوصية والأمان</h2>
              <p className="text-slate-400">آخر تحديث: يونيو ٢٠٢٦</p>
            </div>
            <div className="space-y-6">
              {[
                {
                  title: '١. جمع البيانات',
                  body: 'نجمع فقط البيانات الضرورية لتشغيل المنصة: الاسم، البريد الإلكتروني، رقم الجوال، وصورة الهوية للعمال. لا نجمع أي بيانات إضافية دون إذنك الصريح.'
                },
                {
                  title: '٢. استخدام البيانات',
                  body: 'بياناتك تُستخدم حصراً لتشغيل الخدمة — التحقق من الهوية، ربط العملاء بالعمال، وإرسال الإشعارات. لا نبيع أي بيانات لأطراف ثالثة.'
                },
                {
                  title: '٣. حماية البيانات',
                  body: 'جميع البيانات مشفرة ومحمية بأعلى معايير الأمان عبر Supabase. المحادثات داخل المنصة فقط ومحمية بفلتر ذكي يمنع تسريب معلومات التواصل الخارجية.'
                },
                {
                  title: '٤. حقوق المستخدم',
                  body: 'يحق لك طلب حذف حسابك وجميع بياناتك في أي وقت عبر التواصل مع support@amerniksa.com. سنُنفذ الطلب خلال 30 يوماً.'
                },
                {
                  title: '٥. ملفات تعريف الارتباط',
                  body: 'نستخدم ملفات الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول. لا نستخدم ملفات تتبع للإعلانات.'
                },
                {
                  title: '٦. الإفصاح القانوني',
                  body: 'قد نُفصح عن بياناتك للجهات القانونية السعودية المختصة إذا طُلب ذلك بموجب أمر قضائي أو للتحقيق في نشاط مشبوه يهدد سلامة المستخدمين.'
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
              <div className="bg-secondary-500/5 border border-secondary-500/20 rounded-2xl p-6 text-center">
                <p className="text-secondary-400 font-semibold mb-1">التزامنا بحماية خصوصيتك</p>
                <p className="text-slate-400 text-sm">أمرني ملتزمة بأنظمة حماية البيانات في المملكة العربية السعودية</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TERMS */}
      {activeTab === 'terms' && (
        <section className="py-12 sm:py-20 px-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-3">الشروط والأحكام</h2>
              <p className="text-slate-500">يُرجى قراءة هذه الشروط بعناية قبل استخدام المنصة</p>
            </div>
            <div className="space-y-4">
              {[
                { title: '١. طبيعة المنصة', body: 'آمرني منصة وسيطة تربط العملاء بمقدمي الخدمات فحسب. المنصة لا تُقدّم الخدمات بنفسها. العلاقة التعاقدية تنشأ بين العميل ومقدم الخدمة مباشرة.' },
                { title: '٢. سياسة الاسترداد والاسترجاع ⭐', body: 'إذا لم يكن العميل راضياً عن الخدمة، يحق له رفع نزاع خلال 24 ساعة من تأكيد الاستلام. يراجع فريق آمرني المحادثة ويتخذ القرار المناسب خلال 24-48 ساعة. لا يتم إغلاق الطلب نهائياً إلا بعد تأكيد العميل — مما يضمن حقوقه بالكامل.' },
                { title: '٣. إخلاء مسؤولية المنصة', body: 'آمرني غير مسؤولة عن جودة الخدمة المُقدَّمة، أي احتيال أو تقصير من أي طرف، الأضرار المباشرة أو غير المباشرة، أو أي نزاعات تنشأ خارج المنصة.' },
                { title: '٤. التزامات العميل', body: 'يلتزم العميل بتقديم طلبات مشروعة ومتوافقة مع الأنظمة السعودية، وعدم مشاركة معلومات تواصل خارج المنصة، وتأكيد استلام الخدمة بصدق.' },
                { title: '٥. التزامات مقدم الخدمة', body: 'يلتزم مقدم الخدمة بتقديم بيانات صحيحة، وتنفيذ الطلبات المقبولة، وعدم التواصل مع العملاء خارج المنصة، ودفع عمولة 2% من قيمة كل طلب مكتمل خلال 72 ساعة.' },
                { title: '٦. المحتوى المحظور', body: 'يُحظر تقديم أو طلب أي خدمة تتعلق بـ: المواد المخدرة، الكحول، المحتوى الجنسي، الأسلحة، القمار، الاحتيال، أو أي نشاط مخالف للأنظمة السعودية.' },
                { title: '٧. النزاعات', body: 'في حال نشوء نزاع، يحق لأي طرف رفعه خلال 24 ساعة من إتمام الطلب. تسعى آمرني للوساطة بحسن نية. يحق لكل طرف اللجوء للجهات القضائية السعودية المختصة.' },
                { title: '٨. القانون المطبّق', body: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية وتُفسَّر وفقاً لها.' },
              ].map(({ title, body }) => (
                <div key={title} className={`bg-white border rounded-2xl p-6 shadow-sm ${title.includes('⭐') ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200'}`}>
                  <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
              <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6">
                <p className="text-primary-500 font-semibold mb-2">بالتسجيل في أمرني أنت توافق على جميع هذه الشروط</p>
                <p className="text-slate-400 text-sm">للاستفسار: <a href="mailto:${COMPANY.email}" className="text-primary-500 hover:underline">{COMPANY.email}</a></p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Direct Auth Modal */}
      {showAuthDirect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{authDirectMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
              <button onClick={() => setShowAuthDirect(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <div className="flex gap-1 bg-white rounded-xl p-1 mb-5">
              {[{ v: 'login', l: 'دخول' }, { v: 'register', l: 'حساب جديد' }].map(({ v, l }) => (
                <button key={v} onClick={() => setAuthDirectMode(v as any)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authDirectMode === v ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                  {l}
                </button>
              ))}
            </div>
            <DirectAuthForm mode={authDirectMode} onSuccess={async () => {
              setShowAuthDirect(false)
              // نجيب البروفايل فريش لأن profile في closure قديم
              const { data: { user: cu } } = await supabase.auth.getUser()
              if (cu) {
                const { data: prof } = await supabase.from('profiles').select('*').eq('id', cu.id).maybeSingle()
                goToUserHome(navigate, prof)
              } else {
                goHome(navigate)
              }
            }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={24} />
          <p className="text-slate-400 text-xs">© ٢٠٢٦ أمرني — جميع الحقوق محفوظة</p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-3 text-xs text-slate-400">
            {TABS.slice(1).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className="hover:text-slate-700 transition-colors">{t.label}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
