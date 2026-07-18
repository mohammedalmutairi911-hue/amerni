import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import {
  Building2, ChevronDown, ChevronUp, CheckCircle2, ArrowLeft,
  ShieldCheck, Scale, FileText, BadgeDollarSign, Award,
  Cpu, Megaphone, ShoppingCart, BarChart2, Landmark,
  Languages, Flame, Home, GraduationCap, FolderKanban,
  Leaf, Umbrella, ClipboardCheck, Send, X, Bot, Loader2,
  Mail, Shield, Star, Zap, Users, MessageCircle, Info
} from 'lucide-react'

const CATEGORIES = [
  { id: 'governance', icon: ShieldCheck, label: 'الحوكمة والامتثال', desc: 'سياسات، هياكل تنظيمية، إطار GRC' },
  { id: 'saudization', icon: Award, label: 'نطاقات والسعودة', desc: 'رفع نسب التوطين، حلول نطاقات المطوّر' },
  { id: 'legal', icon: Scale, label: 'الاستشارات القانونية', desc: 'عقود، نزاعات، قانون عمل' },
  { id: 'finance', icon: BadgeDollarSign, label: 'المالية والزكاة', desc: 'ضريبة القيمة المضافة، الزكاة، التدقيق المالي' },
  { id: 'quality', icon: ClipboardCheck, label: 'الجودة وISO', desc: 'ISO 9001، ISO 14001، تحسين العمليات' },
  { id: 'tech', icon: Cpu, label: 'التقنية والأمن السيبراني', desc: 'تحول رقمي، حماية بيانات، بنية تحتية' },
  { id: 'marketing', icon: Megaphone, label: 'التسويق والعلامة التجارية', desc: 'هوية بصرية، رقمي، محتوى' },
  { id: 'procurement', icon: ShoppingCart, label: 'المشتريات وسلاسل التوريد', desc: 'تأهيل موردين، سياسات شراء' },
  { id: 'strategy', icon: BarChart2, label: 'الاستراتيجية والتخطيط', desc: 'خطط تشغيلية، OKRs، رؤية 2030' },
  { id: 'government', icon: Landmark, label: 'العلاقات الحكومية', desc: 'تراخيص، تسجيل، تواصل مع الجهات' },
  { id: 'translation', icon: Languages, label: 'الترجمة والتعريب', desc: 'مستندات رسمية، تعريب مواقع' },
  { id: 'hse', icon: Flame, label: 'السلامة والصحة المهنية', desc: 'HSE، تدريب سلامة، تقييم مخاطر' },
  { id: 'realestate', icon: Home, label: 'العقارات والمرافق', desc: 'تقييم، إيجار تجاري، إدارة أملاك' },
  { id: 'training', icon: GraduationCap, label: 'التدريب والتطوير', desc: 'برامج تأهيل، قيادة، مهارات' },
  { id: 'pm', icon: FolderKanban, label: 'إدارة المشاريع', desc: 'PMO، PMP، جداول زمنية، PMBOK' },
  { id: 'esg', icon: Leaf, label: 'الاستدامة وESG', desc: 'تقارير ESG، بيئة، مسؤولية اجتماعية' },
  { id: 'insurance', icon: Umbrella, label: 'التأمين', desc: 'مقارنة وثائق، تأمين طبي وممتلكات' },
  { id: 'audit', icon: FileText, label: 'التدقيق والمراجعة', desc: 'مراجعة داخلية، امتثال، تقارير مجلس الإدارة' },
]

const BUDGET_OPTIONS = ['أقل من ١٠,٠٠٠ ريال', '١٠,٠٠٠ – ٥٠,٠٠٠ ريال', '٥٠,٠٠٠ – ٢٠٠,٠٠٠ ريال', 'أكثر من ٢٠٠,٠٠٠ ريال', 'غير محدد بعد']
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

const SUPPORT_SYSTEM = `أنت مساعد خدمة عملاء لمنصة "أمرني للمنشآت" السعودية — منصة B2B تربط الشركات بمزودي خدمات متخصصين في 18 تخصصاً.
مهمتك مساعدة الشركات والمنشآت بأسلوب احترافي.
المنصة تتيح: طلب خدمات استشارية واحترافية، مطابقة مع مزودي خدمة معتمدين، تعاقد مباشر بدون عمولة.
للتواصل: support@amerniksa.com`

