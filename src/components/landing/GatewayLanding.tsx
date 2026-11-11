import { useEffect, useState } from 'react'
import {
  ArrowLeft, PenLine, Zap, ShieldCheck, Lock, UserCheck, Headphones, Building2, FileText, Home as HomeIcon,
  ShoppingBag, Gift, Hourglass, Wand2, Send, MessagesSquare, CheckCircle2, Clock, Handshake, Camera, Landmark,
  Users, MapPin, Star, Quote,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { COMPANY } from '../../lib/constants'

// ═══════════════════════════════════════════════════════════════
// الصفحة الرئيسية (بوابة الأفراد) — التصميم الداكن الجديد.
// كل رقم ورأي في هالصفحة حقيقي: الأرقام من get_public_landing ولا تظهر
// إلا بعد ما توصل حد مقنع، والآراء من تقييمات العملاء الفعلية. قبل ذلك
// تظهر نقاط ثقة وطلبات حقيقية (بدون أسماء أصحابها) بدل أرقام وآراء مخترعة.
// ═══════════════════════════════════════════════════════════════

type Props = {
  isLoggedIn: boolean
  isAdmin: boolean
  rotatingExample: string
  onStart: (text: string) => void
  onLogin: () => void
  onMyAccount: () => void
  onEnterprises: () => void
  onTab: (tab: 'about' | 'privacy' | 'terms' | 'support' | 'contact' | 'trust') => void
  onVerify: () => void
  onJoin: () => void
  onAdmin: () => void
}

type Landing = { requests: number; completed: number; cities: number; workers: number; reviews: { name: string; city: string | null; category: string | null; stars: number; comment: string }[] }

const SERVICES = [
  { icon: FileText, tag: 'معاملات وإجراءات', tone: 'emerald', title: 'مراجعات الدوائر والوزارات والمعارض',
    desc: 'بدل ما تأخذ إجازة من دوامك أو تسافر لمدينة ثانية، منفّذ يراجع الدائرة ويسلّم أوراقك أو يستلم أصل المعاملة، ويوصلك التحديث خطوة بخطوة بالصور.',
    from: '١٢٠ ر.س', ask: 'أحتاج أحد يراجع لي معاملة في دائرة حكومية' },
  { icon: HomeIcon, tag: 'معاينة عقارية', tone: 'amber', title: 'معاينة العقارات والأراضي والمواقع',
    desc: 'بتشتري أو تستأجر في مدينة غير مدينتك؟ نرسل لك منفّذ يعاين الموقع، يقيس المسافات، ويصوّر لك فيديو شامل للواجهات والتفاصيل.',
    from: '١٥٠ ر.س', ask: 'أبي أحد يعاين لي عقار ويصوره' },
  { icon: ShoppingBag, tag: 'تسوق ومشتريات', tone: 'violet', title: 'شراء قطع غيار وأغراض نادرة',
    desc: 'بحث في التشاليح والحراج أو معارض ما توفر شحن أونلاين. نشتريها لك، نتأكد من سلامتها، ونرسلها لعنوانك.',
    from: '٩٠ ر.س', ask: 'أبي أحد يدوّر لي قطعة ويشتريها ويرسلها لي' },
  { icon: Gift, tag: 'إهداء ومناسبات', tone: 'rose', title: 'تنسيق هدايا ومفاجآت العائلة',
    desc: 'أنت بالرياض وأهلك في أبها أو جدة؟ منفّذ يشتري الباقة، يكتب الإهداء، ويوصلها للبيت بلمسة راقية.',
    from: '٨٠ ر.س', ask: 'أبي أحد يجهّز هدية ويوصلها لأهلي في مدينة ثانية' },
  { icon: Hourglass, tag: 'انتظار وحجز', tone: 'sky', title: 'الوقوف نيابة عنك في الطوابير',
    desc: 'افتتاحات المطاعم، المواعيد المزدحمة، أو شباك التذاكر: منفّذ يحجز لك مكانك أو رقمك لين توصل.',
    from: '٧٠ ر.س / ساعة', ask: 'أبي أحد يوقف عني في طابور' },
] as const

const TONES: Record<string, { chip: string; icon: string; price: string }> = {
  emerald: { chip: 'bg-emerald-500/10 text-emerald-300', icon: 'bg-emerald-500/10 text-emerald-300', price: 'text-emerald-300' },
  amber: { chip: 'bg-amber-500/10 text-amber-300', icon: 'bg-amber-500/10 text-amber-300', price: 'text-amber-300' },
  violet: { chip: 'bg-violet-500/10 text-violet-300', icon: 'bg-violet-500/10 text-violet-300', price: 'text-violet-300' },
  rose: { chip: 'bg-rose-500/10 text-rose-300', icon: 'bg-rose-500/10 text-rose-300', price: 'text-rose-300' },
  sky: { chip: 'bg-sky-500/10 text-sky-300', icon: 'bg-sky-500/10 text-sky-300', price: 'text-sky-300' },
}

const QUICK = [
  { icon: ShoppingBag, text: 'شراء غرض من معرض أو سوق وتوصيله' },
  { icon: Landmark, text: 'معاملات وإجراءات' },
  { icon: Camera, text: 'تصوير عقار أو معاينة لوكيشن' },
  { icon: Users, text: 'الوقوف في طابور أو حجز موعد' },
]

// طلبات وصلت أمرني فعلاً — بدون أسماء أصحابها. تظهر لين تتجمع ٣ آراء حقيقية.
const REAL_REQUESTS = [
  { text: 'أبي أحد يوصّل لي حلويات من محل في الأحساء إلى الخبر', city: 'الخبر', cat: 'توصيل' },
  { text: 'عندي وثيقة تأمين صحي محتاجة ربط مع مجلس الضمان الصحي', city: 'الرياض', cat: 'معاملات' },
  { text: 'أحتاج أحد يدوّر لي ٣ محلات تفصيل دواليب في جدة ويرسل لي أرقامهم وحساباتهم', city: 'جدة', cat: 'بحث وترشيح' },
]

const CITIES = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الأحساء', 'أبها', 'الطائف', 'تبوك', 'القصيم', 'حائل', 'جازان', 'نجران', 'مدينة أخرى']
const DEADLINES = ['خلال اليوم (عاجل)', 'خلال يومين', 'خلال أسبوع', 'مرن — ما فيه استعجال']

// حدود ظهور الأرقام الحقيقية: الرقم ما يطلع إلا لما يصير مقنع
const STAT_RULES = [
  { key: 'requests', min: 100, label: 'طلب وصل أمرني', icon: Send },
  { key: 'completed', min: 50, label: 'طلب اكتمل وتأكّد استلامه', icon: CheckCircle2 },
  { key: 'workers', min: 30, label: 'منفّذ معتمد', icon: UserCheck },
  { key: 'cities', min: 10, label: 'مدينة وصلتنا منها طلبات', icon: MapPin },
] as const

const fmt = (n: number) => n.toLocaleString('ar-SA')

export function GatewayLanding(p: Props) {
  const [q, setQ] = useState('')
  const [data, setData] = useState<Landing | null>(null)
  const [form, setForm] = useState({ desc: '', city: 'الرياض', deadline: DEADLINES[0], budget: '' })
  const [formErr, setFormErr] = useState('')

  useEffect(() => {
    supabase.rpc('get_public_landing').then(({ data }) => { if (data) setData(data as Landing) })
  }, [])

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.desc.trim().length < 6) { setFormErr('اكتب وش تحتاج بجملة على الأقل'); return }
    const parts = [form.desc.trim(), `المدينة: ${form.city}`, `الموعد: ${form.deadline}`]
    if (form.budget.trim()) parts.push(`الميزانية المقترحة: ${form.budget.trim()} ر.س (قابلة للتفاوض)`)
    p.onStart(parts.join('\n'))
  }

  const stats = data ? STAT_RULES.filter(r => (data as any)[r.key] >= r.min).map(r => ({ ...r, value: (data as any)[r.key] as number })) : []
  const reviews = data?.reviews || []

  return (
    <div className="min-h-screen bg-[#070B16] text-white" dir="rtl">
      {/* ── شريط التنقل ── */}
      <header className="sticky top-0 z-40 bg-[#070B16]/85 backdrop-blur border-b border-white/5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/logo-icon-256.png" alt="" className="w-9 h-9 rounded-xl bg-white p-1" />
            <div className="leading-tight">
              <p className="font-black text-white">أمرني</p>
              <p className="text-[10px] font-bold tracking-wide text-blue-400" dir="ltr">AMERNI</p>
            </div>
          </div>
          <nav aria-label="أقسام الصفحة" className="hidden lg:flex items-center gap-7 text-sm text-slate-300">
            <button onClick={() => go('services')} className="hover:text-white transition-colors">الخدمات والمهام</button>
            <button onClick={() => go('how')} className="hover:text-white transition-colors">كيف نعمل؟</button>
            <button onClick={() => go('why')} className="hover:text-white transition-colors">لماذا أمرني؟</button>
            <button onClick={() => go('stories')} className="hover:text-white transition-colors">{reviews.length >= 3 ? 'آراء العملاء' : 'طلبات حقيقية'}</button>
            <button onClick={() => go('request')} className="hover:text-white transition-colors">طلب مهمة</button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* تبديل أفراد | منشآت — الرابط الوحيد للمنشآت في صفحة الأفراد */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-0.5 text-xs">
              <span className="bg-white text-slate-900 font-bold rounded-full px-3 py-1.5">أفراد</span>
              <button onClick={p.onEnterprises} className="flex items-center gap-1 text-slate-300 hover:text-white rounded-full px-3 py-1.5">
                <Building2 size={13} /> منشآت
              </button>
            </div>
            {p.isLoggedIn
              ? <button onClick={p.onMyAccount} className="text-xs sm:text-sm font-bold sm:font-normal text-slate-300 hover:text-white">حسابي</button>
              : <button onClick={p.onLogin} className="text-xs sm:text-sm font-bold sm:font-normal text-slate-300 hover:text-white"><span className="sm:hidden">دخول</span><span className="hidden sm:inline">تسجيل الدخول</span></button>}
            <button onClick={() => go('request')} className="hidden md:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-colors">
              اطلب مهمتك الآن <ArrowLeft size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── الهيرو ── */}
      <section className="relative overflow-hidden px-4 pt-14 sm:pt-20 pb-16">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-blue-600/15 blur-3xl" />
          <div className="absolute top-60 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-700/15 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-200 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 mb-7">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> منصة سعودية لتنفيذ مهامك على أرض الواقع
          </span>
          <h1 className="font-black leading-[1.2] text-[2.35rem] sm:text-6xl lg:text-7xl mb-6">
            استأجر شخص يخلّص شغلك<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-sky-400 via-emerald-300 to-yellow-300">في ثوانٍ</span> بدون وجع رأس!
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-9">
            اكتب أي طلب يخطر ببالك — حتى لو ما لقيت له تطبيق مخصص. يتولاه منفّذ معتمد من أمرني،
            ومبلغك محجوز عندنا لين تتأكد من اكتمال الإنجاز.
          </p>

          <form onSubmit={e => { e.preventDefault(); p.onStart(q) }} className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-[#0F1729] border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/40 focus-within:border-blue-500/60 transition-colors">
              <PenLine size={18} className="text-blue-400 mr-2 flex-shrink-0" aria-hidden />
              <input value={q} onChange={e => setQ(e.target.value)} aria-label="اكتب طلبك"
                placeholder={p.rotatingExample || 'مثال: أحتاج أحد يصوّر لي فيلا في حي الملقا…'}
                className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-sm sm:text-base px-2 py-3 outline-none" />
              <button type="submit" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base px-4 sm:px-6 py-3 rounded-xl transition-colors flex-shrink-0">
                <span className="hidden sm:inline">اطلب مهمتك الآن</span><span className="sm:hidden">اطلب</span> <ArrowLeft size={16} />
              </button>
            </div>
          </form>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-400 mt-4">
            <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> نرد عليك خلال ساعة</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> تتفق على السعر قبل أي التزام مالي</span>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2 mt-8">
            <span className="text-xs text-slate-500 ml-1">مهام يطلبها عملاؤنا:</span>
            {QUICK.map(c => (
              <button key={c.text} onClick={() => p.onStart(c.text)}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors">
                <c.icon size={14} className="text-blue-300" /> {c.text}
              </button>
            ))}
          </div>
        </div>

        {/* نقاط الثقة */}
        <div id="why" className="relative max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-16 scroll-mt-20">
          {[
            { icon: Lock, tone: 'text-emerald-300 bg-emerald-500/10', t: 'دفع محفوظ ومضمون', d: 'مبلغك محجوز عندنا وما يتحوّل للمنفّذ إلا بعد ما تأكد الاستلام.' },
            { icon: UserCheck, tone: 'text-blue-300 bg-blue-500/10', t: 'منفّذون معتمدون', d: 'نراجع بيانات كل منفّذ قبل ما نقبله في المنصة.' },
            { icon: MessagesSquare, tone: 'text-violet-300 bg-violet-500/10', t: 'خصوصية كاملة', d: 'تتواصل داخل المنصة بدون ما يظهر رقم جوالك.' },
            { icon: Headphones, tone: 'text-amber-300 bg-amber-500/10', t: 'مساندة سريعة', d: 'فريق أمرني يتابع طلبك ويرد عليك خلال ساعة.' },
          ].map(x => (
            <div key={x.t} className="flex items-start gap-3 bg-[#0D1424] border border-white/[0.07] rounded-2xl p-4">
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${x.tone}`}><x.icon size={20} /></span>
              <div><p className="font-bold text-sm">{x.t}</p><p className="text-xs text-slate-400 leading-relaxed mt-1">{x.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── الخدمات ── */}
      <section id="services" className="px-4 py-16 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <p className="text-blue-400 text-sm font-bold mb-2">إمكانيات لا حدود لها</p>
            <h2 className="text-3xl sm:text-4xl font-black">وش تقدر تطلب من أمرني؟</h2>
            <p className="text-slate-400 mt-2">مهام تنفَّذ على أرض الواقع بواسطة منفّذين معتمدين</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(s => {
              const t = TONES[s.tone]
              return (
                <article key={s.title} className="flex flex-col bg-[#0D1424] border border-white/[0.07] hover:border-white/15 rounded-2xl p-6 transition-colors">
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${t.icon}`}><s.icon size={22} /></span>
                  <span className={`self-start text-[11px] font-bold rounded-md px-2 py-1 mb-3 ${t.chip}`}>{s.tag}</span>
                  <h3 className="font-black text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed flex-1">{s.desc}</p>
                  <div className="flex items-center justify-between border-t border-white/[0.07] mt-5 pt-4">
                    <p className="text-xs text-slate-500">يبدأ من <span className={`font-black text-sm ${t.price}`}>{s.from}</span></p>
                    <button onClick={() => p.onStart(s.ask)} className="flex items-center gap-1 text-sm font-bold text-blue-400 hover:text-blue-300">اطلب مثلها <ArrowLeft size={14} /></button>
                  </div>
                </article>
              )
            })}
            <article className="flex flex-col bg-gradient-to-br from-blue-900/40 to-[#0D1424] border border-blue-500/30 rounded-2xl p-6">
              <span className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-blue-600 text-white"><Wand2 size={22} /></span>
              <span className="self-start text-[11px] font-bold rounded-md px-2 py-1 mb-3 bg-blue-500/15 text-blue-300">الطلب المخصص</span>
              <h3 className="font-black text-lg mb-2">عندك طلب غريب أو غير مألوف؟</h3>
              <p className="text-sm text-slate-300 leading-relaxed flex-1">مهما كانت فكرتك خارج الصندوق، ما دامت نظامية وأخلاقية، منفّذو أمرني جاهزين ينفذونها لك باحترافية.</p>
              <button onClick={() => go('request')} className="mt-5 flex items-center justify-center gap-1.5 bg-white text-slate-900 font-bold text-sm rounded-xl py-3 hover:bg-slate-100">
                اكتب طلبك الخاص الآن <ArrowLeft size={15} />
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* ── شريط الأرقام: حقيقي فقط ── */}
      <section className="px-4">
        <div className="max-w-5xl mx-auto bg-[#0D1424] border border-white/[0.07] rounded-2xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-white/[0.07]">
          {stats.length >= 2
            ? stats.slice(0, 3).map(s => (
              <div key={s.key} className="text-center py-6 px-4">
                <p className="text-3xl font-black flex items-center justify-center gap-2"><s.icon size={20} className="text-blue-400" />+{fmt(s.value)}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))
            : [
              { icon: Handshake, v: 'السعر قبل الدفع', l: 'تتفق مع المنفّذ على السعر، وبعدها تقرر' },
              { icon: Lock, v: 'مبلغك محجوز', l: 'ما يتحوّل للمنفّذ إلا بعد تأكيدك' },
              { icon: Clock, v: 'نرد خلال ساعة', l: 'فريق أمرني يتابع طلبك من أول دقيقة' },
            ].map(s => (
              <div key={s.v} className="text-center py-6 px-4">
                <p className="text-xl sm:text-2xl font-black flex items-center justify-center gap-2"><s.icon size={20} className="text-blue-400" />{s.v}</p>
                <p className="text-xs text-slate-400 mt-1">{s.l}</p>
              </div>
            ))}
        </div>
      </section>

      {/* ── كيف نعمل ── */}
      <section id="how" className="px-4 py-20 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-blue-400 text-sm font-bold mb-2">بسيطة وسلسة</p>
            <h2 className="text-3xl sm:text-4xl font-black">كيف تعمل أمرني في ٣ خطوات؟</h2>
            <p className="text-slate-400 mt-2">لا نماذج معقدة ولا شروط صعبة. اكتب طلبك كأنك تطلبه من صديق.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '01', icon: Send, tone: 'text-blue-300 bg-blue-500/10', t: 'اكتب طلبك بلهجتك البسيطة', d: 'حدد المدينة واكتب وش تحتاج والوقت المناسب لك. ما يحتاج تختار تصنيف ولا تعبّي نماذج.', f: 'ياخذ أقل من دقيقة', fc: 'text-blue-300', fi: Clock },
              { n: '02', icon: Handshake, tone: 'text-amber-300 bg-amber-500/10', t: 'استلم العرض وتفاوض بحرية', d: 'منفّذ مناسب يقبل طلبك ويرسل لك عرض سعر. تتناقشون في المحادثة، وتوافق أو ترفض.', f: 'بدون أي التزام قبل الاتفاق', fc: 'text-amber-300', fi: ShieldCheck },
              { n: '03', icon: CheckCircle2, tone: 'text-emerald-300 bg-emerald-500/10', t: 'تابع التنفيذ واستلم وأنت مرتاح', d: 'تدفع والمبلغ ينحجز، المنفّذ ينفّذ ويرسل لك الإثبات، وما يتحوّل المبلغ إلا بعد ما تأكد الاستلام.', f: 'مبلغك محجوز لين تأكد', fc: 'text-emerald-300', fi: Lock },
            ].map(s => (
              <div key={s.n} className="relative bg-[#0D1424] border border-white/[0.07] rounded-2xl p-6">
                <span aria-hidden className="absolute top-4 left-5 text-5xl font-black text-white/[0.05]">{s.n}</span>
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${s.tone}`}><s.icon size={20} /></span>
                <h3 className="font-black text-lg mb-2">{s.t}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
                <p className={`flex items-center gap-1.5 text-xs font-bold mt-4 ${s.fc}`}><s.fi size={13} /> {s.f}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── آراء حقيقية / طلبات حقيقية ── */}
      <section id="stories" className="px-4 pb-20 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          {reviews.length >= 3 ? (
            <>
              <div className="text-center mb-10">
                <p className="text-blue-400 text-sm font-bold mb-2">من تقييمات عملائنا</p>
                <h2 className="text-3xl sm:text-4xl font-black">وش يقول عملاؤنا عن أمرني؟</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reviews.slice(0, 3).map((r, i) => (
                  <figure key={i} className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-6 flex flex-col">
                    <div className="flex gap-0.5 mb-3" aria-label={`${r.stars} من ٥`}>{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={16} className={k < r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} />)}</div>
                    <blockquote className="text-sm text-slate-300 leading-relaxed flex-1">"{r.comment}"</blockquote>
                    <figcaption className="border-t border-white/[0.07] mt-5 pt-4 text-sm">
                      <span className="font-bold">{r.name}</span>
                      <span className="text-xs text-slate-500"> · {[r.city, r.category].filter(Boolean).join(' · ')}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <p className="text-blue-400 text-sm font-bold mb-2">من طلبات وصلت أمرني فعلاً</p>
                <h2 className="text-3xl sm:text-4xl font-black">طلبات حقيقية وصلتنا</h2>
                <p className="text-slate-400 mt-2">طلبات ما لقى أصحابها لها منصة — ننشرها بدون أسمائهم</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {REAL_REQUESTS.map(r => (
                  <figure key={r.text} className="bg-[#0D1424] border border-white/[0.07] rounded-2xl p-6 flex flex-col">
                    <Quote size={22} className="text-blue-500/60 mb-3" aria-hidden />
                    <blockquote className="text-sm text-slate-200 leading-relaxed flex-1">{r.text}</blockquote>
                    <figcaption className="flex items-center justify-between border-t border-white/[0.07] mt-5 pt-4 text-xs">
                      <span className="text-slate-400 flex items-center gap-1"><MapPin size={12} /> {r.city} · {r.cat}</span>
                      <span className="bg-blue-500/15 text-blue-300 font-bold rounded-full px-2.5 py-1">طلب حقيقي</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── نموذج الطلب ── */}
      <section id="request" className="px-4 pb-24 scroll-mt-16">
        <form onSubmit={submitForm} className="max-w-2xl mx-auto bg-[#0D1424] border border-white/[0.08] rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/40">
          <div className="text-center mb-7">
            <span className="inline-block text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-400/20 rounded-full px-3 py-1 mb-3">ابدأ الطلب الفوري</span>
            <h2 className="text-3xl font-black">ابدأ بطلبك الآن</h2>
            <p className="text-sm text-slate-400 mt-1">اكتب التفاصيل، وأول منفّذ مناسب يرسل لك عرضه</p>
          </div>
          <label className="block mb-4">
            <span className="block text-sm font-bold mb-2">وش المهمة اللي تبي تنجزها؟</span>
            <textarea value={form.desc} onChange={e => { setForm(f => ({ ...f, desc: e.target.value })); setFormErr('') }} rows={4}
              placeholder="اشرح مهمتك بالتفصيل: المكان، المطلوب بالضبط، وأي ملاحظات خاصة…"
              className="w-full bg-[#070B16] border border-white/10 focus:border-blue-500/60 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 outline-none resize-none" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="block text-sm font-bold mb-2">المدينة أو المنطقة</span>
              <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full bg-[#070B16] border border-white/10 rounded-xl px-4 py-3 text-base text-white outline-none">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-bold mb-2">الموعد المطلوب للإنجاز</span>
              <select value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full bg-[#070B16] border border-white/10 rounded-xl px-4 py-3 text-base text-white outline-none">
                {DEADLINES.map(d => <option key={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <label className="block mb-5">
            <span className="block text-sm font-bold mb-2">ميزانيتك التقريبية (اختياري)</span>
            <input type="number" inputMode="numeric" min="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              placeholder="مثال: ١٥٠ ر.س (قابلة للتفاوض)"
              className="w-full bg-[#070B16] border border-white/10 focus:border-blue-500/60 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 outline-none" />
          </label>
          <p className="flex items-start gap-2 text-xs text-slate-300 bg-blue-500/10 border border-blue-400/20 rounded-xl px-4 py-3 mb-5 leading-relaxed">
            <ShieldCheck size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            تذكير: ما نطلب منك أي ريال لين تتفق مع المنفّذ على السعر وتوافق عليه بنفسك.
          </p>
          {formErr && <p className="text-sm text-red-400 font-bold mb-3">{formErr}</p>}
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-colors">
            أرسل الطلب مجاناً واستقبل العرض <ArrowLeft size={17} />
          </button>
          {!p.isLoggedIn && <p className="text-center text-xs text-slate-500 mt-3">بعد الإرسال تسجّل بثواني، وطلبك محفوظ</p>}
        </form>
      </section>

      {/* ── الفوتر ── */}
      <footer className="border-t border-white/5 bg-[#05080F] px-4 pt-12 pb-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo-icon-256.png" alt="" className="w-8 h-8 rounded-lg bg-white p-1" />
              <p className="font-black">أمرني <span className="text-slate-500 font-bold" dir="ltr">| Amerni</span></p>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">منصة سعودية تربطك بمنفّذين معتمدين ينجزون مهامك اليومية على أرض الواقع: مشاوير، مشتريات، معاملات، ومعاينات.</p>
            <p className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mt-3"><ShieldCheck size={14} /> دفع محفوظ لين تأكيد الإنجاز</p>
          </div>
          <div>
            <p className="font-bold mb-3">منصة أمرني</p>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => go('how')} className="hover:text-white">كيف نعمل؟</button></li>
              <li><button onClick={() => go('services')} className="hover:text-white">الخدمات والمهام</button></li>
              <li><button onClick={() => p.onTab('trust')} className="hover:text-white">الثقة والأمان</button></li>
              <li><button onClick={p.onJoin} className="hover:text-white">انضم كمنفّذ</button></li>
              <li><button onClick={() => p.onTab('about')} className="hover:text-white">من نحن</button></li>
            </ul>
          </div>
          <div>
            <p className="font-bold mb-3">الدعم والمساعدة</p>
            <ul className="space-y-2 text-slate-400">
              <li><button onClick={() => p.onTab('support')} className="hover:text-white">الدعم الفني</button></li>
              <li><button onClick={() => p.onTab('contact')} className="hover:text-white">اتصل بنا</button></li>
              <li><button onClick={() => p.onTab('privacy')} className="hover:text-white">سياسة الخصوصية</button></li>
              <li><button onClick={() => p.onTab('terms')} className="hover:text-white">الشروط والأحكام</button></li>
              <li><button onClick={p.onVerify} className="hover:text-white">تأكد من مورد قبل التعامل</button></li>
              {p.isAdmin && <li><button onClick={p.onAdmin} className="text-blue-400 hover:text-white">لوحة الإدارة</button></li>}
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <p className="font-bold mb-3">الدفع والتواصل</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">دفع إلكتروني آمن عبر بوابة دفع معتمدة:</p>
            <div className="flex flex-wrap gap-2 mb-4" dir="ltr">
              {['mada', 'Apple Pay', 'Visa', 'Mastercard'].map(m => (
                <span key={m} className="text-[11px] font-bold text-slate-300 bg-white/5 border border-white/10 rounded-md px-2.5 py-1">{m}</span>
              ))}
            </div>
            <a href={`mailto:${COMPANY.email}`} className="text-slate-400 hover:text-white text-xs" dir="ltr">{COMPANY.email}</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-500">
          <p>© ٢٠٢٦ جميع الحقوق محفوظة لمنصة أمرني</p>
          <p>{COMPANY.name}</p>
        </div>
      </footer>
    </div>
  )
}
