import { useState, useEffect, useRef } from 'react'
import { EnterpriseChat } from '../components/chat/EnterpriseChat'
import { COMPANY } from '../lib/constants'
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
  Clock, CheckCircle, AlertCircle, Package, ChevronRight,
  LogOut, List, LayoutDashboard, Plus, Bell
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
  open:      { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  new:       { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  reviewing: { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  matched:   { label: 'مزود قبِل — جاري التنفيذ', color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle },
  closed:    { label: 'مكتمل', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: CheckCircle },
  cancelled: { label: 'ملغى', color: 'bg-red-50 text-red-500 border-red-200', icon: X },
}

export function EnterprisesPage() {
  const { user } = useAuth()
  const { navigate, openAuth } = useApp()

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
  const [savedProfile, setSavedProfile] = useState<any>(null)
  const [hasProfile, setHasProfile] = useState(false)

  // تحميل بروفايل الشركة المحفوظ + الإيميل تلقائياً (تعبئة تلقائية)
  useEffect(() => {
    if (!user) return
    supabase.from('company_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSavedProfile(data)
          setHasProfile(true)
        }
      })
  }, [user?.id])

  // دالة تجهيز نموذج جديد مع التعبئة التلقائية
  const buildPrefilledForm = (): LeadForm => ({
    company_name: savedProfile?.company_name || '',
    contact_name: savedProfile?.contact_name || '',
    contact_email: user?.email || '',
    contact_phone: savedProfile?.contact_phone || '',
    company_size: savedProfile?.company_size || '',
    category: '', description: '', budget_range: ''
  })

  // My requests
  const [myLeads, setMyLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)

  // Provider register
  const [provForm, setProvForm] = useState({
    // بيانات أساسية
    company_name: '', contact_name: '', contact_email: '', contact_phone: '', city: '',
    // وثائق التحقق
    cr_number: '',           // رقم السجل التجاري
    cr_expiry: '',           // تاريخ انتهاء السجل
    freelance_doc: '',       // رقم وثيقة العمل الحر (للأفراد)
    vat_number: '',          // الرقم الضريبي
    provider_type: 'company' as 'company' | 'freelancer', // نوع المزود
    // المؤهلات
    years_experience: '',    // سنوات الخبرة
    certifications: '',      // الشهادات المهنية (PMP، ISO Lead Auditor، إلخ)
    prev_clients: '',        // عملاء سابقون (شركات مرجعية)
    // التخصصات
    categories: [] as string[],
    description: '',
    // روابط
    linkedin_url: '', website_url: '',
  })
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
  const [dashSection, setDashSection] = useState<'dashboard' | 'orders' | 'new-request'>('dashboard')

  const setF = (k: keyof LeadForm, v: string) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch {} }

  // SEO — تحديث العنوان والوصف لصفحة المنشآت
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'أمرني للمنشآت — خدمات B2B للشركات السعودية'
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') || ''
    meta?.setAttribute('content', 'منصة B2B سعودية تربط شركتك بمزودي خدمات معتمدين في ١٨ تخصصاً — حوكمة، سعودة، قانوني، مالي، جودة، تقنية والمزيد. مطابقة خلال ٢٤ ساعة.')
    return () => {
      document.title = prevTitle
      meta?.setAttribute('content', prevDesc)
    }
  }, [])

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
    if (!user) {
      setError('يرجى تسجيل الدخول أولاً لإرسال الطلب ومتابعته')
      openAuth('signup')
      return
    }
    // دمج البيانات المحفوظة مع الحقول الحالية
    const effective = {
      company_name: form.company_name.trim() || savedProfile?.company_name || '',
      contact_name: form.contact_name.trim() || savedProfile?.contact_name || '',
      contact_email: form.contact_email.trim() || user.email || '',
      contact_phone: form.contact_phone.trim() || savedProfile?.contact_phone || '',
      company_size: form.company_size || savedProfile?.company_size || '',
    }
    if (!form.category || !form.description.trim()) {
      setError('يرجى اختيار التخصص وكتابة وصف الاحتياج'); return
    }
    if (!effective.company_name || !effective.contact_name || !effective.contact_email) {
      setHasProfile(false)
      setError('يرجى تعبئة بيانات التواصل'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effective.contact_email)) {
      setHasProfile(false); setError('يرجى إدخال بريد إلكتروني صحيح'); return
    }
    if (effective.contact_phone && !/^05[0-9]{8}$/.test(effective.contact_phone)) {
      setHasProfile(false); setError('رقم الجوال يجب أن يكون ١٠ أرقام يبدأ بـ 05'); return
    }
    if (form.description.trim().length < 10) {
      setError('يرجى كتابة وصف أكثر تفصيلاً'); return
    }
    setSubmitting(true); setError('')
    try {
      const clean = {
        company_name: sanitize(effective.company_name),
        contact_name: sanitize(effective.contact_name),
        contact_email: effective.contact_email.toLowerCase(),
        contact_phone: sanitize(effective.contact_phone),
        company_size: effective.company_size,
        category: form.category,
        description: sanitize(form.description),
        budget_range: form.budget_range,
        user_id: user.id,
        status: 'open'
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
            message: 'تم نشر طلبكم في أمرني للمنشآت. التخصص: ' + clean.category + ' | الشركة: ' + clean.company_name + ' | سيصلكم إشعار فور قبول أحد المزودين المعتمدين.'
          }
        })
      } catch {}
      clearDraft()
      setSavedProfile({ company_name: clean.company_name, contact_name: clean.contact_name, contact_phone: clean.contact_phone, company_size: clean.company_size })
      setHasProfile(true)
      setSuccess(true)
    } catch { setError('حدث خطأ، يرجى المحاولة مجدداً') }
    finally { setSubmitting(false) }
  }

  const handleProvSubmit = async () => {
    if (!user) {
      setProvError('يرجى تسجيل الدخول أولاً للتسجيل كمزود')
      openAuth('signup')
      return
    }
    if (!provForm.company_name || !provForm.contact_name || !provForm.contact_email || provForm.categories.length === 0) {
      setProvError('يرجى تعبئة جميع الحقول المطلوبة واختيار تخصص واحد على الأقل'); return
    }
    if (provForm.provider_type === 'company' && !provForm.cr_number) {
      setProvError('رقم السجل التجاري مطلوب للشركات'); return
    }
    if (provForm.provider_type === 'company' && provForm.cr_number && !/^[0-9]{10}$/.test(provForm.cr_number.trim())) {
      setProvError('رقم السجل التجاري يجب أن يكون 10 أرقام'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(provForm.contact_email)) {
      setProvError('يرجى إدخال بريد إلكتروني صحيح'); return
    }
    if (provForm.contact_name.trim().length < 2) {
      setProvError('يرجى إدخال اسم صحيح'); return
    }
    if (provForm.contact_phone.trim() && !/^05[0-9]{8}$/.test(provForm.contact_phone.trim())) {
      setProvError('رقم الجوال يجب أن يكون ١٠ أرقام يبدأ بـ 05'); return
    }
    if (provForm.provider_type === 'freelancer' && !provForm.freelance_doc) {
      setProvError('رقم وثيقة العمل الحر مطلوب للأفراد'); return
    }
    if (!provForm.years_experience) {
      setProvError('يرجى تحديد سنوات الخبرة'); return
    }
    if (!ndaAccepted) { setProvError('يرجى الموافقة على إقرار السرية'); return }
    setProvSubmitting(true); setProvError('')
    try {
      const payload = {
        company_name: sanitize(provForm.company_name),
        contact_name: sanitize(provForm.contact_name),
        contact_email: provForm.contact_email.trim().toLowerCase(),
        contact_phone: sanitize(provForm.contact_phone),
        city: sanitize(provForm.city),
        cr_number: sanitize(provForm.cr_number),
        description: JSON.stringify({
          provider_type: provForm.provider_type,
          cr_number: provForm.cr_number,
          cr_expiry: provForm.cr_expiry,
          freelance_doc: provForm.freelance_doc,
          vat_number: provForm.vat_number,
          years_experience: provForm.years_experience,
          certifications: sanitize(provForm.certifications),
          prev_clients: sanitize(provForm.prev_clients),
          bio: sanitize(provForm.description),
        }),
        categories: provForm.categories,
        linkedin_url: provForm.linkedin_url,
        website_url: provForm.website_url,
        user_id: user.id,
        is_approved: false,
        nda_accepted: ndaAccepted,
        nda_accepted_at: new Date().toISOString(),
      }
      const { error: err } = await supabase.from('enterprise_providers').insert(payload)
      if (err) throw err
      setProvSuccess(true)
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('phone')) setProvError('رقم الجوال غير صحيح — استخدم صيغة 05XXXXXXXX أو رقم دولي يبدأ بـ +')
      else if (msg.includes('email')) setProvError('البريد الإلكتروني غير صحيح')
      else if (msg.includes('cr_')) setProvError('رقم السجل التجاري يجب أن يكون 10 أرقام')
      else if (msg.includes('duplicate') || msg.includes('unique')) setProvError('أنت مسجّل كمزود مسبقاً')
      else setProvError('حدث خطأ: ' + (msg || 'يرجى المحاولة مجدداً'))
    } finally { setProvSubmitting(false) }
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
      const { data, error } = await supabase.functions.invoke('support-chat', {
        body: {
          context: 'enterprises',
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })).slice(-10)
        }
      })
      if (error) throw error
      setSupportMsgs(p => [...p, { role: 'assistant', content: data?.reply || 'عذراً، حدث خطأ. تواصل معنا على support@amerniksa.com' }])
    } catch {
      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت. تواصل معنا على support@amerniksa.com' }])
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
            {!user && (
              <button onClick={() => openAuth('login')}
                className="text-xs px-3 py-1.5 rounded-lg border border-primary-500 text-primary-500 font-bold hover:bg-primary-50 transition-colors">
                تسجيل الدخول
              </button>
            )}
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
            {user && (
              <button onClick={() => navigate('provider-dashboard')}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 transition-colors">
                لوحة المزود
              </button>
            )}
            <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}
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
                <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}
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

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {(catSearch.trim() ? ALL_CATEGORIES.filter(c => c.label.includes(catSearch) || c.desc.includes(catSearch)) : ALL_CATEGORIES).map(cat => {
                  const group = CATEGORY_GROUPS.find(g => g.items.some(i => i.id === cat.id))
                  const Icon = group?.icon || Building2
                  return (
                    <button key={cat.id} onClick={() => openForm(cat.id)}
                      className="group bg-white border border-slate-200 rounded-2xl p-4 text-right hover:border-primary-400 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
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
                {[['١٨','تخصصاً'],['٢٤س','وقت الرد'],['١٪','عمولة مؤقتة']].map(([v,l]) => (
                  <div key={l}><div className="text-3xl font-black text-primary-500 mb-1">{v}</div><div className="text-sm text-slate-500">{l}</div></div>
                ))}
              </div>
            </section>

            <section className="py-16 px-4 bg-primary-900 text-white text-center">
              <h2 className="text-2xl font-black mb-3">جاهز تبدأ؟</h2>
              <p className="text-primary-200 mb-2">أرسل طلبك الآن — الرد خلال ٢٤ ساعة</p>
              <p className="text-primary-300 text-xs mb-6">عمولة ١٪ مؤقتاً • قادم نظام اشتراك شهري</p>
              <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}
                className="bg-white text-primary-900 font-bold px-8 py-3 rounded-2xl hover:bg-primary-50 transition-colors">
                أرسل طلبك الآن
              </button>
            </section>
          </div>
        )}

        {/* ══ DASHBOARD / MY REQUESTS ══ */}
        {activeTab === 'my-requests' && (
          !user ? (
            <section className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
              <div className="text-center">
                <Building2 size={48} className="mx-auto mb-4 text-slate-300" />
                <h2 className="text-xl font-black text-slate-900 mb-2">سجّل دخول لعرض لوحة التحكم</h2>
                <p className="text-slate-400 text-sm">إنشاء حساب يتيح لك متابعة طلباتك وإدارتها</p>
              </div>
            </section>
          ) : (
            <div className="flex min-h-[calc(100vh-56px)]" dir="rtl">

              {/* Sidebar Desktop */}
              <aside className="hidden lg:flex flex-col h-[calc(100vh-56px)] sticky top-14 border-l border-slate-200 bg-slate-900 w-56 flex-shrink-0">
                <div className="px-4 py-5 border-b border-slate-800 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-xl mb-2">
                    {user.email?.[0]?.toUpperCase() || '؟'}
                  </div>
                  <p className="text-white font-bold text-sm text-center truncate w-full text-center">{user.email}</p>
                  <p className="text-slate-400 text-xs mt-0.5">عميل المنشآت</p>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                  {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
                    { id: 'orders', icon: List, label: 'طلباتي', badge: myLeads.length },
                    { id: 'new-request', icon: Plus, label: 'طلب جديد' },
                  ].map(({ id, icon: Icon, label, badge }: any) => (
                    <button key={id} onClick={() => {
                      if (id === 'new-request') { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }
                      else setDashSection(id as any)
                    }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                        dashSection === id && id !== 'new-request' ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}>
                      <Icon size={16} />
                      <span className="flex-1 text-right">{label}</span>
                      {badge > 0 && <span className="text-xs bg-slate-700 text-slate-300 rounded-full w-5 h-5 flex items-center justify-center font-bold">{badge > 9 ? '9+' : badge}</span>}
                    </button>
                  ))}
                </nav>

                <div className="p-3 border-t border-slate-800">
                  <button onClick={() => navigate('landing')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 transition-colors text-sm">
                    <LogOut size={14} /> خروج من الداشبورد
                  </button>
                </div>
              </aside>

              {/* Main */}
              <main className="flex-1 pb-24 lg:pb-0 overflow-auto">

                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                  <p className="text-white font-bold text-sm">{user.email}</p>
                  <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}
                    className="flex items-center gap-1.5 bg-primary-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs">
                    <Plus size={13} /> طلب جديد
                  </button>
                </div>

                <div className="p-4 md:p-8 max-w-5xl mx-auto">

                  {/* ─── DASHBOARD HOME ─── */}
                  {dashSection === 'dashboard' && (
                    <>
                      {/* Welcome */}
                      <div className="mb-6">
                        <p className="text-slate-500 text-sm font-medium">مرحباً بك 👋</p>
                        <h1 className="text-3xl font-black text-slate-900 mt-0.5">لوحة التحكم</h1>
                        <p className="text-slate-400 text-sm mt-1">تتبع طلباتك وتواصل مع فريقنا</p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {[
                          { label: 'إجمالي الطلبات', value: myLeads.length, color: 'text-slate-900', bg: 'bg-white' },
                          { label: 'منشور — بانتظار مزود', value: myLeads.filter(l => ['open','new','reviewing'].includes(l.status)).length, color: 'text-blue-600', bg: 'bg-blue-50' },
                          { label: 'تمت المطابقة', value: myLeads.filter(l => l.status === 'matched').length, color: 'text-green-600', bg: 'bg-green-50' },
                          { label: 'مغلقة', value: myLeads.filter(l => l.status === 'closed').length, color: 'text-slate-500', bg: 'bg-slate-100' },
                        ].map(({ label, value, color, bg }) => (
                          <div key={label} className={`${bg} border border-slate-200 rounded-2xl p-4 shadow-sm`}>
                            <div className={`text-3xl font-black ${color}`}>{value}</div>
                            <div className="text-xs text-slate-500 mt-1">{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Matched alert */}
                      {myLeads.filter(l => l.status === 'matched').length > 0 && (
                        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-green-700">✅ تمت مطابقتك مع مزود خدمة!</p>
                            <p className="text-xs text-green-600 mt-0.5">راجع التفاصيل في طلباتي</p>
                          </div>
                          <button onClick={() => setDashSection('orders')}
                            className="flex-shrink-0 bg-green-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-600 transition-colors">
                            عرض الآن
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* Left — Active requests */}
                        <div className="md:col-span-8 space-y-5">
                          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-slate-900">الطلبات النشطة</h3>
                              <button onClick={() => setDashSection('orders')} className="text-primary-500 text-sm font-semibold">عرض الكل ←</button>
                            </div>
                            {leadsLoading ? (
                              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-300" /></div>
                            ) : myLeads.filter(l => ['new','reviewing','matched'].includes(l.status)).length === 0 ? (
                              <div className="text-center py-8">
                                <Package size={28} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm mb-3">ما في طلبات نشطة</p>
                                <button onClick={() => { setSelectedCat(null); setShowForm(true) }}
                                  className="bg-primary-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-primary-600">
                                  أرسل طلبك الآن
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {myLeads.filter(l => ['new','reviewing','matched'].includes(l.status)).slice(0, 4).map(lead => {
                                  const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                                  const StIcon = st.icon
                                  const catLabel = ALL_CATEGORIES.find(cc => cc.id === lead.category)?.label || lead.category
                                  return (
                                    <button key={lead.id} onClick={() => setDashSection('orders')}
                                      className="w-full flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-primary-300 transition-all text-right">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold border ${st.color}`}>
                                        <StIcon size={16} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">{lead.company_name}</p>
                                        <p className="text-xs text-slate-400">{catLabel} • {st.label}</p>
                                      </div>
                                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Quick categories */}
                          <div>
                            <p className="text-xs text-slate-400 mb-2 font-medium">طلب تخصص سريع</p>
                            <div className="grid grid-cols-4 gap-2">
                              {CATEGORY_GROUPS.map(g => {
                                const GIcon = g.icon
                                return (
                                  <button key={g.id} onClick={() => { setSelectedCat(null); setForm(f => ({ ...f, category: '' })); setShowForm(true) }}
                                    className={`${g.bg} border border-slate-200 rounded-xl p-3 text-center hover:border-primary-400 hover:shadow-md transition-all group`}>
                                    <GIcon size={20} className={`${g.color} mx-auto mb-1 group-hover:scale-110 transition-transform`} />
                                    <p className="text-xs font-semibold text-slate-700 leading-tight">{g.label.split(' ')[0]}</p>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Right — Recent */}
                        <div className="md:col-span-4">
                          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4">آخر الطلبات</h3>
                            {myLeads.slice(0, 6).map(lead => {
                              const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                              return (
                                <button key={lead.id} onClick={() => setDashSection('orders')}
                                  className="w-full flex gap-3 items-start py-3 border-b border-slate-100 last:border-0 text-right hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    lead.status === 'matched' ? 'bg-green-400' :
                                    lead.status === 'reviewing' ? 'bg-amber-400' :
                                    lead.status === 'closed' ? 'bg-slate-300' : 'bg-blue-400'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{lead.company_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{st.label}</p>
                                  </div>
                                  <p className="text-xs text-slate-400 flex-shrink-0">{new Date(lead.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</p>
                                </button>
                              )
                            })}
                            {myLeads.length === 0 && (
                              <p className="text-slate-400 text-sm text-center py-6">لا توجد طلبات بعد</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Promo */}
                      <div className="mt-5 rounded-2xl p-6 bg-gradient-to-l from-slate-900 to-primary-700 flex items-center justify-between gap-4">
                        <div>
                          <span className="inline-block bg-primary-400 text-white font-black text-xs px-2.5 py-0.5 rounded-full mb-2">١٨ تخصصاً</span>
                          <h2 className="text-xl font-black text-white mb-1">مزودون معتمدون في انتظارك</h2>
                          <p className="text-white/70 text-sm">مطابقة خلال ٢٤ ساعة — عمولة ١٪ فقط</p>
                        </div>
                        <button onClick={() => { setSelectedCat(null); setShowForm(true) }}
                          className="flex-shrink-0 bg-white text-slate-900 font-bold px-5 py-2.5 rounded-xl hover:bg-primary-100 transition-colors text-sm">
                          أرسل طلبك
                        </button>
                      </div>
                    </>
                  )}

                  {/* ─── ORDERS ─── */}
                  {dashSection === 'orders' && (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900">طلباتي</h2>
                          <p className="text-slate-500 text-sm mt-1">{myLeads.length} طلب إجمالاً</p>
                        </div>
                        <button onClick={() => { setSelectedCat(null); setShowForm(true) }}
                          className="flex items-center gap-2 bg-primary-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-600 transition-colors">
                          <Plus size={15} /> طلب جديد
                        </button>
                      </div>

                      {leadsLoading ? (
                        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
                      ) : myLeads.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                          <Package size={40} className="mx-auto mb-3 text-slate-300" />
                          <p className="text-slate-600 font-medium mb-4">لا يوجد طلبات بعد</p>
                          <button onClick={() => { setSelectedCat(null); setShowForm(true) }}
                            className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-primary-600 transition-colors">
                            أرسل أول طلب
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myLeads.map(lead => {
                            const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                            const StIcon = st.icon
                            const catLabel = ALL_CATEGORIES.find(cc => cc.id === lead.category)?.label || lead.category
                            return (
                              <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div>
                                    <p className="font-bold text-slate-900 text-lg">{lead.company_name}</p>
                                    <p className="text-sm text-slate-500">{catLabel}</p>
                                  </div>
                                  <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${st.color}`}>
                                    <StIcon size={11} />{st.label}
                                  </span>
                                </div>

                                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed mb-3">{lead.description}</p>

                                <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
                                  {lead.budget_range && <span className="bg-slate-100 px-2 py-0.5 rounded">💰 {lead.budget_range}</span>}
                                  {lead.company_size && <span className="bg-slate-100 px-2 py-0.5 rounded">👥 {lead.company_size} موظف</span>}
                                  <span>{new Date(lead.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>

                                {lead.status === 'matched' && lead.notes && (
                                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                                    <p className="font-bold mb-1 flex items-center gap-1.5"><CheckCircle2 size={14} />رسالة من الفريق:</p>
                                    <p className="leading-relaxed">{lead.notes}</p>
                                  </div>
                                )}

                                {lead.status === 'matched' && (
                                  <div className="mt-3 space-y-3">
                                    <EnterpriseChat leadId={lead.id} senderRole="company" />
                                    <button
                                      onClick={async () => {
                                        const val = prompt('قيمة العقد المتفق عليها (ريال) — لحساب العمولة ١٪:')
                                        if (val === null) return
                                        const num = parseFloat(val) || null
                                        const { data, error } = await supabase.rpc('close_enterprise_lead', { p_lead_id: lead.id, p_contract_value: num })
                                        if (error) { alert('خطأ: ' + error.message); return }
                                        alert('تم إغلاق الطلب بنجاح' + (data?.commission ? ` — العمولة المستحقة: ${data.commission} ريال` : ''))
                                        setMyLeads(p => p.map(l => l.id === lead.id ? { ...l, status: 'closed' } : l))
                                      }}
                                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                                      إغلاق الطلب (تم التعاقد)
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!confirm('تغيير المزود؟ سيُستبعد المزود الحالي نهائياً ويعود طلبك متاحاً لباقي المزودين.')) return
                                        const { error } = await supabase.rpc('company_change_provider', { p_lead_id: lead.id })
                                        if (error) { alert('خطأ: ' + error.message); return }
                                        alert('تم — طلبك الآن متاح لمزودين آخرين')
                                        setMyLeads(p => p.map(l => l.id === lead.id ? { ...l, status: 'open', provider_id: null } : l))
                                      }}
                                      className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-bold py-2.5 rounded-xl text-sm transition-colors">
                                      تغيير المزود
                                    </button>
                                  </div>
                                )}

                                {lead.status === 'closed' && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
                                    <CheckCircle2 size={12} />
                                    <span>تم إغلاق الطلب — شكراً لاستخدامك أمرني للمنشآت</span>
                                  </div>
                                )}

                                {(lead.status === 'open' || lead.status === 'new' || lead.status === 'reviewing') && (
                                  <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 px-3 py-2 rounded-xl">
                                    <Clock size={12} className="animate-pulse" />
                                    <span>طلبك منشور لكل المزودين المعتمدين في التخصص — سيصلك إشعار فور القبول</span>
                                  </div>
                                )}


                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}

                </div>
              </main>

              {/* Mobile Bottom Nav */}
              <nav className="lg:hidden fixed bottom-0 right-0 w-full flex justify-around items-center h-16 bg-slate-900 border-t border-slate-800 z-50">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
                  { id: 'orders', icon: List, label: 'طلباتي', badge: myLeads.length },
                ].map(({ id, icon: Icon, label, badge }: any) => (
                  <button key={id} onClick={() => setDashSection(id as any)}
                    className={`flex flex-col items-center gap-1 px-6 py-1 relative transition-all ${dashSection === id ? 'text-primary-400' : 'text-slate-500'}`}>
                    <Icon size={20} />
                    <span className="text-[10px] font-medium">{label}</span>
                    {badge > 0 && <span className="absolute top-0 right-3 w-4 h-4 bg-primary-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">{badge > 9 ? '9+' : badge}</span>}
                  </button>
                ))}
                <button onClick={() => { setSelectedCat(null); setShowForm(true) }}
                  className="flex flex-col items-center gap-1 px-6 py-1 text-primary-400">
                  <Plus size={20} />
                  <span className="text-[10px] font-medium">طلب جديد</span>
                </button>
                <button onClick={() => navigate('landing')}
                  className="flex flex-col items-center gap-1 px-6 py-1 text-slate-500">
                  <LogOut size={20} />
                  <span className="text-[10px] font-medium">خروج</span>
                </button>
              </nav>
            </div>
          )
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
                  <h3 className="text-xl font-black text-slate-900 mb-2">تم نشر طلبك! 🚀</h3>
                  <p className="text-slate-500">سيراجع فريقنا طلبك ويتواصل معك خلال ٤٨ ساعة</p>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* ① نوع المزود */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">نوع المزود *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[['company','شركة / مؤسسة','سجل تجاري'],['freelancer','فرد / مستقل','وثيقة عمل حر']].map(([v,l,s]) => (
                        <button key={v} type="button" onClick={() => setProvForm(f => ({ ...f, provider_type: v as any }))}
                          className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all ${provForm.provider_type === v ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <span className="text-2xl">{v === 'company' ? '🏢' : '👤'}</span>
                          <span className={`text-sm font-bold ${provForm.provider_type === v ? 'text-primary-600' : 'text-slate-700'}`}>{l}</span>
                          <span className="text-xs text-slate-400">{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ② بيانات أساسية */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">البيانات الأساسية</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{provForm.provider_type === 'company' ? 'اسم الشركة / المؤسسة *' : 'الاسم التجاري *'}</label>
                        <input value={provForm.company_name} onChange={e => setProvForm(f => ({ ...f, company_name: e.target.value }))}
                          placeholder={provForm.provider_type === 'company' ? 'شركة المستقبل' : 'محمد للاستشارات'}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المسؤول *</label>
                        <input value={provForm.contact_name} onChange={e => setProvForm(f => ({ ...f, contact_name: e.target.value }))}
                          placeholder="محمد العبدالله"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                        <input type="email" value={provForm.contact_email} onChange={e => setProvForm(f => ({ ...f, contact_email: e.target.value }))}
                          placeholder="info@company.com"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white" dir="ltr" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال *</label>
                        <input value={provForm.contact_phone} maxLength={10} inputMode="numeric" placeholder="05XXXXXXXX" onChange={e => setProvForm(f => ({ ...f, contact_phone: e.target.value.replace(/[^0-9]/g, '').slice(0,10) }))}
                          placeholder="05xxxxxxxx"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">المدينة</label>
                      <select value={provForm.city} onChange={e => setProvForm(f => ({ ...f, city: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white">
                        <option value="">اختر المدينة</option>
                        {['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الأحساء','تبوك','أبها','بريدة','حائل','نجران','جازان'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* ③ وثائق التحقق */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
                      <Shield size={12} /> وثائق التحقق — مطلوبة للاعتماد
                    </p>

                    {provForm.provider_type === 'company' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">رقم السجل التجاري *</label>
                          <input value={provForm.cr_number} maxLength={10} inputMode="numeric" onChange={e => setProvForm(f => ({ ...f, cr_number: e.target.value.replace(/[^0-9]/g, '').slice(0,10) }))}
                            placeholder="1010xxxxxx" maxLength={10}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" dir="ltr" />
                          <p className="text-xs text-slate-400 mt-1">١٠ أرقام من وزارة التجارة</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ انتهاء السجل</label>
                          <input type="date" value={provForm.cr_expiry} onChange={e => setProvForm(f => ({ ...f, cr_expiry: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" dir="ltr" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">رقم وثيقة العمل الحر *</label>
                        <input value={provForm.freelance_doc} onChange={e => setProvForm(f => ({ ...f, freelance_doc: e.target.value }))}
                          placeholder="رقم الوثيقة من منصة freelance.sa"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" dir="ltr" />
                        <p className="text-xs text-slate-400 mt-1">وثيقة العمل الحر من وزارة الموارد البشرية</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">الرقم الضريبي (VAT) — إن وجد</label>
                      <input value={provForm.vat_number} onChange={e => setProvForm(f => ({ ...f, vat_number: e.target.value }))}
                        placeholder="300xxxxxxxxx" maxLength={15}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" dir="ltr" />
                      <p className="text-xs text-slate-400 mt-1">١٥ رقم من هيئة الزكاة والضريبة والجمارك</p>
                    </div>
                  </div>

                  {/* ④ المؤهلات والخبرة */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Star size={12} /> المؤهلات والخبرة
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">سنوات الخبرة في التخصص *</label>
                      <select value={provForm.years_experience} onChange={e => setProvForm(f => ({ ...f, years_experience: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white">
                        <option value="">اختر</option>
                        <option value="1-3">١ – ٣ سنوات</option>
                        <option value="3-5">٣ – ٥ سنوات</option>
                        <option value="5-10">٥ – ١٠ سنوات</option>
                        <option value="10+">أكثر من ١٠ سنوات</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">الشهادات المهنية</label>
                      <input value={provForm.certifications} onChange={e => setProvForm(f => ({ ...f, certifications: e.target.value }))}
                        placeholder="مثال: PMP، ISO 9001 Lead Auditor، CPA، زمالة هيئة المحاسبين..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white" />
                      <p className="text-xs text-slate-400 mt-1">شهادات معتمدة محلياً أو دولياً</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">عملاء سابقون (مراجع)</label>
                      <input value={provForm.prev_clients} onChange={e => setProvForm(f => ({ ...f, prev_clients: e.target.value }))}
                        placeholder="مثال: أرامكو السعودية، البنك الأهلي، وزارة التجارة..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white" />
                      <p className="text-xs text-slate-400 mt-1">شركات أو جهات سبق التعاون معها</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">نبذة تعريفية *</label>
                      <textarea value={provForm.description} onChange={e => setProvForm(f => ({ ...f, description: e.target.value }))}
                        rows={3} placeholder="اكتب نبذة مختصرة عن خبراتك وما تقدمه من خدمات..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white resize-none" />
                    </div>
                  </div>

                  {/* ⑤ التخصصات */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">التخصصات التي تقدمها *</label>
                    <div className="space-y-2">
                      {CATEGORY_GROUPS.map(g => {
                        const GIcon = g.icon
                        return (
                          <div key={g.id} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className={`flex items-center gap-2 px-3 py-2 ${g.bg}`}>
                              <GIcon size={14} className={g.color} />
                              <p className="text-xs font-bold text-slate-700">{g.label}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3">
                              {g.items.map(cat => (
                                <button key={cat.id} type="button" onClick={() => toggleProvCat(cat.id)}
                                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${provForm.categories.includes(cat.id) ? 'bg-primary-500 text-white border-primary-500' : 'border-slate-200 text-slate-600 hover:border-primary-300'}`}>
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {provForm.categories.length > 0 && (
                      <p className="text-xs text-primary-500 mt-2">✓ {provForm.categories.length} تخصص محدد</p>
                    )}
                  </div>

                  {/* ⑥ روابط اختيارية */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn</label>
                      <input value={provForm.linkedin_url} onChange={e => setProvForm(f => ({ ...f, linkedin_url: e.target.value }))}
                        placeholder="linkedin.com/in/..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">الموقع الإلكتروني</label>
                      <input value={provForm.website_url} onChange={e => setProvForm(f => ({ ...f, website_url: e.target.value }))}
                        placeholder="www.company.com" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                    </div>
                  </div>

                  {/* ⑦ إقرار السرية */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2 text-sm"><Shield size={14} />إقرار السرية — مطلوب</h3>
                    <p className="text-xs text-amber-700 leading-relaxed mb-3">
                      بتسجيلك كمزود خدمة في أمرني للمنشآت، تتعهد بـ:
                      <br/>• الحفاظ على سرية بيانات الشركات التي تُطابق معها
                      <br/>• عدم استخدام البيانات لأي غرض خارج الخدمة المتفق عليها
                      <br/>• عدم التواصل مع الشركات خارج المنصة
                      <br/>• دفع عمولة ١٪ من قيمة العقد المُبرم خلال ٧٢ ساعة
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={ndaAccepted} onChange={e => setNdaAccepted(e.target.checked)} className="w-4 h-4 rounded" />
                      <span className="text-sm font-bold text-amber-800">أقر بقراءة وموافقة هذا الإقرار</span>
                    </label>
                  </div>

                  {provError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{provError}</div>}

                  <button onClick={handleProvSubmit} disabled={provSubmitting}
                    className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {provSubmitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><Send size={15} /><span>تقديم طلب التسجيل</span></>}
                  </button>
                  <p className="text-xs text-slate-400 text-center">سيراجع فريقنا طلبك ويتواصل معك خلال ٤٨ ساعة</p>
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
                    {[['اسم المؤسسة','مؤسسة حلول الغد للخدمات الإلكترونية'],['البنك','بنك البلاد'],['رقم الآيبان',COMPANY.iban],['البريد',COMPANY.email]].map(([k,v]) => (
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
                    { icon: Mail, label:'البريد الإلكتروني', value:COMPANY.email, color:'text-primary-500' },
                    { icon: MessageCircle, label:'الدعم المباشر', value:'متاح ٢٤/٧ عبر الدردشة', color:'text-blue-400' },
                    { icon: Shield, label:'الآيبان — بنك البلاد', value:COMPANY.iban, color:'text-slate-700' },
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
                  <a href="mailto:${COMPANY.email}" className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                    <Mail size={16} />{COMPANY.email}
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
              <p className="mt-5 text-center text-sm text-slate-400">للتواصل المباشر: <a href="mailto:${COMPANY.email}" className="text-primary-500 hover:underline">{COMPANY.email}</a></p>
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
                { t:'٢. العمولة الحالية ⭐', b:'العمولة الحالية ١٪ من قيمة العقد المُبرم، تُحوَّل لـ IBAN: ' + COMPANY.iban + ' (بنك البلاد) خلال ٧٢ ساعة من التعاقد. هذا النظام مؤقت حتى إطلاق نظام الاشتراك الشهري.' },
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
                <p className="text-slate-400 text-sm">للاستفسار: <a href="mailto:${COMPANY.email}" className="text-primary-500 hover:underline">{COMPANY.email}</a></p>
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
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors" aria-label="إغلاق"><X size={14} /></button>
            </div>
            {success ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-black text-slate-900 mb-2">تم نشر طلبك! 🚀</h3>
                <p className="text-slate-500 text-sm mb-6">طلبك الآن ظاهر لكل المزودين المعتمدين في التخصص. سيصلك إشعار فور قبول أحدهم.</p>
                <div className="flex gap-3 justify-center">
                  {user
                    ? <button onClick={() => { setShowForm(false); setSuccess(false); setActiveTab('my-requests') }} className="bg-primary-500 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">عرض طلباتي ←</button>
                    : <button onClick={() => setShowForm(false)} className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">حسناً</button>
                  }
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* بيانات الشركة المحفوظة — مطوية لو موجودة */}
                {hasProfile && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 min-w-0">
                      <CheckCircle2 size={15} className="flex-shrink-0" />
                      <span className="truncate">بيانات {form.company_name || 'شركتك'} محفوظة — {form.contact_email}</span>
                    </div>
                    <button type="button" onClick={() => setHasProfile(false)}
                      className="text-xs text-green-600 underline flex-shrink-0 hover:text-green-800">تعديل</button>
                  </div>
                )}

                {/* التخصص — أهم حقل، دائماً ظاهر */}
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

                {/* وصف الاحتياج — الحقل الرئيسي، مقدّم للأعلى */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    وصف الاحتياج * <span className="text-slate-400 font-normal text-xs">({form.description.length}/3000)</span>
                  </label>
                  <textarea value={form.description} onChange={e => setF('description', e.target.value)}
                    rows={4} maxLength={3000} placeholder="اشرح احتياج منشأتك بإيجاز — مثال: نحتاج مستشار حوكمة لتأسيس مجلس إدارة ولوائح داخلية..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50 resize-none" />
                </div>

                {/* الميزانية — اختيارية بس مفيدة */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الميزانية التقريبية (اختياري)</label>
                  <select value={form.budget_range} onChange={e => setF('budget_range', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                    <option value="">اختر</option>
                    {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                {/* بيانات الشركة — تظهر فقط لو ما فيه بروفايل محفوظ أو ضغط تعديل */}
                {!hasProfile && (
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <p className="text-xs font-bold text-slate-400">بيانات التواصل (تُحفظ لطلباتك القادمة)</p>
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
                        <input value={form.contact_phone} maxLength={10} inputMode="numeric" placeholder="05XXXXXXXX" onChange={e => setF('contact_phone', e.target.value.replace(/[^0-9]/g, '').slice(0,10))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">حجم الشركة</label>
                      <select value={form.company_size} onChange={e => setF('company_size', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                        <option value="">اختر</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} موظف</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">{error}</div>}
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><Send size={15} /><span>نشر الطلب</span></>}
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