type Tab = 'home' | 'how' | 'features' | 'trust' | 'about' | 'contact' | 'support' | 'privacy' | 'terms'
interface SupportMsg { role: 'user' | 'assistant'; content: string }
interface LeadForm {
  company_name: string; contact_name: string; contact_email: string
  contact_phone: string; company_size: string; category: string
  description: string; budget_range: string
}
const EMPTY: LeadForm = { company_name: '', contact_name: '', contact_email: '', contact_phone: '', company_size: '', category: '', description: '', budget_range: '' }

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'how', label: 'كيف يعمل؟' },
  { id: 'features', label: 'المميزات' },
  { id: 'trust', label: 'الثقة والأمان' },
  { id: 'about', label: 'من نحن' },
  { id: 'contact', label: 'اتصل بنا' },
  { id: 'support', label: 'الدعم الفني' },
  { id: 'privacy', label: 'سياسة الخصوصية' },
  { id: 'terms', label: 'الشروط والأحكام' },
]

export function EnterprisesPage() {
  const { user } = useAuth()
  const { navigate } = useApp()

  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<LeadForm>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([
    { role: 'assistant', content: 'أهلاً! أنا مساعد أمرني للمنشآت. كيف أقدر أساعد منشأتك اليوم؟ 🏢' }
  ])
  const [supportInput, setSupportInput] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  const set = (k: keyof LeadForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openForm = (catId: string) => {
    setSelectedCat(catId)
    setForm(f => ({ ...f, category: catId }))
    setShowForm(true)
    setSuccess(false)
    setError('')
  }

  const sanitize = (s: string) => s.replace(/[<>"']/g, '').trim()

  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim() || !form.category || !form.description.trim()) {
      setError('يرجى تعبئة جميع الحقول المطلوبة')
      return
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRx.test(form.contact_email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح')
      return
    }
    if (form.description.trim().length < 10) {
      setError('يرجى كتابة وصف أكثر تفصيلاً (١٠ أحرف على الأقل)')
      return
    }
    if (form.description.length > 3000) {
      setError('الوصف طويل جداً — الحد الأقصى ٣٠٠٠ حرف')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const clean = {
        company_name: sanitize(form.company_name),
        contact_name: sanitize(form.contact_name),
        contact_email: form.contact_email.trim().toLowerCase(),
        contact_phone: sanitize(form.contact_phone),
        company_size: form.company_size,
        category: form.category,
        description: sanitize(form.description),
        budget_range: form.budget_range,
        user_id: user?.id ?? null,
        status: 'new'
      }
      const { error: err } = await supabase.from('enterprise_leads').insert(clean)
      if (err) {
        if (err.message?.includes('rate') || err.message?.includes('ساعة')) {
          setError('تم إرسال عدد كبير من الطلبات — حاول مجدداً بعد ساعة')
        } else if (err.message?.includes('سياسة')) {
          setError('المحتوى يخالف سياسة المنصة — يرجى مراجعة النص')
        } else {
          setError('حدث خطأ، يرجى المحاولة مجدداً')
        }
        return
      }
      // إرسال إيميل تأكيد للعميل
      try {
        await supabase.functions.invoke('send-contact-email', {
          body: {
            name: clean.contact_name,
            email: clean.contact_email,
            message: 'تم استلام طلبكم بنجاح في أمرني للمنشآت. التخصص: ' + clean.category + ' | الشركة: ' + clean.company_name + ' | سيتواصل معكم فريقنا خلال ٢٤ ساعة. شكراً لثقتكم بأمرني.'
          }
        })
      } catch {}
      setSuccess(true)
    } catch { setError('حدث خطأ، يرجى المحاولة مجدداً') }
    finally { setSubmitting(false) }
  }

  const sendSupport = async (text?: string) => {
    const msg = (text || supportInput).trim()
    if (!msg || supportLoading) return
    setSupportInput('')
    const newMsgs: SupportMsg[] = [...supportMsgs, { role: 'user', content: msg }]
    setSupportMsgs(newMsgs)
    setSupportLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 800,
          system: SUPPORT_SYSTEM,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })).slice(-10)
        })
      })
      const data = await res.json()
      setSupportMsgs(p => [...p, { role: 'assistant', content: data.content?.[0]?.text || 'عذراً، حدث خطأ. تواصل معنا على support@amerniksa.com' }])
    } catch {
      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت. تواصل معنا على support@amerniksa.com' }])
    }
    setSupportLoading(false)
  }

  const selectedCatData = CATEGORIES.find(c => c.id === selectedCat)

  const faqs = [
    { q: 'كيف يعمل النظام؟', a: 'أرسل طلبك، وفريقنا يراجعه ويوصلك بأفضل مزود خدمة معتمد خلال ٢٤ ساعة.' },
    { q: 'هل الخدمة مجانية؟', a: 'التسجيل والمطابقة مجانية كلياً. العقد والدفع يتم مباشرة بينك وبين مزود الخدمة.' },
    { q: 'ما مدى موثوقية المزودين؟', a: 'جميع المزودين يخضعون لعملية تحقق من السجل التجاري والخبرات قبل القبول.' },
    { q: 'كم يستغرق الرد؟', a: 'الرد الأولي خلال ٢٤ ساعة، والمطابقة خلال ٧٢ ساعة كحد أقصى.' },
    { q: 'هل يمكن تغيير المزود بعد المطابقة؟', a: 'نعم، إذا لم يناسبك المزود المقترح نعيد البحث مجاناً حتى تجد الأنسب.' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('landing')} className="text-xl font-black text-primary-500">أمرني</button>
            <button onClick={() => navigate('landing')} className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent-100 text-accent-600 border border-accent-200 hover:bg-accent-200 transition-colors">
              منشآت ↕
            </button>
          </div>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {TABS.slice(1).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-500/10 text-primary-500' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setSelectedCat(null); setForm(EMPTY); setSuccess(false); setShowForm(true) }}
            className="bg-primary-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-primary-600 transition-colors">
            أرسل طلبك
          </button>
        </div>
        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {TABS.slice(1).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 pt-14">

        {/* HOME */}
        {activeTab === 'home' && (
          <div>
            {/* Hero */}
            <section className="bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 text-white py-20 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-1.5 text-primary-300 text-sm mb-6">
                  <Building2 size={14} />
                  <span>خدمات المنشآت والشركات</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                  وصّل منشأتك<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-400 to-blue-400">
                    بأفضل المستشارين المعتمدين
                  </span>
                </h1>
                <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
                  منصة أمرني تربطك بمزودي خدمات B2B محترفين في ١٨ تخصصاً — من الحوكمة والسعودة حتى الاستدامة وإدارة المشاريع.
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 mb-10">
                  {['مطابقة خلال ٢٤ ساعة', 'مزودون موثّقون', 'عمولة ١٪ مؤقتاً'].map(t => (
                    <div key={t} className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-primary-400" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setSelectedCat(null); setForm(EMPTY); setSuccess(false); setShowForm(true) }}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-3 rounded-2xl transition-colors">
                  أرسل طلبك الآن — مجاناً
                </button>
              </div>
            </section>

            {/* Categories */}
            <section className="py-16 px-4 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">اختر التخصص المطلوب</h2>
                  <p className="text-slate-500">١٨ تخصصاً متاحاً</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    return (
                      <button key={cat.id} onClick={() => openForm(cat.id)}
                        className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right hover:border-primary-400 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                          <Icon size={18} className="text-primary-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight mb-0.5">{cat.label}</p>
                          <p className="text-xs text-slate-400 leading-relaxed">{cat.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary-500 font-medium mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>أرسل طلبك</span>
                          <ArrowLeft size={11} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="py-12 px-4 bg-slate-50">
              <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
                {[['١٨', 'تخصصاً'], ['٢٤س', 'وقت الرد'], ['٠٪', 'عمولة على التعاقد']].map(([v, l]) => (
                  <div key={l}>
                    <div className="text-3xl font-black text-primary-500 mb-1">{v}</div>
                    <div className="text-sm text-slate-500">{l}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-4 bg-primary-900 text-white text-center">
              <h2 className="text-2xl font-black mb-3">جاهز تبدأ؟</h2>
              <p className="text-primary-200 mb-6">أرسل طلبك الآن — الخدمة مجانية والرد خلال ٢٤ ساعة</p>
              <button onClick={() => { setSelectedCat(null); setForm(EMPTY); setSuccess(false); setShowForm(true) }}
                className="bg-white text-primary-900 font-bold px-8 py-3 rounded-2xl hover:bg-primary-50 transition-colors">
                أرسل طلبك الآن
              </button>
            </section>
          </div>
        )}

        {/* HOW */}
        {activeTab === 'how' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black text-slate-900 mb-3">كيف تعمل المنصة؟</h2>
                <p className="text-slate-500">من الطلب للتعاقد في ٧٢ ساعة</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                {[
                  { n: '١', icon: FileText, title: 'أرسل طلبك', desc: 'اختر التخصص واملأ تفاصيل احتياج منشأتك في دقيقتين' },
                  { n: '٢', icon: Users, title: 'نوصّلك بالمناسب', desc: 'فريقنا يراجع طلبك ويختار أفضل مزود خدمة معتمد يناسبك' },
                  { n: '٣', icon: Zap, title: 'تعاقد وعمولة رمزية', desc: 'تتواصل مع المزود وتوقع العقد مباشرة — عمولة ١٪ فقط من قيمة العقد مؤقتاً حتى إطلاق نظام الاشتراك' },
                ].map(({ n, icon: Icon, title, desc }) => (
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
              {/* FAQ */}
              <div className="space-y-3">
                <h3 className="font-black text-xl text-slate-900 mb-4">أسئلة شائعة</h3>
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-right">
                      <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                      {expandedFaq === i ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                    </button>
                    {expandedFaq === i && (
                      <div className="px-5 pb-4 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-10 bg-primary-500 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">جاهز للبدء؟</h3>
                <p className="text-blue-100 text-sm mb-2">عمولة ١٪ فقط من قيمة العقد — مؤقتاً حتى إطلاق نظام الاشتراك الشهري</p>
                <button onClick={() => { setActiveTab('home'); setShowForm(true) }} className="bg-white text-primary-500 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                  أرسل طلبك الآن
                </button>
              </div>
            </div>
          </section>
        )}

        {/* FEATURES */}
        {activeTab === 'features' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">مميزات أمرني للمنشآت</h2>
                <p className="text-slate-400">لماذا تختار أمرني لخدمات B2B؟</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {[
                  { icon: ShieldCheck, title: 'مزودون موثّقون', desc: 'كل مزود خدمة خضع لعملية تحقق من السجل التجاري والخبرات والمؤهلات قبل القبول في المنصة', color: 'text-primary-500', bg: 'bg-primary-500/10 border-primary-500/20' },
                  { icon: Zap, title: 'مطابقة سريعة', desc: 'رد أولي خلال ٢٤ ساعة ومطابقة مع مزود مناسب خلال ٧٢ ساعة كحد أقصى', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
                  { icon: BadgeDollarSign, title: 'عمولة ١٪ مؤقتاً', desc: 'عمولة رمزية ١٪ من قيمة العقد حتى إطلاق نظام الاشتراك الشهري — أرخص بكثير من البديل التقليدي', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
                  { icon: BarChart2, title: 'تخصصات متعددة', desc: '١٨ تخصصاً تغطي جميع احتياجات المنشأة — من الحوكمة والسعودة حتى الاستدامة وإدارة المشاريع', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
                  { icon: Bot, title: 'دعم ذكي', desc: 'مساعد ذكاء اصطناعي متاح ٢٤/٧ للإجابة على استفساراتك ومساعدتك في تحديد احتياجاتك', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
                  { icon: Star, title: 'تقييمات موثوقة', desc: 'كل مزود خدمة لديه تقييمات حقيقية من منشآت سابقة تساعدك في اتخاذ القرار الأنسب', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                ].map(({ icon: Icon, title, desc, color, bg }) => (
                  <div key={title} className={`bg-white border rounded-2xl p-6 hover:border-slate-300 transition-all`}>
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
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">الثقة والأمان</h2>
                <p className="text-slate-400 max-w-lg mx-auto">جميع مزودي الخدمة موثّقون ومدققون — ونضمن تجربة احترافية لكل منشأة.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-2.5">
                  {['التحقق من السجل التجاري لكل مزود', 'مراجعة المؤهلات والخبرات قبل القبول', 'تعاقد مباشر وشفاف بدون وسيط', 'دعم متخصص على مدار الساعة', 'سرية بيانات منشأتك مضمونة', 'إعادة المطابقة مجاناً إذا لم يناسبك المزود'].map(t => (
                    <div key={t} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 transition-all">
                      <div className="w-6 h-6 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={13} className="text-green-500" />
                      </div>
                      <span className="text-sm text-slate-700">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[
                    { icon: ShieldCheck, color: 'text-primary-500', title: 'مزودون معتمدون', body: 'كل مزود خدمة في أمرني خضع لعملية تدقيق شاملة تشمل التحقق من السجل التجاري والمؤهلات والخبرات العملية قبل القبول في المنصة.' },
                    { icon: Shield, color: 'text-blue-500', title: 'سرية البيانات', body: 'بيانات منشأتك وتفاصيل احتياجاتك سرية تماماً ولا تُشارك مع أي طرف ثالث. نلتزم بأنظمة حماية البيانات في المملكة.' },
                    { icon: Star, color: 'text-yellow-500', title: 'ضمان الجودة', body: 'إذا لم يناسبك المزود المقترح نعيد البحث مجاناً. هدفنا أن تجد المزود المثالي لاحتياج منشأتك بدون تعقيد.' },
                  ].map(({ icon: Icon, color, title, body }) => (
                    <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Icon size={18} className={color} /> {title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ABOUT */}
        {activeTab === 'about' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4 bg-slate-50">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <div className="w-20 h-20 rounded-3xl bg-primary-500 flex items-center justify-center mx-auto mb-6">
                  <Building2 size={36} className="text-white" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4">من نحن</h2>
                <p className="text-slate-500 text-lg">أمرني للمنشآت — منصة B2B السعودية</p>
              </div>
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">من نحن؟</h3>
                  <p className="text-slate-500 leading-loose">نحن مؤسسة حلول الغد للخدمات الإلكترونية — نقدم قسم أمرني للمنشآت كمنصة B2B متخصصة تربط الشركات والمؤسسات السعودية بأفضل مزودي الخدمات المحترفين في ١٨ تخصصاً. بدأت الفكرة من حاجة حقيقية: كيف تجد منشأتك مستشاراً موثوقاً ومتخصصاً بسرعة وبدون تعقيد؟</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">رسالتنا</h3>
                  <p className="text-slate-500 leading-loose">نؤمن أن كل منشأة تستحق الوصول إلى أفضل الكفاءات المهنية بسهولة وسرعة. سواء كنت تحتاج استشارة قانونية، حلول سعودة، تدقيقاً مالياً، أو تطوير استراتيجي — أمرني للمنشآت هنا لتوصيلك بالمختص المناسب.</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-5">قيمنا</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { emoji: '🏢', title: 'مزودون معتمدون', desc: 'تدقيق شامل قبل القبول' },
                      { emoji: '⚡', title: 'مطابقة سريعة', desc: 'رد خلال ٢٤ ساعة' },
                      { emoji: '🤝', title: 'تعاقد مباشر', desc: 'بدون عمولة من أمرني' },
                      { emoji: '🔒', title: 'سرية تامة', desc: 'بياناتك محمية بالكامل' },
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
                  <p className="text-slate-900 text-xl font-black mb-2">"منشأتك بأيدٍ أمينة"</p>
                  <p className="text-blue-100 text-sm">أنت تطلب وإحنا نوصلك بالمختص الأنسب</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">عن المؤسسة</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      ['اسم المؤسسة', 'مؤسسة حلول الغد للخدمات الإلكترونية'],
                      ['البنك', 'بنك البلاد'],
                      ['رقم الآيبان', 'SA54150009001465965400007'],
                      ['البريد الإلكتروني', 'support@amerniksa.com'],
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
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">تواصل معنا</h2>
                <p className="text-slate-400">فريق أمرني للمنشآت جاهز لمساعدتك</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-5">
                  <h3 className="font-bold text-lg mb-4">معلومات التواصل</h3>
                  {[
                    { icon: Mail, label: 'البريد الإلكتروني', value: 'support@amerniksa.com', color: 'text-primary-500' },
                    { icon: MessageCircle, label: 'الدعم المباشر', value: 'متاح ٢٤/٧ عبر الدردشة', color: 'text-blue-400' },
                    { icon: Shield, label: 'الآيبان — بنك البلاد', value: 'SA54150009001465965400007', color: 'text-slate-700' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
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
                      <div className="flex justify-between"><span>الدعم الآلي</span><span className="text-green-500">٢٤/٧</span></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <Mail size={28} className="text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">راسلنا مباشرة</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">اكتب لنا على بريدنا وسنرد خلال ٢٤ ساعة</p>
                  </div>
                  <a href="mailto:support@amerniksa.com"
                    className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                    <Mail size={16} />
                    support@amerniksa.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SUPPORT */}
        {activeTab === 'support' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black mb-3">الدعم والمساعدة</h2>
                <p className="text-slate-400">مساعد أمرني الذكي متاح ٢٤/٧</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {['كيف أرسل طلباً؟', 'ما هي التخصصات المتاحة؟', 'كم يستغرق الرد؟', 'هل الخدمة مجانية؟'].map(q => (
                  <button key={q} onClick={() => sendSupport(q)}
                    className="text-right px-4 py-3 bg-white border border-slate-200 hover:border-primary-500/30 rounded-xl text-sm text-slate-500 hover:text-slate-900 transition-all">
                    {q}
                  </button>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                    <Bot size={16} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">مساعد أمرني للمنشآت</p>
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> متاح الآن
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
                    <button onClick={() => sendSupport()} disabled={!supportInput.trim() || supportLoading}
                      className="text-primary-500 disabled:opacity-30 transition-colors">
                      {supportLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-5 text-center text-sm text-slate-400">
                للتواصل المباشر: <a href="mailto:support@amerniksa.com" className="text-primary-500 hover:underline">support@amerniksa.com</a>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* PRIVACY */}
      {activeTab === 'privacy' && (
        <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black mb-3">سياسة الخصوصية والأمان</h2>
              <p className="text-slate-400">آخر تحديث: يوليو ٢٠٢٦</p>
            </div>
            <div className="space-y-6">
              {[
                { title: '١. جمع البيانات', body: 'نجمع فقط البيانات الضرورية: اسم الشركة، معلومات التواصل، وتفاصيل الاحتياج. لا نجمع أي بيانات إضافية دون إذنك الصريح.' },
                { title: '٢. استخدام البيانات', body: 'بيانات منشأتك تُستخدم حصراً للمطابقة مع مزودي الخدمة المناسبين. لا نبيع أي بيانات لأطراف ثالثة.' },
                { title: '٣. حماية البيانات', body: 'جميع البيانات مشفرة ومحمية بأعلى معايير الأمان عبر Supabase. معلومات منشأتك سرية ولا تُشارك مع مزودين غير مختارين.' },
                { title: '٤. حقوق منشأتك', body: 'يحق لك طلب حذف بيانات منشأتك في أي وقت عبر support@amerniksa.com. سنُنفذ الطلب خلال 30 يوماً.' },
                { title: '٥. الإفصاح القانوني', body: 'قد نُفصح عن البيانات للجهات القانونية السعودية المختصة إذا طُلب بموجب أمر قضائي.' },
              ].map(({ title, body }) => (
                <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 text-center">
                <p className="text-green-600 font-semibold mb-1">أمرني ملتزمة بحماية بيانات منشأتك</p>
                <p className="text-slate-400 text-sm">وفق أنظمة حماية البيانات في المملكة العربية السعودية</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TERMS */}
      {activeTab === 'terms' && (
        <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-900 mb-3">الشروط والأحكام</h2>
              <p className="text-slate-500">يُرجى قراءة هذه الشروط قبل استخدام المنصة</p>
            </div>
            <div className="space-y-4">
              {[
                { title: '١. طبيعة المنصة', body: 'أمرني للمنشآت منصة وسيطة تربط الشركات بمزودي الخدمات المتخصصين فحسب. المنصة لا تُقدّم الخدمات بنفسها. العلاقة التعاقدية تنشأ بين المنشأة ومزود الخدمة مباشرة.' },
                { title: '٢. خدمة المطابقة ⭐', body: 'أمرني تقدم خدمة مطابقة مجانية بين المنشأة ومزودي الخدمة. إذا لم يناسب المزود المقترح احتياجاتك، نعيد البحث مجاناً حتى تجد الأنسب.' },
                { title: '٣. إخلاء مسؤولية المنصة', body: 'أمرني غير مسؤولة عن جودة الخدمة المُقدَّمة، أي احتيال أو تقصير من مزود الخدمة، أو أي نزاعات تنشأ خارج المنصة.' },
                { title: '٤. التزامات المنشأة', body: 'تلتزم المنشأة بتقديم معلومات صحيحة عن احتياجاتها، والتعامل بمهنية مع مزودي الخدمة، والتفاوض بحسن نية.' },
                { title: '٥. التزامات مزود الخدمة', body: 'يلتزم مزود الخدمة بتقديم بيانات صحيحة، والحفاظ على سرية معلومات المنشأة، وتقديم الخدمة بالمستوى المتفق عليه، ودفع عمولة ١٪ من قيمة العقد المُبرم عبر المنصة خلال ٧٢ ساعة من التعاقد.' },
                { title: '٦. القانون المطبّق', body: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية.' },
              ].map(({ title, body }) => (
                <div key={title} className={`bg-white border rounded-2xl p-6 shadow-sm ${title.includes('⭐') ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200'}`}>
                  <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
              <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6">
                <p className="text-primary-500 font-semibold mb-2">باستخدام المنصة أنت توافق على هذه الشروط</p>
                <p className="text-slate-400 text-sm">للاستفسار: <a href="mailto:support@amerniksa.com" className="text-primary-500 hover:underline">support@amerniksa.com</a></p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center">
              <Building2 size={13} className="text-white" />
            </div>
            <span className="text-slate-500 text-sm font-bold">أمرني للمنشآت</span>
          </div>
          <p className="text-slate-400 text-xs">© ٢٠٢٦ أمرني — جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap justify-center">
            {TABS.slice(1).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="hover:text-slate-700 transition-colors">{t.label}</button>
            ))}
          </div>
        </div>
      </footer>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-black text-slate-900">{selectedCatData ? selectedCatData.label : 'طلب خدمة للمنشآت'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">سيصلك رد خلال ٢٤ ساعة</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X size={14} />
              </button>
            </div>
            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">تم استلام طلبك!</h3>
                <p className="text-slate-500 text-sm mb-6">سيتواصل معك فريقنا خلال ٢٤ ساعة على البريد الإلكتروني المدخل.</p>
                <button onClick={() => setShowForm(false)} className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">حسناً</button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {!selectedCat && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">التخصص المطلوب *</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر التخصص</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الشركة *</label>
                    <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="شركة المستقبل" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المسؤول *</label>
                    <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="محمد العبدالله" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                    <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="info@company.com" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال</label>
                    <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="05xxxxxxxx" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">حجم الشركة</label>
                    <select value={form.company_size} onChange={e => set('company_size', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} موظف</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الميزانية التقريبية</label>
                    <select value={form.budget_range} onChange={e => set('budget_range', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر</option>
                      {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">وصف الاحتياج *</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="اشرح احتياج منشأتك بإيجاز..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50 resize-none" />
                </div>
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>}
                <button onClick={handleSubmit} disabled={submitting} className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><Send size={15} /><span>إرسال الطلب</span></>}
                </button>
                <p className="text-xs text-slate-400 text-center">بإرسال الطلب توافق على مشاركة بياناتك مع فريق أمرني</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
