import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import {
  Building2, ChevronDown, ChevronUp, CheckCircle2, ArrowLeft,
  ShieldCheck, Scale, FileText, BadgeDollarSign, Award,
  Cpu, Megaphone, ShoppingCart, BarChart2, Landmark,
  Languages, Flame, Home, GraduationCap, FolderKanban,
  Leaf, Umbrella, ClipboardCheck, Send, X, Bot, Loader2,
  Mail, Shield, Star, Zap, Users, MessageCircle, Search,
  Clock, CheckCircle, AlertCircle, Package, ChevronRight
} from 'lucide-react'

// ── تجميع التخصصات في ٥ مجموعات ──
const CATEGORY_GROUPS = [
  {
    id: 'governance', label: 'الحوكمة والامتثال', icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-50',
    items: [
      { id: 'governance', label: 'الحوكمة والامتثال', desc: 'سياسات، هياكل تنظيمية، GRC' },
      { id: 'saudization', label: 'نطاقات والسعودة', desc: 'رفع نسب التوطين، نطاقات المطوّر' },
      { id: 'legal', label: 'الاستشارات القانونية', desc: 'عقود، نزاعات، قانون عمل' },
      { id: 'audit', label: 'التدقيق والمراجعة', desc: 'مراجعة داخلية، امتثال' },
    ]
  },
  {
    id: 'finance', label: 'المالية والأعمال', icon: BadgeDollarSign, color: 'text-green-500', bg: 'bg-green-50',
    items: [
      { id: 'finance', label: 'المالية والزكاة', desc: 'ضريبة القيمة المضافة، التدقيق' },
      { id: 'insurance', label: 'التأمين', desc: 'تأمين طبي وممتلكات' },
      { id: 'procurement', label: 'المشتريات', desc: 'تأهيل موردين، سياسات شراء' },
      { id: 'strategy', label: 'الاستراتيجية', desc: 'خطط تشغيلية، OKRs، رؤية 2030' },
    ]
  },
  {
    id: 'tech', label: 'التقنية والرقمي', icon: Cpu, color: 'text-purple-500', bg: 'bg-purple-50',
    items: [
      { id: 'tech', label: 'التقنية والأمن السيبراني', desc: 'تحول رقمي، حماية بيانات' },
      { id: 'marketing', label: 'التسويق الرقمي', desc: 'هوية، محتوى، إعلانات' },
      { id: 'translation', label: 'الترجمة والتعريب', desc: 'مستندات رسمية، تعريب' },
      { id: 'esg', label: 'الاستدامة وESG', desc: 'تقارير، مسؤولية اجتماعية' },
    ]
  },
  {
    id: 'hr', label: 'الموارد البشرية', icon: Users, color: 'text-orange-500', bg: 'bg-orange-50',
    items: [
      { id: 'training', label: 'التدريب والتطوير', desc: 'برامج تأهيل، قيادة' },
      { id: 'hse', label: 'السلامة المهنية', desc: 'HSE، تدريب، تقييم مخاطر' },
      { id: 'quality', label: 'الجودة وISO', desc: 'ISO 9001، ISO 14001' },
      { id: 'government', label: 'العلاقات الحكومية', desc: 'تراخيص، تسجيل' },
    ]
  },
  {
    id: 'ops', label: 'العمليات والمشاريع', icon: FolderKanban, color: 'text-teal-500', bg: 'bg-teal-50',
    items: [
      { id: 'pm', label: 'إدارة المشاريع', desc: 'PMO، PMP، PMBOK' },
      { id: 'realestate', label: 'العقارات والمرافق', desc: 'تقييم، إيجار تجاري' },
    ]
  },
]

// قائمة مسطحة لبحث
const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items)

const BUDGET_OPTIONS = ['أقل من ١٠,٠٠٠ ريال', '١٠,٠٠٠ – ٥٠,٠٠٠ ريال', '٥٠,٠٠٠ – ٢٠٠,٠٠٠ ريال', 'أكثر من ٢٠٠,٠٠٠ ريال', 'غير محدد بعد']
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

const SUPPORT_SYSTEM = `أنت مساعد خدمة عملاء متخصص لمنصة "أمرني للمنشآت" السعودية — منصة B2B تربط الشركات بمزودي خدمات في 18 تخصصاً مقسمة في 5 مجموعات:
١. الحوكمة والامتثال: الحوكمة، نطاقات والسعودة، استشارات قانونية، تدقيق ومراجعة
٢. المالية والأعمال: المالية والزكاة، تأمين، مشتريات، استراتيجية وتخطيط
٣. التقنية والرقمي: أمن سيبراني وتحول رقمي، تسويق رقمي، ترجمة، ESG واستدامة
٤. الموارد البشرية: تدريب وتطوير، HSE وسلامة، جودة وISO، علاقات حكومية
٥. العمليات والمشاريع: إدارة مشاريع، عقارات ومرافق
العمولة الحالية: ١٪ من قيمة العقد مؤقتاً — قادم نظام اشتراك شهري.
الرد خلال ٢٤ ساعة. للتواصل: support@amerniksa.com`

