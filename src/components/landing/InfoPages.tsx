import { useEffect, useState } from 'react'
import {
  ArrowLeft, UserCheck, Zap, Lock, Star, ShieldCheck, Handshake, Lightbulb, ChevronDown, Mail, Bot, Send, Loader2,
  Compass, Briefcase, Wallet, AlertTriangle, Shield, MessagesSquare, Scale, Building2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { COMPANY } from '../../lib/constants'

// صفحتا «من نحن» و«الدعم والمساعدة» بالتصميم الداكن.
// كل رقم حقيقي (get_public_landing) ويظهر فقط بعد حد مقنع؛ لا أرقام هواتف أو مدد استجابة مخترعة.

const CARD = 'bg-[#0D1424] border border-white/[0.07] rounded-3xl'

function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.q} className="bg-[#0D1424] border border-white/[0.07] rounded-2xl overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-right">
            <span className="flex items-center gap-2.5 font-bold text-sm sm:text-base text-white"><ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" /> {it.q}</span>
            <ChevronDown size={18} className={`text-slate-400 flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && <p className="px-5 pb-5 text-sm text-slate-300 leading-relaxed">{it.a}</p>}
        </div>
      ))}
    </div>
  )
}

const FAQ = [
  { q: 'كيف تضمن أمرني أموالي وحقوقي؟', a: 'ما تدفع أي ريال قبل ما توافق على السعر اللي يرسله المنفّذ. وبعد الدفع ينحجز المبلغ عندنا، وما يتحوّل للمنفّذ إلا بعد ما ترفع له تأكيد الاستلام. ولو صار خلاف تقدر ترفع نزاع من صفحة الطلب ويراجعه فريق أمرني.' },
  { q: 'وش الخدمات اللي أقدر أطلبها؟', a: 'أي مهمة نظامية تنفَّذ على أرض الواقع: مشاوير وتوصيل، مشتريات، مراجعة دوائر ومعاملات، معاينة وتصوير عقار، حجز أو انتظار، تنسيق هدايا… وحتى الطلبات الغريبة اللي ما لقيت لها منصة.' },
  { q: 'كيف يتم قبول المنفّذين في المنصة؟', a: 'المنفّذ يسجّل بياناته ومهاراته ومدينته، وفريق أمرني يراجع الطلب قبل ما يعتمده. وبعد كل طلب يقيّمه العميل، وتقييمه يظهر لكل العملاء.' },
  { q: 'وش يصير إذا تأخر المنفّذ أو ما تواصل؟', a: 'المنفّذ عنده ساعة بعد ما يقبل الطلب يبدأ فيها التواصل معك، وإذا ما تواصل يرجع طلبك متاح لمنفّذ ثاني تلقائياً، وما يظهر له نفس الطلب مرة ثانية.' },
]

type Nav = { onStart: () => void; onJoin: () => void; onContact: () => void }

// ═══════════════ من نحن ═══════════════
export function AboutDark({ onStart, onJoin }: Nav) {
  const [stats, setStats] = useState<{ requests: number; completed: number; cities: number; workers: number } | null>(null)
  useEffect(() => { supabase.rpc('get_public_landing').then(({ data }) => data && setStats(data as any)) }, [])
  const shown = stats ? [
    { v: stats.workers, min: 30, l: 'منفّذ معتمد', c: 'text-sky-300' },
    { v: stats.completed, min: 50, l: 'مهمة منجزة', c: 'text-amber-300' },
    { v: stats.requests, min: 100, l: 'طلب وصل أمرني', c: 'text-emerald-300' },
    { v: stats.cities, min: 10, l: 'مدينة ومحافظة', c: 'text-blue-300' },
  ].filter(s => s.v >= s.min) : []

  return (
    <div className="dark-native px-4 py-14 sm:py-20 text-white" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="text-center">
          <img src="/logo-icon-256.png" alt="" className="w-20 h-20 rounded-3xl bg-white p-2 mx-auto mb-6 shadow-2xl shadow-blue-600/30" />
          <span className="inline-flex items-center gap-2 text-xs text-blue-200 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> منصة سعودية لتنفيذ المهام على أرض الواقع
          </span>
          <h1 className="text-4xl sm:text-6xl font-black mb-3">من نحن</h1>
          <p className="text-xl sm:text-2xl font-bold text-blue-400">منصة أمرني — للخدمات والمهام اليومية</p>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">نربطك بمنفّذين معتمدين ينجزون مهامك بأمان، وفلوسك محجوزة لين تتأكد إن شغلك خلص.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <section className={`${CARD} p-7 lg:col-span-3`}>
            <span className="text-[11px] font-bold text-blue-300 bg-blue-500/10 rounded-md px-2 py-1">البداية والرؤية</span>
            <h2 className="text-2xl font-black mt-4 mb-3">من نحن؟</h2>
            <p className="text-slate-300 leading-loose">
              نحن <span className="text-blue-300 font-bold">{COMPANY.name}</span> — نقدّم منصة أمرني السعودية اللي تربطك بمقدّمي خدمات موثوقين في المملكة لإنجاز مهامك وخدماتك اليومية بسرعة وأمان.
            </p>
            <div className="mt-5 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex gap-3">
              <Lightbulb size={20} className="text-amber-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">كيف ولدت فكرة أمرني؟</p>
                <p className="text-sm text-slate-400 leading-relaxed">من سؤال بسيط: <span className="text-amber-300 font-bold">كيف ألقى شخص موثوق يساعدني في مهمة</span> — توصيل، تسوّق، تصوير، أو معاملة — بدون خوف ولا تعقيد؟</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5 text-xs">
              {[{ i: Lock, t: 'دفع محجوز لين الاستلام' }, { i: Zap, t: 'رد خلال ساعة' }, { i: UserCheck, t: 'منفّذون معتمدون' }].map(x => (
                <span key={x.t} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300"><x.i size={13} className="text-emerald-400" /> {x.t}</span>
              ))}
            </div>
          </section>

          <section className={`${CARD} p-7 lg:col-span-2`}>
            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 rounded-md px-2 py-1">الغاية والقيم</span>
            <h2 className="text-2xl font-black mt-4 mb-3">رسالتنا</h2>
            <p className="text-slate-300 leading-loose">نؤمن إن كل شخص يستحق مساعدة سريعة وموثوقة. سواء احتجت توصيل أو تصوير أو مساعدة إدارية — أمرني هنا توصلك بمن يساعدك بسرعة وأمان.</p>
            <div className="mt-5 bg-emerald-500/5 border border-emerald-400/20 rounded-2xl p-5">
              <p className="font-bold text-emerald-300 flex items-center gap-2 mb-1"><Handshake size={16} /> منظومة قائمة على الثقة</p>
              <p className="text-sm text-slate-400 leading-relaxed">مقدّم الخدمة يكسب بشرف، والعميل يحصل على أفضل جودة.</p>
            </div>
          </section>
        </div>

        <section>
          <h2 className="text-3xl font-black mb-2">قيمنا ومبادئنا اللي نلتزم فيها</h2>
          <p className="text-slate-400 mb-7">أربعة مبادئ نشتغل عليها في كل طلب</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { i: UserCheck, c: 'text-sky-300 bg-sky-500/10', t: 'محترفون معتمدون', d: 'نراجع بيانات كل منفّذ قبل ما نقبله في المنصة.' },
              { i: Zap, c: 'text-amber-300 bg-amber-500/10', t: 'استجابة سريعة', d: 'طلبك يوصل للمنفّذين المناسبين فوراً، وفريقنا يرد عليك خلال ساعة.' },
              { i: Wallet, c: 'text-emerald-300 bg-emerald-500/10', t: 'مدفوعات آمنة', d: 'مدى وأبل باي والبطاقات. المبلغ محجوز لين تأكد الاستلام.' },
              { i: Star, c: 'text-rose-300 bg-rose-500/10', t: 'جودة مضمونة', d: 'تقييمات حقيقية من عملاء حقيقيين بعد كل طلب.' },
            ].map(v => (
              <div key={v.t} className={`${CARD} p-6`}>
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${v.c}`}><v.i size={20} /></span>
                <h3 className="font-black text-lg mb-2">{v.t}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${CARD} p-7 sm:p-10`}>
          <span className="text-[11px] font-bold text-blue-300 bg-blue-500/10 rounded-md px-2 py-1">الحماية والموثوقية</span>
          <h2 className="text-3xl font-black mt-4 mb-2">كيف نضمن سلامة كل معاملة على أمرني؟</h2>
          <p className="text-slate-400 mb-7 max-w-2xl">ثلاث طبقات حماية تشتغل مع كل طلب، من أول ما تكتبه لين تأكد استلامه.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '١', t: 'مراجعة المنفّذين', d: 'كل منفّذ يمر بمراجعة بياناته قبل ما يقدر يستقبل طلبات.' },
              { n: '٢', t: 'السعر قبل الدفع، والدفع محجوز', d: 'تتفق على السعر أول، وبعد الدفع ينحجز المبلغ لين تأكد الاستلام.' },
              { n: '٣', t: 'تقييم شفاف ونزاعات', d: 'تقيّم كل منفّذ بعد الطلب، ولو صار خلاف يراجعه فريق أمرني.' },
            ].map(s => (
              <div key={s.n} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center mb-4">{s.n}</span>
                <h3 className="font-bold mb-1.5">{s.t}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {shown.length >= 2 && (
          <section className="text-center">
            <h2 className="text-3xl font-black mb-7">أرقام تترجم الثقة</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {shown.map(s => (
                <div key={s.l} className={`${CARD} p-6`}>
                  <p className={`text-4xl font-black ${s.c}`}>+{s.v.toLocaleString('ar-SA')}</p>
                  <p className="text-sm text-slate-400 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto w-full">
          <h2 className="text-3xl font-black text-center mb-7">أسئلة شائعة حول أمرني</h2>
          <Faq items={FAQ} />
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-l from-[#0D1424] via-[#101B36] to-[#2A1F0A] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black mb-2">جاهز تنجز مهمتك القادمة براحة وأمان؟</h2>
            <p className="text-slate-300 max-w-xl">اكتب طلبك الحين، أو انضم لمنفّذي أمرني واكسب من مهاراتك.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={onStart} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl">اطلب من أمرني الآن <ArrowLeft size={16} /></button>
            <button onClick={onJoin} className="bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold px-6 py-3 rounded-xl">انضم كمنفّذ معتمد</button>
          </div>
        </section>

        <section className={`${CARD} p-6 max-w-3xl mx-auto w-full`}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Building2 size={17} className="text-blue-300" /> عن المؤسسة</h3>
          <div className="space-y-3 text-sm">
            {[['اسم المؤسسة', COMPANY.name], ['البنك', 'بنك البلاد'], ['رقم الآيبان', COMPANY.iban], ['البريد الإلكتروني', COMPANY.email]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center gap-4 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                <span className="text-slate-400">{k}</span>
                <span className="text-white font-medium text-left break-all" dir="auto">{v}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ═══════════════ الدعم والمساعدة ═══════════════
type Msg = { role: 'user' | 'assistant'; content: string }
export function SupportDark({ msgs, input, loading, setInput, send, ask, onContact }: {
  msgs: Msg[]; input: string; loading: boolean; setInput: (v: string) => void; send: () => void; ask: (q: string) => void; onContact: () => void
}) {
  const TOPICS = [
    { i: Compass, q: 'كيف أتابع طلبي؟' },
    { i: Briefcase, q: 'كيف أسجّل كمنفّذ خدمة؟' },
    { i: AlertTriangle, q: 'فيه مشكلة في طلب أو نزاع' },
    { i: Wallet, q: 'كيف يتم الدفع وضمان المبلغ؟' },
    { i: Shield, q: 'وش شروط الأمان وحماية البيانات؟' },
    { i: MessagesSquare, q: 'ليش ما أقدر أشارك رقمي في المحادثة؟' },
  ]
  return (
    <div className="dark-native px-4 py-14 sm:py-20 text-white" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> المساعد الذكي متاح على مدار الساعة
          </span>
          <h1 className="text-4xl sm:text-6xl font-black mb-3">الدعم والمساعدة</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">مساعد <span className="text-blue-300 font-bold">أمرني الذكي</span> يجاوب أسئلتك فوراً، وفريقنا يتابع معك أي مشكلة في طلبك.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
          {TOPICS.map(t => (
            <button key={t.q} onClick={() => ask(t.q)} disabled={loading}
              className="flex items-center justify-between gap-3 bg-[#0D1424] hover:bg-[#121B30] border border-white/[0.07] rounded-2xl px-5 py-4 text-right transition-colors disabled:opacity-60">
              <span className="flex items-center gap-3 font-bold text-sm"><span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-300 flex items-center justify-center flex-shrink-0"><t.i size={18} /></span>{t.q}</span>
              <ArrowLeft size={16} className="text-slate-500 flex-shrink-0" />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* المساعد الذكي */}
          <section id="support-chat" className={`${CARD} lg:col-span-2 overflow-hidden flex flex-col`}>
            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3">
              <span className="relative w-11 h-11 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center"><Bot size={20} />
                <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0D1424]" /></span>
              <div>
                <p className="font-bold">مساعد أمرني الذكي</p>
                <p className="text-xs text-emerald-400">متصل الآن · يرد فوراً</p>
              </div>
            </div>
            <div className="h-80 sm:h-96 overflow-y-auto px-5 py-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-tl-sm'}`}>{m.content}</div>
                </div>
              ))}
              {loading && <div className="flex justify-end"><div className="bg-white/[0.05] rounded-2xl px-4 py-3"><Loader2 size={16} className="animate-spin text-slate-400" /></div></div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); send() }} className="p-4 border-t border-white/[0.07] flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} aria-label="اكتب سؤالك" placeholder="اكتب استفسارك هنا أو اسأل عن رقم طلبك…"
                className="flex-1 min-w-0 bg-[#070B16] border border-white/10 focus:border-blue-500/60 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 outline-none" />
              <button type="submit" disabled={!input.trim() || loading} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-5 rounded-xl">
                <Send size={16} /> <span className="hidden sm:inline">إرسال</span>
              </button>
            </form>
          </section>

          <div className="space-y-4">
            <section className={`${CARD} p-6`}>
              <span className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center mb-4"><Mail size={20} /></span>
              <h2 className="font-black text-lg mb-1">راسل فريق الدعم</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">للحالات اللي تحتاج متابعة من شخص: مشكلة في دفع، طلب متعثر، أو استفسار عن حسابك.</p>
              <a href={`mailto:${COMPANY.email}`} className="block text-center bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl py-3 font-bold text-sm" dir="ltr">{COMPANY.email}</a>
              <button onClick={onContact} className="w-full mt-2 text-sm text-blue-300 hover:text-white py-2">نموذج التواصل ←</button>
            </section>
            <section className={`${CARD} p-6 border-emerald-400/20`}>
              <span className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center mb-4"><Scale size={20} /></span>
              <h2 className="font-black text-lg mb-1">تسوية النزاعات</h2>
              <p className="text-sm text-slate-400 leading-relaxed">لو صار خلاف على طلب، افتح الطلب من «طلباتي» واضغط «رفع نزاع». المبلغ يبقى محجوز لين يراجع فريق أمرني الحالة.</p>
            </section>
          </div>
        </div>

        <section className="max-w-3xl mx-auto w-full">
          <h2 className="text-3xl font-black text-center mb-2">قاعدة المعرفة والأسئلة المتكررة</h2>
          <p className="text-slate-400 text-center mb-7">إجابات مباشرة عن طريقة عمل أمرني</p>
          <Faq items={FAQ} />
        </section>
      </div>
    </div>
  )
}
