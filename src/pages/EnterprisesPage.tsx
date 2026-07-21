import { Logo } from '../components/Logo'
import { useState, useEffect, useRef } from 'react'
import { EnterpriseChat } from '../components/chat/EnterpriseChat'
import { ReviewBox, VerificationBadge, StarDisplay } from '../components/enterprise/ReviewBox'
import { ProviderProfileCard } from '../components/enterprise/ProviderProfileCard'
import { ResponseSpeed, StatusTimeline, SocialProofBar, EmptyRequests } from '../components/enterprise/UXComponents'
import { SkeletonList } from '../components/ui/Skeleton'
import { NotificationBell } from '../components/ui/NotificationBell'
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
  LogOut, List, LayoutDashboard, Plus, Bell, MessageSquare
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
  const { user, profile } = useAuth()
  const { navigate, openAuth } = useApp()

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = sessionStorage.getItem('enterprises_tab') as Tab
    return saved && ['home','my-requests','provider-register'].includes(saved) ? saved : 'home'
  })
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const PENDING_LEAD_KEY = 'amerni_pending_lead'
  const [catSearch, setCatSearch] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  // Form
  const savedDraft = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null } })() : null
  const [form, setForm] = useState<LeadForm>(savedDraft || EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [savedProfile, setSavedProfile] = useState<any>(null)

  // تحميل بروفايل الشركة المحفوظ + الإيميل تلقائياً (تعبئة تلقائية)
  // فتح تبويب "طلباتي" تلقائياً بعد تسجيل الشركة
  useEffect(() => {
    const handler = () => {
      navigateTab('my-requests')
      setShowForm(false)
    }
    window.addEventListener('enterprises:open-my-requests', handler)
    return () => window.removeEventListener('enterprises:open-my-requests', handler)
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('company_profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setSavedProfile(data) })
  }, [user?.id])

  // دالة تجهيز نموذج جديد مع التعبئة التلقائية
  const buildPrefilledForm = (): LeadForm => ({
    company_name: savedProfile?.company_name || '',
    contact_name: savedProfile?.contact_name || '',
    contact_email: savedProfile?.contact_email || user?.email || '',
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
    provider_type: 'company' as const, // المنشآت شركات فقط
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
  // حفظ التبويب الحالي عند كل تغيير
  const navigateTab = (tab: Tab) => {
    setActiveTab(tab)
    sessionStorage.setItem('enterprises_tab', tab)
  }

  const fetchMyLeads = () => {
    if (!user) return
    setLeadsLoading(true)
    supabase.from('enterprise_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setMyLeads(data || []); setLeadsLoading(false) })
  }
  useEffect(() => {
    if (activeTab === 'my-requests' && user) fetchMyLeads()
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
      setError('')
      // احفظ بيانات الطلب الكاملة عشان نرسلها بعد التسجيل
      localStorage.setItem('amerni_pending_lead', JSON.stringify({
        form: { ...form },
        savedProfile: savedProfile
      }))
      openAuth('signup', 'enterprises', { name: form.contact_name, email: form.contact_email })
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
      setError('يرجى تعبئة بيانات التواصل'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effective.contact_email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح'); return
    }
    if (effective.contact_phone && !/^05[0-9]{8}$/.test(effective.contact_phone)) {
      setError('رقم الجوال يجب أن يكون ١٠ أرقام يبدأ بـ 05'); return
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
            setSuccess(true)
    } catch { setError('حدث خطأ، يرجى المحاولة مجدداً') }
    finally { setSubmitting(false) }
  }

  // إكمال إرسال الطلب تلقائياً بعد تسجيل الدخول
  useEffect(() => {
    if (!user) return
    const pending = localStorage.getItem('amerni_pending_lead')
    if (!pending) return
    try {
      const { form: savedForm, savedProfile: sp } = JSON.parse(pending)
      localStorage.removeItem('amerni_pending_lead')
      // نملأ النموذج بالبيانات المحفوظة ونرسل بعد 1 ثانية
      setForm(savedForm)
      if (sp) setSavedProfile(sp)
      setShowForm(true)
      const t = setTimeout(async () => {
        // نرسل مباشرة عبر supabase بدون ما نعتمد على state
        const effectiveData = {
          company_name: savedForm.company_name || sp?.company_name || '',
          contact_name: savedForm.contact_name || sp?.contact_name || '',
          contact_email: savedForm.contact_email || user.email || '',
          contact_phone: savedForm.contact_phone || sp?.contact_phone || '',
          company_size: savedForm.company_size || sp?.company_size || '',
          category: savedForm.category,
          description: savedForm.description,
          budget_range: savedForm.budget_range,
          user_id: user.id,
          status: 'open'
        }
        if (!effectiveData.category || !effectiveData.description) return
        const { error } = await supabase.from('enterprise_leads').insert(effectiveData)
        if (!error) {
          setShowForm(false)
          setSuccess(true)
          setSavedProfile({ company_name: effectiveData.company_name, contact_name: effectiveData.contact_name, contact_phone: effectiveData.contact_phone, company_size: effectiveData.company_size })
                    setTimeout(fetchMyLeads, 500)
        }
      }, 1000)
      return () => clearTimeout(t)
    } catch { localStorage.removeItem('amerni_pending_lead') }
  }, [user?.id])

  const handleProvSubmit = async () => {
    if (!user) {
      setProvError('')
      openAuth('signup', 'enterprises', { name: provForm.contact_name, email: provForm.contact_email })
      return
    }
    if (!provForm.company_name || !provForm.contact_name || !provForm.contact_email || provForm.categories.length === 0) {
      setProvError('يرجى تعبئة جميع الحقول المطلوبة واختيار تخصص واحد على الأقل'); return
    }
    if (!provForm.cr_number) {
      setProvError('رقم السجل التجاري مطلوب'); return
    }
    if (!/^[0-9]{10}$/.test(provForm.cr_number.trim())) {
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
            <button onClick={() => navigate('landing')} className="flex items-center hover:opacity-80 transition-opacity"><Logo size={30} /></button>
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
            {user && <NotificationBell />}
            {!user && (
              <button onClick={() => openAuth('login', 'enterprises')}
                className="text-xs px-3 py-1.5 rounded-lg border border-primary-500 text-primary-500 font-bold hover:bg-primary-50 transition-colors">
                تسجيل الدخول
              </button>
            )}
            {user && (
              <button onClick={() => navigateTab('my-requests')}
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
            {/* ══ HERO ══ */}
            <section className="relative bg-[#07101f] text-white overflow-hidden" style={{minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:60px_60px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />
              <div className="relative max-w-6xl mx-auto w-full px-4 py-20">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-300 text-sm mb-8">
                    <Building2 size={14} /><span>المنصة السعودية الأولى لخدمات المنشآت</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                    حوّل رؤيتك إلى واقع مع<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-cyan-300">خبرات عند الطلب</span>
                  </h1>
                  <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                    المنصة السعودية الأول لتمكين النمو من خلال ربط المنشآت بنخبة من المستشارين والخبراء المعتمدين في أكثر من 18 تخصصاً استراتيجياً.
                  </p>
                </div>
                {/* بطاقتان */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-10">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center"><Building2 size={20} className="text-blue-400" /></div>
                      <span className="text-blue-400 text-xs font-bold group-hover:text-blue-300">حول المنشأت ←</span>
                    </div>
                    <h3 className="text-white font-black text-lg mb-1">نمو المنشآت</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">حلول مؤسسية متكاملة (B2B) لتطوير نمو أعمالك وضمن استمرارية المنشأة من خلال شبكة الخبراء الاستراتيجيين.</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors group cursor-pointer"
                    onClick={() => setActiveTab('provider-register')}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center"><Users size={20} className="text-purple-400" /></div>
                      <span className="text-purple-400 text-xs font-bold group-hover:text-purple-300">اكتشف المزيد ←</span>
                    </div>
                    <h3 className="text-white font-black text-lg mb-1">سجّل كمزود خدمة</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">انضم لشبكة المزودين المعتمدين واحصل على طلبات من الشركات في 18 تخصصاً.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-blue-500/20 btn-press">
                    ابدأ رحلة التحول الآن
                  </button>
                  <button onClick={() => setActiveTab('features')}
                    className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors">
                    استكشف الحلول
                  </button>
                </div>
              </div>
            </section>

            {/* ══ SERVICES / CATEGORIES ══ */}
            <section className="py-20 px-4 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="mb-8"><SocialProofBar /></div>
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">أبشر بالفزعة.. خبراتنا في خدمتك</h2>
                  <p className="text-slate-400">أكثر من 18 مجال تطبق فيها إلى التي يحتاجها العمل بكل احترافية</p>
                </div>
                <div className="relative max-w-lg mx-auto mb-10">
                  <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={catSearch} onChange={e => setCatSearch(e.target.value)}
                    placeholder="ابحث عن التخصص أو الخدمة المطلوبة..."
                    className="w-full pr-12 pl-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(catSearch.trim()
                    ? ALL_CATEGORIES.filter(cat => cat.label.includes(catSearch) || cat.desc.includes(catSearch))
                    : ALL_CATEGORIES
                  ).map(cat => {
                    const group = CATEGORY_GROUPS.find(g => g.items.some(i => i.id === cat.id))
                    const Icon = group?.icon || Building2
                    const iconBg = group?.bg || 'bg-primary-50'
                    const iconColor = group?.color || 'text-primary-500'
                    return (
                      <button key={cat.id} onClick={() => openForm(cat.id)}
                        className="group bg-white border-2 border-slate-100 hover:border-primary-300 rounded-2xl p-6 text-right hover:shadow-lg transition-all duration-200 flex flex-col items-end gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon size={22} className={iconColor} />
                        </div>
                        <div className="w-full">
                          <p className="font-black text-slate-900 text-base mb-1">{cat.label}</p>
                          <p className="text-xs text-slate-400 leading-relaxed">{cat.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* ══ STATS ══ */}
            <section className="py-16 px-4 bg-slate-50 border-y border-slate-200">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  {[{value:'18+',label:'تخصصاً توفره'},{value:'24س',label:'سرعة الاستجابة'},{value:'100%',label:'خبراء معتمدون'},{value:'1%',label:'عمولة تنافسية'}].map(({value,label}) => (
                    <div key={label}>
                      <p className="text-4xl sm:text-5xl font-black text-primary-700 mb-2">{value}</p>
                      <p className="text-sm text-slate-500 font-medium">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ TRUST ══ */}
            <section className="py-20 px-4 bg-white">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="bg-[#07101f] rounded-2xl p-6 text-white">
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1 text-xs text-blue-300 mb-4">مؤشر الأداء 2024</div>
                    <p className="text-5xl font-black text-white mb-1">%99.8</p>
                    <p className="text-slate-400 text-sm mb-6">نسبة رضاء العملاء عن الحلول المقدمة</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[['+350','مورد'],['+140','عميل']].map(([v,l]) => (
                        <div key={l} className="bg-white/10 rounded-xl p-3">
                          <p className="text-xl font-black">{v}</p>
                          <p className="text-xs text-slate-400">{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">منظومة ذكية قائمة على<span className="text-primary-600"> الثقة والابتكار</span></h2>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">نربطك بأفضل الخبراء المعتمدين بأسرع وقت وأعلى جودة وأقل تكلفة.</p>
                    <div className="space-y-4">
                      {[
                        {icon:'🔍',title:'مطابقة معززة بالذكاء الاصطناعي',desc:'نحلل كل طلب لنقدم لك أنسب المتخصصين خلال دقائق توائم الحاجة والإنجاز.'},
                        {icon:'🤝',title:'تحقق وتوثيق تدريجي',desc:'يخضع جميع المتخصصين لعملية تدقيق لضمان الجودة والاحترافية والإنجاز.'},
                        {icon:'🔒',title:'حماية البيانات والخصوصية',desc:'بروتوكولات أمن متقدمة تصون معلومات منشأتك وعقودها وعلاقاتك الاستشارية.'},
                      ].map(({icon,title,desc}) => (
                        <div key={title} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-2xl flex-shrink-0">{icon}</span>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{title}</p>
                            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ FINAL CTA ══ */}
            <section className="py-20 px-4 bg-[#07101f] text-white text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-black mb-3">جاهز لبدء التحوّل؟</h2>
                <p className="text-slate-400 mb-2">انضم لمئات المنشآت التي تنمو على "أمرني" في إدارة نموها الاستراتيجي.</p>
                <p className="text-slate-500 text-xs mb-8">أكثر من 18 تخصص متاحة • مزودون معتمدون • عمولة ١٪ مؤقتاً</p>
                <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3.5 rounded-xl text-base transition-colors shadow-lg">
                  ابدأ رحلة التحول الآن
                </button>
              </div>
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
                    <div className="space-y-5 animate-fade-in">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                            👋 صباح الخير، {profile?.full_name || user.email?.split('@')[0]}
                          </p>
                          <h1 className="text-2xl font-black text-slate-900 mt-0.5">لوحة التحكم</h1>
                          <p className="text-slate-400 text-sm mt-1">تتبع طلباتك وتواصل مع فريقنا بسهولة واحترافية.</p>
                        </div>
                        <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : EMPTY_FORM); setSuccess(false); setShowForm(true) }}
                          className="flex-shrink-0 bg-primary-500 hover:bg-primary-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors btn-press shadow-lg shadow-primary-500/20">
                          <Plus size={16} /> إضافة طلب جديد
                        </button>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          {
                            label: 'إجمالي الطلبات',
                            value: myLeads.length,
                            sub: myLeads.length > 0 ? `+${myLeads.filter(l => {
                              const d = new Date(l.created_at); const m = new Date(); m.setDate(m.getDate()-30);
                              return d > m
                            }).length} هذا الشهر` : 'لا يوجد طلبات بعد',
                            color: 'text-slate-900', bg: 'bg-white', iconBg: 'bg-slate-100',
                            icon: List
                          },
                          {
                            label: 'بانتظار المورد',
                            value: myLeads.filter(l => ['open','new','reviewing'].includes(l.status)).length,
                            sub: 'جاري مراجعة العروض المقدمة',
                            color: 'text-blue-600', bg: 'bg-white', iconBg: 'bg-blue-50',
                            icon: Clock
                          },
                          {
                            label: 'تمت المطابقة',
                            value: myLeads.filter(l => l.status === 'matched').length,
                            sub: myLeads.filter(l=>l.status==='matched').length > 0 ? 'سيتم البدء في التنفيذ قريباً' : 'لا يوجد مطابقات بعد',
                            color: 'text-green-600', bg: 'bg-white', iconBg: 'bg-green-50',
                            icon: CheckCircle2
                          },
                          {
                            label: 'طلبات مغلقة',
                            value: myLeads.filter(l => l.status === 'closed').length,
                            sub: 'أرشيف الطلبات المكتملة',
                            color: 'text-slate-500', bg: 'bg-white', iconBg: 'bg-slate-50',
                            icon: Package
                          },
                        ].map(({ label, value, sub, color, bg, iconBg, icon: Icon }) => (
                          <div key={label} className={`${bg} border border-slate-200 rounded-2xl p-4 shadow-sm card-hover`}>
                            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
                              <Icon size={18} className={color} />
                            </div>
                            <div className={`text-3xl font-black ${color} mb-1`}>{value}</div>
                            <div className="text-xs text-slate-500 font-medium">{label}</div>
                            {sub && <div className={`text-xs mt-1 ${value > 0 ? 'text-green-500' : 'text-slate-400'}`}>{sub}</div>}
                          </div>
                        ))}
                      </div>

                      {/* Matched Alert Banner */}
                      {myLeads.filter(l => l.status === 'matched').length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-3 animate-fade-up">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 size={20} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-bold text-green-800">تمت مطابقتك مع مزود خدمة بنجاح!</p>
                              <p className="text-xs text-green-600 mt-0.5">راجع تفاصيل العقد والجدول الزمني في قسم طلباتي.</p>
                            </div>
                          </div>
                          <button onClick={() => navigateTab('my-requests')}
                            className="flex-shrink-0 bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-green-600 transition-colors whitespace-nowrap btn-press">
                            عرض الآن
                          </button>
                        </div>
                      )}

                      {/* Two Column Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                        {/* الطلبات النشطة — اليمين (واسع) */}
                        <div className="md:col-span-8">
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                              <h3 className="font-bold text-slate-900">الطلبات النشطة</h3>
                              <button onClick={() => navigateTab('my-requests')}
                                className="text-primary-500 text-sm font-semibold hover:text-primary-700 flex items-center gap-1">
                                عرض الكل <ArrowLeft size={14} />
                              </button>
                            </div>
                            {leadsLoading ? (
                              <div className="p-6"><SkeletonList count={2} /></div>
                            ) : myLeads.filter(l => ['open','new','reviewing','matched'].includes(l.status)).length === 0 ? (
                              <div className="p-8 text-center">
                                <Package size={32} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm mb-3">ما في طلبات نشطة</p>
                                <button onClick={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : EMPTY_FORM); setSuccess(false); setShowForm(true) }}
                                  className="bg-primary-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-primary-600 btn-press">
                                  أرسل طلبك الآن
                                </button>
                              </div>
                            ) : (
                              <div className="divide-y divide-slate-50">
                                {myLeads.filter(l => ['open','new','reviewing','matched'].includes(l.status)).slice(0, 5).map(lead => {
                                  const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                                  const catLabel = ALL_CATEGORIES.find(cc => cc.id === lead.category)?.label || lead.category
                                  const daysDiff = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000)
                                  return (
                                    <button key={lead.id} onClick={() => navigate(`lead-detail/${lead.id}`)}
                                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-right group">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${st.bg || 'bg-slate-100'}`}>
                                        <Building2 size={18} className={st.color?.split(' ')[1] || 'text-slate-500'} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">{lead.company_name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{catLabel} • {st.label}</p>
                                      </div>
                                      <div className="text-left flex-shrink-0">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.color}`}>{st.label.split('—')[0].trim()}</span>
                                        <p className="text-xs text-slate-300 mt-1">منذ {daysDiff === 0 ? 'اليوم' : daysDiff + ' أيام'}</p>
                                      </div>
                                      <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* آخر الطلبات — اليسار (ضيق) */}
                        <div className="md:col-span-4">
                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full">
                            <div className="px-4 py-4 border-b border-slate-100">
                              <h3 className="font-bold text-slate-900 text-sm">آخر الطلبات</h3>
                            </div>
                            <div className="p-3 space-y-1">
                              {myLeads.slice(0, 6).map(lead => {
                                const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                                return (
                                  <button key={lead.id} onClick={() => navigate(`lead-detail/${lead.id}`)}
                                    className="w-full flex gap-2.5 items-start py-2.5 px-2 hover:bg-slate-50 rounded-xl transition-colors text-right">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                      lead.status === 'matched' ? 'bg-green-400' :
                                      lead.status === 'closed' ? 'bg-slate-300' : 'bg-blue-400'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">{lead.company_name}</p>
                                      <p className="text-xs text-slate-400 mt-0.5 truncate">{st.label}</p>
                                    </div>
                                    <p className="text-xs text-slate-300 flex-shrink-0">{new Date(lead.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</p>
                                  </button>
                                )
                              })}
                              {myLeads.length === 0 && (
                                <p className="text-slate-400 text-xs text-center py-6">لا توجد طلبات بعد</p>
                              )}
                            </div>
                            {myLeads.length > 0 && (
                              <div className="px-4 pb-4">
                                <button onClick={() => navigateTab('my-requests')}
                                  className="w-full border border-slate-200 text-slate-500 hover:border-primary-300 hover:text-primary-500 text-xs font-bold py-2 rounded-xl transition-colors">
                                  استعراض السجل الكامل
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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
                        <SkeletonList count={3} />
                      ) : myLeads.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl">
                          <EmptyRequests onCreate={() => { setSelectedCat(null); setForm(user ? buildPrefilledForm() : (savedDraft || EMPTY_FORM)); setSuccess(false); setShowForm(true) }} />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {myLeads.map(lead => {
                            const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                            const StIcon = st.icon
                            const catLabel = ALL_CATEGORIES.find(cc => cc.id === lead.category)?.label || lead.category
                            return (
                              <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`lead-detail/${lead.id}`)}>
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

                                {lead.status !== 'cancelled' && (
                                  <div className="border-t border-slate-100 pt-1 mb-2">
                                    <StatusTimeline status={lead.status} />
                                  </div>
                                )}

                                {lead.status === 'matched' && lead.notes && (
                                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                                    <p className="font-bold mb-1 flex items-center gap-1.5"><CheckCircle2 size={14} />رسالة من الفريق:</p>
                                    <p className="leading-relaxed">{lead.notes}</p>
                                  </div>
                                )}

                                {lead.status === 'matched' && (
                                  <div className="mt-3">
                                    <button onClick={() => navigate(`lead-detail/${lead.id}`)}
                                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                                      <MessageSquare size={15} /> عرض تفاصيل الطلب والتواصل مع المزود
                                    </button>
                                  </div>
                                )}

                                {lead.status === 'closed' && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
                                      <CheckCircle2 size={12} />
                                      <span>تم إغلاق الطلب — شكراً لاستخدامك أمرني للمنشآت</span>
                                    </div>
                                    {lead.provider_id && <ReviewBox leadId={lead.id} targetLabel="المزود" onDone={fetchMyLeads} />}
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
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-primary-500 animate-scale-in" />
                  <h3 className="text-xl font-black text-slate-900 mb-2">تم تقديم طلب الانضمام ✅</h3>
                  <p className="text-slate-500 text-sm mb-1">سيراجع فريقنا بياناتك وسجلك التجاري</p>
                  <p className="text-slate-400 text-xs">يصلك إشعار بالقبول خلال ٢٤-٤٨ ساعة على إيميلك</p>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* المنشآت للشركات فقط */}
                  <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <p className="text-sm font-bold text-primary-700">التسجيل كمزود خدمات للشركات</p>
                      <p className="text-xs text-slate-500 mt-0.5">أمرني للمنشآت مخصص للشركات والمؤسسات المرخّصة — يتطلب سجلاً تجارياً سارياً</p>
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
                            placeholder="1010xxxxxx"
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
      <footer className="bg-[#07101f] text-white py-12 px-4 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <Logo size={26} dark={true} className="mb-2" />
              <p className="text-slate-400 text-sm leading-relaxed">المنصة السعودية الأولى لخدمات B2B — نربط المنشآت بأفضل المستشارين في 18 تخصصاً.</p>
            </div>
            {[
              { title: 'المنشآت', links: ['الحوكمة','السعودة','القانون','المالية'] },
              { title: 'الدعم', links: ['الدعم الفني','سياسة الخصوصية','الشروط','اتصل بنا'] },
              { title: 'التنقل', links: TABS.filter(t => !['my-requests','provider-register'].includes(t.id)).slice(0,4).map(t => t.label) },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-sm font-bold text-white mb-3">{title}</h4>
                <ul className="space-y-2">
                  {links.map(l => (
                    <li key={l}><span className="text-slate-400 text-sm hover:text-white cursor-pointer transition-colors">{l}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <p>© ٢٠٢٦ أمرني - المنصة السعودية الرائدة لتمكين النمو.</p>
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('privacy')} className="hover:text-slate-300 transition-colors">سياسة الخصوصية</button>
              <span className="text-white/20">|</span>
              <button onClick={() => setActiveTab('support')} className="hover:text-slate-300 transition-colors">مركز الدعم</button>
            </div>
          </div>
        </div>
      </footer>
      </div>

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
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500 animate-scale-in" />
                <h3 className="text-lg font-black text-slate-900 mb-2">تم نشر طلبك! 🚀</h3>
                <p className="text-slate-500 text-sm mb-6">طلبك الآن ظاهر لكل المزودين المعتمدين في التخصص. سيصلك إشعار فور قبول أحدهم.</p>
                <div className="flex gap-3 justify-center">
                  {user
                    ? <button onClick={() => { setShowForm(false); setSuccess(false); navigateTab('my-requests') }} className="bg-primary-500 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">عرض طلباتي ←</button>
                    : <button onClick={() => setShowForm(false)} className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">حسناً</button>
                  }
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* بيانات الشركة المحفوظة — مطوية لو موجودة */}
                {savedProfile && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 min-w-0">
                      <CheckCircle2 size={15} className="flex-shrink-0" />
                      <span className="truncate">بيانات {form.company_name || 'شركتك'} محفوظة — {form.contact_email}</span>
                    </div>
                    <button type="button" onClick={() => setSavedProfile(null)}
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
                {!savedProfile && (
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