type Tab = 'home' | 'how' | 'features' | 'trust' | 'about' | 'contact' | 'support' | 'privacy' | 'terms' | 'my-requests' | 'provider-register'
interface SupportMsg { role: 'user' | 'assistant'; content: string }
interface LeadForm {
  company_name: string; contact_name: string; contact_email: string
  contact_phone: string; company_size: string; category: string
  description: string; budget_range: string
}
const EMPTY_FORM: LeadForm = { company_name: '', contact_name: '', contact_email: '', contact_phone: '', company_size: '', category: '', description: '', budget_range: '' }

const DRAFT_KEY = 'amerni_enterprise_draft'

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
  { id: 'my-requests', label: 'طلباتي' },
  { id: 'provider-register', label: 'سجّل كمزود' },
]

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  new:       { label: 'جديد', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  reviewing: { label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: AlertCircle },
  matched:   { label: 'تمت المطابقة', color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle },
  closed:    { label: 'مغلق', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: X },
}

export function EnterprisesPage() {
  const { user } = useAuth()
  const { navigate } = useApp()

  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  // Form
  const savedDraft = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null } })() : null
  const [form, setForm] = useState<LeadForm>(savedDraft || EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // My requests
  const [myLeads, setMyLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)

  // Provider register
  const [provForm, setProvForm] = useState({ company_name: '', contact_name: '', contact_email: '', contact_phone: '', cr_number: '', categories: [] as string[], description: '', city: '', linkedin_url: '', website_url: '' })
  const [provSubmitting, setProvSubmitting] = useState(false)
  const [provSuccess, setProvSuccess] = useState(false)
  const [provError, setProvError] = useState('')
  const [ndaAccepted, setNdaAccepted] = useState(false)

  // Support
  const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([
    { role: 'assistant', content: 'أهلاً! أنا مساعد أمرني للمنشآت. كيف أقدر أساعد منشأتك اليوم؟ 🏢' }
  ])
  const [supportInput, setSupportInput] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  // FAQ
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const setF = (k: keyof LeadForm, v: string) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch {} }

  // Load my leads when tab opens
  useEffect(() => {
    if (activeTab === 'my-requests' && user) {
      setLeadsLoading(true)
      supabase.from('enterprise_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { setMyLeads(data || []); setLeadsLoading(false) })
    }
  }, [activeTab, user])

  const openForm = (catId: string) => {
    setSelectedCat(catId)
    setF('category', catId)
    setShowForm(true)
    setSuccess(false)
    setError('')
  }

  const sanitize = (s: string) => s.replace(/[<>"']/g, '').trim()

  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.contact_email.trim() || !form.category || !form.description.trim()) {
      setError('يرجى تعبئة جميع الحقول المطلوبة'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح'); return
    }
    if (form.description.trim().length < 10) {
      setError('يرجى كتابة وصف أكثر تفصيلاً'); return
    }
    setSubmitting(true); setError('')
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
        if (err.message?.includes('ساعة')) setError('تم إرسال عدد كبير من الطلبات — حاول مجدداً بعد ساعة')
        else if (err.message?.includes('سياسة')) setError('المحتوى يخالف سياسة المنصة')
        else setError('حدث خطأ، يرجى المحاولة مجدداً')
        return
      }
      try {
        await supabase.functions.invoke('send-contact-email', {
          body: {
            name: clean.contact_name,
            email: clean.contact_email,
            message: 'تم استلام طلبكم في أمرني للمنشآت. التخصص: ' + clean.category + ' | الشركة: ' + clean.company_name + ' | سيتواصل معكم فريقنا خلال ٢٤ ساعة.'
          }
        })
      } catch {}
      clearDraft()
      setSuccess(true)
    } catch { setError('حدث خطأ، يرجى المحاولة مجدداً') }
    finally { setSubmitting(false) }
  }

  const handleProvSubmit = async () => {
    if (!provForm.company_name || !provForm.contact_name || !provForm.contact_email || provForm.categories.length === 0) {
      setProvError('يرجى تعبئة جميع الحقول المطلوبة واختيار تخصص واحد على الأقل'); return
    }
    if (!ndaAccepted) { setProvError('يرجى الموافقة على إقرار السرية'); return }
    setProvSubmitting(true); setProvError('')
    try {
      const { error: err } = await supabase.from('enterprise_providers').insert({
        ...provForm,
        company_name: sanitize(provForm.company_name),
        contact_name: sanitize(provForm.contact_name),
        contact_email: provForm.contact_email.trim().toLowerCase(),
        description: sanitize(provForm.description),
        user_id: user?.id ?? null,
        is_approved: false,
        nda_accepted: ndaAccepted,
      })
      if (err) throw err
      setProvSuccess(true)
    } catch { setProvError('حدث خطأ، يرجى المحاولة مجدداً') }
    finally { setProvSubmitting(false) }
  }

  const toggleProvCat = (id: string) =>
    setProvForm(f => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter(c => c !== id) : [...f.categories, id] }))

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
      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت.' }])
    }
    setSupportLoading(false)
  }

  // Filtered categories
  const filteredCats = catSearch.trim()
    ? ALL_CATEGORIES.filter(c => c.label.includes(catSearch) || c.desc.includes(catSearch))
    : null

  const selectedCatLabel = ALL_CATEGORIES.find(c => c.id === selectedCat)?.label || ''

  const faqs = [
    { q: 'كيف يعمل النظام؟', a: 'أرسل طلبك، وفريقنا يراجعه ويوصلك بأفضل مزود خدمة معتمد خلال ٢٤ ساعة.' },
    { q: 'كم تبلغ العمولة؟', a: 'العمولة الحالية ١٪ من قيمة العقد مؤقتاً، تُحوَّل خلال ٧٢ ساعة من التعاقد. قريباً نطلق نظام اشتراك شهري.' },
    { q: 'هل يمكن تغيير المزود بعد المطابقة؟', a: 'نعم، إذا لم يناسبك المزود المقترح نعيد البحث مجاناً.' },
    { q: 'كيف أتتبع طلبي؟', a: 'سجّل دخول وافتح تبويب "طلباتي" لترى حالة طلباتك كاملة.' },
    { q: 'كيف أسجّل كمزود خدمة؟', a: 'افتح تبويب "سجّل كمزود" واملأ النموذج — سيراجع فريقنا طلبك ويتواصل معك.' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('landing')} className="text-xl font-black text-primary-500">أمرني</button>
            <button onClick={() => navigate('landing')} className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors">منشآت ↕</button>
          </div>
          <div className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {TABS.filter(t => !['my-requests','provider-register'].includes(t.id)).slice(1).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-500/10 text-primary-500' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button onClick={() => setActiveTab('my-requests')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeTab === 'my-requests' ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 text-slate-600 hover:border-primary-300'}`}>
                طلباتي
              </button>
            )}
            <button onClick={() => setActiveTab('provider-register')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${activeTab === 'provider-register' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
              سجّل كمزود
            </button>
            <button onClick={() => { setSelectedCat(null); setForm(savedDraft || EMPTY_FORM); setSuccess(false); setShowForm(true) }}
              className="bg-primary-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-primary-600 transition-colors">
              أرسل طلبك
            </button>
          </div>
        </div>
        <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {['how','features','trust','support','my-requests','provider-register'].map(id => {
            const t = TABS.find(x => x.id === id)!
            return (
              <button key={id} onClick={() => setActiveTab(id as Tab)}
                className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${activeTab === id ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400'}`}>
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="flex-1 pt-14">

        {/* ══ HOME ══ */}
        {activeTab === 'home' && (
          <div>
            <section className="bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 text-white py-20 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-1.5 text-primary-300 text-sm mb-6">
                  <Building2 size={14} /><span>خدمات المنشآت والشركات</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                  وصّل منشأتك<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-400 to-blue-400">بأفضل المستشارين المعتمدين</span>
                </h1>
                <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">١٨ تخصصاً — مطابقة خلال ٢٤ ساعة — عمولة ١٪ مؤقتاً</p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400 mb-10">
                  {['مطابقة خلال ٢٤ ساعة','مزودون موثّقون','عمولة ١٪ مؤقتاً','تعاقد مباشر'].map(t => (
                    <div key={t} className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-primary-400" /><span>{t}</span></div>
                  ))}
                </div>
                <button onClick={() => { setSelectedCat(null); setForm(savedDraft || EMPTY_FORM); setSuccess(false); setShowForm(true) }}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-3 rounded-2xl transition-colors">
                  أرسل طلبك الآن — مجاناً
                </button>
              </div>
            </section>

            {/* Search + Categories */}
            <section className="py-16 px-4 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">اختر التخصص</h2>
                  <p className="text-slate-500 mb-6">١٨ تخصصاً في ٥ مجموعات</p>
                  <div className="relative max-w-md mx-auto">
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={catSearch} onChange={e => setCatSearch(e.target.value)}
                      placeholder="ابحث عن تخصص..."
                      className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                  </div>
                </div>

                {/* Search results */}
                {filteredCats !== null ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredCats.length === 0 ? (
                      <p className="col-span-full text-center text-slate-400 py-8">لا توجد نتائج</p>
                    ) : filteredCats.map(cat => (
                      <button key={cat.id} onClick={() => openForm(cat.id)}
                        className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right hover:border-primary-400 hover:shadow-md transition-all flex flex-col gap-2">
                        <p className="text-sm font-bold text-slate-900">{cat.label}</p>
                        <p className="text-xs text-slate-400">{cat.desc}</p>
                        <span className="text-xs text-primary-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">اختر ←</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Grouped view */
                  <div className="space-y-4">
                    {CATEGORY_GROUPS.map(group => {
                      const Icon = group.icon
                      const isOpen = expandedGroup === group.id
                      return (
                        <div key={group.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                          <button onClick={() => setExpandedGroup(isOpen ? null : group.id)}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                            <div className={`w-9 h-9 rounded-xl ${group.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon size={18} className={group.color} />
                            </div>
                            <div className="flex-1 text-right">
                              <p className="font-bold text-slate-900 text-sm">{group.label}</p>
                              <p className="text-xs text-slate-400">{group.items.length} تخصصات</p>
                            </div>
                            {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          </button>
                          {isOpen && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 pb-4">
                              {group.items.map(cat => (
                                <button key={cat.id} onClick={() => openForm(cat.id)}
                                  className="group bg-slate-50 border border-slate-200 rounded-xl p-3 text-right hover:border-primary-400 transition-all">
                                  <p className="text-xs font-bold text-slate-900 mb-1">{cat.label}</p>
                                  <p className="text-xs text-slate-400 leading-relaxed">{cat.desc}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Stats */}
            <section className="py-12 px-4 bg-slate-50">
              <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
                {[['١٨','تخصصاً'],['٢٤س','وقت الرد'],['١٪','عمولة مؤقتة']].map(([v,l]) => (
                  <div key={l}><div className="text-3xl font-black text-primary-500 mb-1">{v}</div><div className="text-sm text-slate-500">{l}</div></div>
                ))}
              </div>
            </section>

            <section className="py-16 px-4 bg-primary-900 text-white text-center">
              <h2 className="text-2xl font-black mb-3">جاهز تبدأ؟</h2>
              <p className="text-primary-200 mb-2">أرسل طلبك الآن — الرد خلال ٢٤ ساعة</p>
              <p className="text-primary-300 text-xs mb-6">عمولة ١٪ مؤقتاً • قادم نظام اشتراك شهري</p>
              <button onClick={() => { setSelectedCat(null); setForm(savedDraft || EMPTY_FORM); setSuccess(false); setShowForm(true) }}
                className="bg-white text-primary-900 font-bold px-8 py-3 rounded-2xl hover:bg-primary-50 transition-colors">
                أرسل طلبك الآن
              </button>
            </section>
          </div>
        )}

        {/* ══ MY REQUESTS ══ */}
        {activeTab === 'my-requests' && (
          <section className="min-h-[calc(100vh-56px)] py-12 px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-black text-slate-900 mb-2">طلباتي</h2>
              <p className="text-slate-500 mb-8">تابع حالة طلباتك المرسلة لأمرني للمنشآت</p>

              {!user ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                  <Building2 size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-600 font-medium mb-2">سجّل دخول لمتابعة طلباتك</p>
                  <p className="text-slate-400 text-sm">الطلبات المرسلة بدون حساب لا يمكن تتبعها</p>
                </div>
              ) : leadsLoading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
              ) : myLeads.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                  <Package size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-600 font-medium mb-2">لا يوجد طلبات بعد</p>
                  <button onClick={() => { setSelectedCat(null); setShowForm(true) }} className="mt-3 bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-primary-600 transition-colors">
                    أرسل أول طلب
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLeads.map(lead => {
                    const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                    const StIcon = st.icon
                    const catLabel = ALL_CATEGORIES.find(c => c.id === lead.category)?.label || lead.category
                    return (
                      <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-bold text-slate-900">{lead.company_name}</p>
                            <p className="text-sm text-slate-500">{catLabel}</p>
                          </div>
                          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${st.color}`}>
                            <StIcon size={11} />{st.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed mb-3">{lead.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                          {lead.budget_range && <span>الميزانية: {lead.budget_range}</span>}
                          {lead.company_size && <span>الحجم: {lead.company_size} موظف</span>}
                          <span>{new Date(lead.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                        {lead.status === 'matched' && lead.notes && (
                          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                            <p className="font-bold mb-1">ملاحظة من الفريق:</p>
                            <p>{lead.notes}</p>
                          </div>
                        )}
                        {lead.status === 'new' && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-blue-500">
                            <Clock size={12} /><span>قيد المراجعة — الرد خلال ٢٤ ساعة</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ PROVIDER REGISTER ══ */}
        {activeTab === 'provider-register' && (
          <section className="min-h-[calc(100vh-56px)] py-12 px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-black text-slate-900 mb-2">سجّل كمزود خدمة</h2>
              <p className="text-slate-500 mb-8">انضم لشبكة مزودي الخدمات المعتمدين في أمرني للمنشآت</p>

              {provSuccess ? (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-black text-slate-900 mb-2">تم استلام طلبك!</h3>
                  <p className="text-slate-500">سيراجع فريقنا طلبك ويتواصل معك خلال ٤٨ ساعة</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* NDA first */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><Shield size={16} />إقرار السرية — مطلوب</h3>
                    <p className="text-sm text-amber-700 leading-relaxed mb-4">
                      بتسجيلك كمزود خدمة في أمرني للمنشآت، تتعهد بالحفاظ على سرية بيانات الشركات التي تُطابق معها، وعدم استخدامها لأي غرض خارج نطاق الخدمة المتفق عليها، وعدم التواصل مع الشركات خارج المنصة.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={ndaAccepted} onChange={e => setNdaAccepted(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-500" />
                      <span className="text-sm font-bold text-amber-800">أوافق على إقرار السرية</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[['اسم الشركة *','company_name','شركة المستقبل'],['اسم المسؤول *','contact_name','محمد العبدالله']].map(([lbl,key,ph]) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{lbl}</label>
                        <input value={(provForm as any)[key]} onChange={e => setProvForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={ph} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                      <input type="email" value={provForm.contact_email} onChange={e => setProvForm(f => ({ ...f, contact_email: e.target.value }))}
                        placeholder="info@company.com" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال</label>
                      <input value={provForm.contact_phone} onChange={e => setProvForm(f => ({ ...f, contact_phone: e.target.value }))}
                        placeholder="05xxxxxxxx" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">رقم السجل التجاري</label>
                      <input value={provForm.cr_number} onChange={e => setProvForm(f => ({ ...f, cr_number: e.target.value }))}
                        placeholder="1010xxxxxx" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">المدينة</label>
                      <input value={provForm.city} onChange={e => setProvForm(f => ({ ...f, city: e.target.value }))}
                        placeholder="الرياض" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">التخصصات *</label>
                    <div className="space-y-2">
                      {CATEGORY_GROUPS.map(g => (
                        <div key={g.id} className="border border-slate-200 rounded-xl p-3">
                          <p className="text-xs font-bold text-slate-600 mb-2">{g.label}</p>
                          <div className="flex flex-wrap gap-2">
                            {g.items.map(cat => (
                              <button key={cat.id} type="button" onClick={() => toggleProvCat(cat.id)}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${provForm.categories.includes(cat.id) ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 text-slate-600 hover:border-primary-300'}`}>
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">نبذة عن خبراتك</label>
                    <textarea value={provForm.description} onChange={e => setProvForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} placeholder="اكتب نبذة عن خبراتك ومؤهلاتك..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50 resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn (اختياري)</label>
                      <input value={provForm.linkedin_url} onChange={e => setProvForm(f => ({ ...f, linkedin_url: e.target.value }))}
                        placeholder="linkedin.com/in/..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">الموقع الإلكتروني (اختياري)</label>
                      <input value={provForm.website_url} onChange={e => setProvForm(f => ({ ...f, website_url: e.target.value }))}
                        placeholder="www.company.com" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                  </div>

                  {provError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{provError}</div>}

                  <button onClick={handleProvSubmit} disabled={provSubmitting}
                    className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {provSubmitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><Send size={15} /><span>تقديم طلب التسجيل</span></>}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ HOW ══ */}
        {activeTab === 'how' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black text-slate-900 mb-3">كيف تعمل المنصة؟</h2>
                <p className="text-slate-500">من الطلب للتعاقد في ٧٢ ساعة</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                {[
                  { n:'١', icon: FileText, title:'أرسل طلبك', desc:'اختر التخصص واملأ تفاصيل احتياجك — يُحفظ مسودة تلقائياً' },
                  { n:'٢', icon: Users, title:'نوصّلك بالمناسب', desc:'فريقنا يراجع طلبك ويختار أفضل مزود معتمد خلال ٢٤ ساعة' },
                  { n:'٣', icon: Zap, title:'تعاقد وعمولة رمزية', desc:'تتواصل مع المزود مباشرة — عمولة ١٪ مؤقتاً حتى إطلاق الاشتراك' },
                ].map(({ n, icon: Icon, title, desc }) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-md transition-all">
                    <div className="text-5xl font-black text-slate-100 mb-4">{n}</div>
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-4"><Icon size={19} className="text-primary-500" /></div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mb-10">
                <h3 className="font-black text-xl text-slate-900 mb-4">أسئلة شائعة</h3>
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-right">
                      <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                      {expandedFaq === i ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {expandedFaq === i && <div className="px-5 pb-4 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>}
                  </div>
                ))}
              </div>
              <div className="bg-primary-500 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">جاهز للبدء؟</h3>
                <button onClick={() => { setActiveTab('home'); setShowForm(true) }} className="bg-white text-primary-500 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">أرسل طلبك الآن</button>
              </div>
            </div>
          </section>
        )}

        {/* ══ FEATURES ══ */}
        {activeTab === 'features' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">مميزات أمرني للمنشآت</h2>
                <p className="text-slate-400">لماذا تختار أمرني؟</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { icon: ShieldCheck, title:'مزودون موثّقون', desc:'كل مزود خضع لتحقق من السجل التجاري والمؤهلات', color:'text-primary-500', bg:'bg-primary-50 border-primary-100' },
                  { icon: Zap, title:'مطابقة سريعة', desc:'رد أولي ٢٤ ساعة ومطابقة خلال ٧٢ ساعة', color:'text-blue-500', bg:'bg-blue-50 border-blue-100' },
                  { icon: Shield, title:'إقرار سرية', desc:'كل مزود يوقع إقرار سرية قبل الاطلاع على بياناتك', color:'text-green-500', bg:'bg-green-50 border-green-100' },
                  { icon: Search, title:'١٨ تخصصاً', desc:'٥ مجموعات تغطي كل احتياجات المنشأة', color:'text-purple-500', bg:'bg-purple-50 border-purple-100' },
                  { icon: CheckCircle2, title:'متابعة الطلب', desc:'تتبع حالة طلبك من "جديد" حتى "تمت المطابقة"', color:'text-teal-500', bg:'bg-teal-50 border-teal-100' },
                  { icon: Bot, title:'دعم ذكي ٢٤/٧', desc:'مساعد AI متخصص يعرف كل تخصصات المنصة', color:'text-orange-500', bg:'bg-orange-50 border-orange-100' },
                ].map(({ icon: Icon, title, desc, color, bg }) => (
                  <div key={title} className={`bg-white border rounded-2xl p-6`}>
                    <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center mb-4`}><Icon size={19} className={color} /></div>
                    <h3 className="font-semibold mb-2 text-lg">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══ TRUST ══ */}
        {activeTab === 'trust' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">الثقة والأمان</h2>
                <p className="text-slate-400 max-w-lg mx-auto">منشأتك وبياناتها في أيدٍ أمينة</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-2.5">
                  {['التحقق من السجل التجاري لكل مزود','مراجعة المؤهلات والخبرات قبل القبول','إقرار سرية موقّع من المزود قبل رؤية بياناتك','تعاقد مباشر وشفاف بينك وبين المزود','سرية بيانات منشأتك مضمونة','إعادة المطابقة مجاناً إذا لم يناسبك المزود'].map(t => (
                    <div key={t} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4">
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[
                    { icon: ShieldCheck, color:'text-primary-500', title:'مزودون معتمدون', body:'كل مزود خضع لتدقيق شامل يشمل السجل التجاري والمؤهلات والخبرات قبل القبول.' },
                    { icon: Shield, color:'text-blue-500', title:'سرية البيانات', body:'بيانات منشأتك لا تُشارك إلا مع المزود المختار وبعد توقيعه إقرار السرية.' },
                    { icon: Star, color:'text-yellow-500', title:'ضمان الجودة', body:'إذا لم يناسبك المزود نعيد البحث مجاناً حتى تجد المثالي لاحتياجك.' },
                  ].map(({ icon: Icon, color, title, body }) => (
                    <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6">
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Icon size={18} className={color} />{title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══ ABOUT ══ */}
        {activeTab === 'about' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4 bg-slate-50">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <div className="w-20 h-20 rounded-3xl bg-primary-500 flex items-center justify-center mx-auto mb-6"><Building2 size={36} className="text-white" /></div>
                <h2 className="text-4xl font-black text-slate-900 mb-4">من نحن</h2>
                <p className="text-slate-500 text-lg">أمرني للمنشآت — منصة B2B السعودية</p>
              </div>
              <div className="space-y-6">
                {[
                  { t:'من نحن؟', b:'مؤسسة حلول الغد للخدمات الإلكترونية — نقدم منصة B2B تربط الشركات والمؤسسات السعودية بأفضل مزودي الخدمات المحترفين في ١٨ تخصصاً.' },
                  { t:'رسالتنا', b:'نؤمن أن كل منشأة تستحق الوصول لأفضل الكفاءات المهنية بسهولة وسرعة. أمرني توصلك بالمختص المناسب بضغطة واحدة.' },
                ].map(({ t, b }) => (
                  <div key={t} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{t}</h3>
                    <p className="text-slate-500 leading-loose">{b}</p>
                  </div>
                ))}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-5">قيمنا</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[['🏢','مزودون معتمدون','تدقيق شامل قبل القبول'],['⚡','مطابقة سريعة','رد خلال ٢٤ ساعة'],['🤝','تعاقد مباشر','عمولة ١٪ مؤقتاً'],['🔒','سرية تامة','إقرار موقّع من المزود']].map(([e,t,d]) => (
                      <div key={t} className="bg-slate-50 rounded-xl p-4">
                        <div className="text-2xl mb-2">{e}</div>
                        <p className="font-bold text-slate-900 text-sm">{t}</p>
                        <p className="text-slate-500 text-xs mt-1">{d}</p>
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
                    {[['اسم المؤسسة','مؤسسة حلول الغد للخدمات الإلكترونية'],['البنك','بنك البلاد'],['رقم الآيبان','SA54150009001465965400007'],['البريد','support@amerniksa.com']].map(([k,v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
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

        {/* ══ CONTACT ══ */}
        {activeTab === 'contact' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">تواصل معنا</h2>
                <p className="text-slate-400">فريق أمرني للمنشآت جاهز لمساعدتك</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  {[
                    { icon: Mail, label:'البريد الإلكتروني', value:'support@amerniksa.com', color:'text-primary-500' },
                    { icon: MessageCircle, label:'الدعم المباشر', value:'متاح ٢٤/٧ عبر الدردشة', color:'text-blue-400' },
                    { icon: Shield, label:'الآيبان — بنك البلاد', value:'SA54150009001465965400007', color:'text-slate-700' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"><Icon size={18} className={color} /></div>
                      <div><p className="text-xs text-slate-400">{label}</p><p className="font-medium text-slate-900 mt-0.5">{value}</p></div>
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
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center"><Mail size={28} className="text-primary-500" /></div>
                  <div><h3 className="font-bold text-lg text-slate-900 mb-2">راسلنا مباشرة</h3><p className="text-slate-400 text-sm">سنرد خلال ٢٤ ساعة</p></div>
                  <a href="mailto:support@amerniksa.com" className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                    <Mail size={16} />support@amerniksa.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══ SUPPORT ══ */}
        {activeTab === 'support' && (
          <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black mb-3">الدعم والمساعدة</h2>
                <p className="text-slate-400">مساعد أمرني الذكي متاح ٢٤/٧ — يعرف كل التخصصات الـ ١٨</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {['كيف أرسل طلباً؟','ما هي التخصصات المتاحة؟','كم يستغرق الرد؟','كيف أسجّل كمزود؟'].map(q => (
                  <button key={q} onClick={() => sendSupport(q)} className="text-right px-4 py-3 bg-white border border-slate-200 hover:border-primary-300 rounded-xl text-sm text-slate-500 hover:text-slate-900 transition-all">{q}</button>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center"><Bot size={16} className="text-primary-500" /></div>
                  <div>
                    <p className="text-sm font-semibold">مساعد أمرني للمنشآت</p>
                    <div className="flex items-center gap-1.5 text-xs text-green-500"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />متاح الآن</div>
                  </div>
                </div>
                <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
                  {supportMsgs.map((m, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-slate-100'}`}>
                        {m.role === 'assistant' ? <Bot size={13} className="text-primary-500" /> : <span className="text-xs">أ</span>}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>{m.content}</div>
                    </div>
                  ))}
                  {supportLoading && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center"><Bot size={13} className="text-primary-500" /></div>
                      <div className="bg-slate-100 rounded-2xl px-4 py-3 flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}</div>
                    </div>
                  )}
                </div>
                <div className="px-3 pb-3 border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-2 focus-within:border-primary-500/40 transition-colors">
                    <input value={supportInput} onChange={e => setSupportInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSupport()}
                      placeholder="اكتب سؤالك..." className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
                    <button onClick={() => sendSupport()} disabled={!supportInput.trim() || supportLoading} className="text-primary-500 disabled:opacity-30">
                      {supportLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-center text-sm text-slate-400">للتواصل المباشر: <a href="mailto:support@amerniksa.com" className="text-primary-500 hover:underline">support@amerniksa.com</a></p>
            </div>
          </section>
        )}
      </div>

      {/* ══ PRIVACY ══ */}
      {activeTab === 'privacy' && (
        <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12"><h2 className="text-4xl font-black mb-3">سياسة الخصوصية</h2><p className="text-slate-400">آخر تحديث: يوليو ٢٠٢٦</p></div>
            <div className="space-y-6">
              {[
                { t:'١. جمع البيانات', b:'نجمع فقط: اسم الشركة، معلومات التواصل، وتفاصيل الاحتياج. لا نجمع أي بيانات إضافية دون إذنك.' },
                { t:'٢. استخدام البيانات', b:'بياناتك تُستخدم للمطابقة مع مزودي الخدمة فقط. لا نبيع أي بيانات لأطراف ثالثة.' },
                { t:'٣. مشاركة البيانات', b:'بياناتك لا تُشارك مع مزود الخدمة إلا بعد توقيعه إقرار السرية والموافقة على شروط المنصة.' },
                { t:'٤. حماية البيانات', b:'جميع البيانات مشفرة عبر Supabase بأعلى معايير الأمان.' },
                { t:'٥. حقوقك', b:'يحق لك طلب حذف بياناتك كاملاً عبر support@amerniksa.com خلال 30 يوماً.' },
              ].map(({ t, b }) => (
                <div key={t} className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-bold text-slate-900 mb-3">{t}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{b}</p>
                </div>
              ))}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-green-700 font-semibold">أمرني ملتزمة بنظام حماية البيانات الشخصية السعودي (PDPL)</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ TERMS ══ */}
      {activeTab === 'terms' && (
        <section className="min-h-[calc(100vh-56px)] py-12 sm:py-20 px-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12"><h2 className="text-4xl font-black text-slate-900 mb-3">الشروط والأحكام</h2></div>
            <div className="space-y-4">
              {[
                { t:'١. طبيعة المنصة', b:'أمرني للمنشآت وسيطة تربط الشركات بمزودي الخدمات. العلاقة التعاقدية تنشأ مباشرة بين الطرفين.' },
                { t:'٢. العمولة الحالية ⭐', b:'العمولة الحالية ١٪ من قيمة العقد المُبرم، تُحوَّل لـ IBAN: SA54150009001465965400007 (بنك البلاد) خلال ٧٢ ساعة من التعاقد. هذا النظام مؤقت حتى إطلاق نظام الاشتراك الشهري.' },
                { t:'٣. نظام الاشتراك المستقبلي', b:'تعمل أمرني على إطلاق نظام اشتراك شهري (Starter / Pro / Enterprise). سيتم إبلاغ جميع المستخدمين قبل التحول بـ ٣٠ يوماً.' },
                { t:'٤. إقرار السرية', b:'كل مزود خدمة يوقع إقرار سرية ملزم قانونياً قبل الاطلاع على بيانات الشركة.' },
                { t:'٥. التزامات مزود الخدمة', b:'يلتزم المزود بالسرية التامة، وتقديم بيانات صحيحة، ودفع العمولة المستحقة، والتعامل بمهنية مع الشركات.' },
                { t:'٦. إخلاء المسؤولية', b:'أمرني غير مسؤولة عن جودة الخدمة أو أي نزاعات تنشأ خارج المنصة بين الطرفين.' },
                { t:'٧. القانون المطبّق', b:'تخضع هذه الشروط لأنظمة المملكة العربية السعودية.' },
              ].map(({ t, b }) => (
                <div key={t} className={`bg-white border rounded-2xl p-6 shadow-sm ${t.includes('⭐') ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200'}`}>
                  <h3 className="font-bold text-slate-900 mb-3">{t}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{b}</p>
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
            <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center"><Building2 size={13} className="text-white" /></div>
            <span className="text-slate-500 text-sm font-bold">أمرني للمنشآت</span>
          </div>
          <p className="text-slate-400 text-xs">© ٢٠٢٦ أمرني — جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap justify-center">
            {TABS.filter(t => !['home','my-requests','provider-register'].includes(t.id)).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="hover:text-slate-700 transition-colors">{t.label}</button>
            ))}
          </div>
        </div>
      </footer>

      {/* ══ REQUEST FORM MODAL ══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-black text-slate-900">{selectedCatLabel || 'طلب خدمة للمنشآت'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {savedDraft && !success ? '📝 مسودة محفوظة' : 'سيصلك رد خلال ٢٤ ساعة'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><X size={14} /></button>
            </div>
            {success ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-black text-slate-900 mb-2">تم استلام طلبك!</h3>
                <p className="text-slate-500 text-sm mb-6">سيتواصل فريقنا معك خلال ٢٤ ساعة. تابع حالة طلبك من تبويب "طلباتي".</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setShowForm(false)} className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">حسناً</button>
                  {user && <button onClick={() => { setShowForm(false); setActiveTab('my-requests') }} className="border border-primary-500 text-primary-500 font-bold px-6 py-2.5 rounded-xl hover:bg-primary-50 transition-colors">طلباتي</button>}
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {!selectedCat && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">التخصص المطلوب *</label>
                    <select value={form.category} onChange={e => setF('category', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر التخصص</option>
                      {CATEGORY_GROUPS.map(g => (
                        <optgroup key={g.id} label={g.label}>
                          {g.items.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[['اسم الشركة *','company_name','شركة المستقبل'],['اسم المسؤول *','contact_name','محمد العبدالله']].map(([l,k,p]) => (
                    <div key={k}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{l}</label>
                      <input value={(form as any)[k]} onChange={e => setF(k as keyof LeadForm, e.target.value)}
                        placeholder={p} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                    <input type="email" value={form.contact_email} onChange={e => setF('contact_email', e.target.value)}
                      placeholder="info@company.com" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال</label>
                    <input value={form.contact_phone} onChange={e => setF('contact_phone', e.target.value)}
                      placeholder="05xxxxxxxx" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">حجم الشركة</label>
                    <select value={form.company_size} onChange={e => setF('company_size', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} موظف</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الميزانية التقريبية</label>
                    <select value={form.budget_range} onChange={e => setF('budget_range', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر</option>
                      {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    وصف الاحتياج * <span className="text-slate-400 font-normal">({form.description.length}/3000)</span>
                  </label>
                  <textarea value={form.description} onChange={e => setF('description', e.target.value)}
                    rows={4} maxLength={3000} placeholder="اشرح احتياج منشأتك بإيجاز..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50 resize-none" />
                </div>
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>}
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><Send size={15} /><span>إرسال الطلب</span></>}
                </button>
                <p className="text-xs text-slate-400 text-center">المسودة تُحفظ تلقائياً — يمكنك الإغلاق والرجوع لاحقاً</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
