import { useState, useEffect } from 'react'
import { COMPANY } from '../lib/constants'
import { Star, CheckCircle, Zap, Loader2, DollarSign, Home, List,
  User, LogOut, BarChart2, Briefcase, MessageSquare,
  Wifi, WifiOff, ChevronRight, Building2, Clock, AlertCircle,
  Shield, Phone, Mail, Globe, Linkedin, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new:       { label: 'جديد', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  reviewing: { label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  matched:   { label: 'تمت المطابقة', color: 'bg-green-50 text-green-600 border-green-200' },
  closed:    { label: 'مغلق', color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const CATEGORY_LABELS: Record<string, string> = {
  governance: 'الحوكمة والامتثال', saudization: 'نطاقات والسعودة',
  legal: 'الاستشارات القانونية', finance: 'المالية والزكاة',
  quality: 'الجودة وISO', tech: 'التقنية والأمن السيبراني',
  marketing: 'التسويق والعلامة التجارية', procurement: 'المشتريات',
  strategy: 'الاستراتيجية والتخطيط', government: 'العلاقات الحكومية',
  translation: 'الترجمة والتعريب', hse: 'السلامة المهنية',
  realestate: 'العقارات والمرافق', training: 'التدريب والتطوير',
  pm: 'إدارة المشاريع', esg: 'الاستدامة وESG',
  insurance: 'التأمين', audit: 'التدقيق والمراجعة',
}

export function ProviderDashboard() {
  const { user, profile, signOut } = useAuth()
  const { navigate } = useApp()

  const [tab, setTab] = useState<'overview' | 'leads' | 'profile'>('overview')
  const [providerData, setProviderData] = useState<any>(null)
  const [matchedLeads, setMatchedLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (user) fetchAll()
  }, [user?.id])

  const fetchAll = async () => {
    setLoading(true)
    const [provRes, leadsRes] = await Promise.all([
      supabase.from('enterprise_providers').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('enterprise_leads').select('*').eq('provider_id', user!.id).order('created_at', { ascending: false })
    ])
    if (provRes.data) {
      setProviderData(provRes.data)
      setIsAvailable(provRes.data.is_approved)
    }
    setMatchedLeads(leadsRes.data || [])
    setLoading(false)
  }

  const toggleAvailable = async () => {
    if (!providerData) return
    setToggling(true)
    // نحفظ حالة التوفر في الوصف
    setIsAvailable(v => !v)
    setToggling(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )

  // لو لم يسجل كمزود بعد
  if (!providerData) return (
    <div className="min-h-screen flex items-center justify-center px-4" dir="rtl">
      <div className="text-center max-w-md">
        <Building2 size={56} className="mx-auto mb-4 text-slate-300" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">لم تسجل كمزود خدمة بعد</h2>
        <p className="text-slate-500 mb-6">سجّل معلوماتك ووثائقك للانضمام لشبكة مزودي أمرني</p>
        <button onClick={() => navigate('enterprises')}
          className="bg-primary-500 text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary-600 transition-colors">
          سجّل كمزود خدمة
        </button>
      </div>
    </div>
  )

  // parse details من الـ description JSON
  let details: any = {}
  try { details = JSON.parse(providerData.description || '{}') } catch {}

  const activeCats = (providerData.categories || []).map((id: string) => CATEGORY_LABELS[id] || id)
  const matchedCount = matchedLeads.filter(l => l.status === 'matched').length
  const closedCount = matchedLeads.filter(l => l.status === 'closed').length

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" dir="rtl">

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col h-screen fixed right-0 top-0 bg-white border-l border-slate-200 w-64 z-50 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <button onClick={() => navigate('landing')} className="text-xl font-black text-primary-500">أمرني</button>
          <p className="text-xs text-slate-400 mt-1">للمنشآت — مزود خدمة</p>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-black text-lg flex-shrink-0">
            {providerData.company_name?.[0] || '؟'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{providerData.company_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${providerData.is_approved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
              {providerData.is_approved ? 'معتمد ✓' : 'قيد المراجعة'}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: 'overview', icon: BarChart2, label: 'نظرة عامة' },
            { id: 'leads', icon: Briefcase, label: 'الطلبات المطابقة', badge: matchedLeads.length },
            { id: 'profile', icon: User, label: 'ملفي الشخصي' },
          ].map(({ id, icon: Icon, label, badge }: any) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                tab === id ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              <Icon size={16} />
              <span className="flex-1 text-right">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${tab === id ? 'bg-white text-primary-500' : 'bg-primary-500 text-white'}`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <button onClick={toggleAvailable} disabled={toggling || !providerData.is_approved}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              isAvailable && providerData.is_approved ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
            {toggling ? <Loader2 size={14} className="animate-spin" /> :
              isAvailable && providerData.is_approved ? <><Wifi size={14} />متاح للطلبات</> : <><WifiOff size={14} />غير متاح</>}
          </button>
          <div className="flex gap-2 text-xs justify-center">
            <button onClick={async () => { await signOut(); navigate('landing') }} className="text-red-400 hover:text-red-500 font-medium flex items-center gap-1">
              <LogOut size={11} /> تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:mr-64 min-h-screen pb-20 md:pb-0">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('landing')} className="md:hidden text-lg font-black text-primary-500">أمرني</button>
            <div className="hidden md:block">
              <h2 className="text-xl font-black text-slate-900">لوحة تحكم مزود الخدمة</h2>
              <p className="text-slate-500 text-sm">مرحباً <span className="text-primary-500 font-bold">{providerData.contact_name}</span> 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!providerData.is_approved && (
              <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-full font-bold">
                ⏳ قيد المراجعة
              </span>
            )}
            {providerData.is_approved && (
              <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full font-bold">
                ✓ معتمد
              </span>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6">

          {/* Mobile Welcome */}
          <div className="md:hidden bg-primary-50 border border-primary-100 rounded-2xl px-5 py-4">
            <p className="text-slate-500 text-xs mb-0.5">مرحباً 👋</p>
            <h2 className="text-xl font-black text-slate-900">{providerData.contact_name}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{providerData.company_name}</p>
          </div>

          {/* ─── OVERVIEW ─── */}
          {tab === 'overview' && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { icon: DollarSign, label: 'عمولة مستحقة', value: matchedLeads.filter(l => l.status === 'closed' && !l.commission_paid).length > 0 ? `${matchedLeads.filter(l => l.status === 'closed' && !l.commission_paid).length} غير مدفوعة` : '٠ ريال', badge: 'IBAN: SA54...7', badgeColor: 'bg-primary-50 text-primary-600', iconBg: 'bg-primary-50', iconColor: 'text-primary-500' },
                  { icon: Briefcase, label: 'طلبات مطابقة', value: matchedCount.toString(), badge: `${closedCount} مكتملة`, badgeColor: 'bg-green-50 text-green-600', iconBg: 'bg-green-50', iconColor: 'text-green-500' },
                  { icon: Star, label: 'التقييم', value: providerData.rating ? providerData.rating.toFixed(1) : '—', badge: providerData.deals_count ? `${providerData.deals_count} صفقة` : 'لا صفقات بعد', badgeColor: 'bg-amber-50 text-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
                ].map(({ icon: Icon, label, value, badge, badgeColor, iconBg, iconColor }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${iconBg}`}><Icon size={20} className={iconColor} /></div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>
                    </div>
                    <p className="text-slate-500 text-sm">{label}</p>
                    <p className="text-3xl font-black text-primary-500 mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {/* Not approved banner */}
              {!providerData.is_approved && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                  <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                    <Clock size={18} /> طلبك قيد المراجعة
                  </h3>
                  <p className="text-amber-700 text-sm leading-relaxed">
                    فريقنا يراجع بياناتك ووثائقك — سيتواصل معك خلال ٤٨ ساعة على <span className="font-bold">{providerData.contact_email}</span> لإتمام عملية الاعتماد.
                  </p>
                </div>
              )}

              {/* Commission reminder */}
              {matchedLeads.filter(l => l.status === 'matched').length > 0 && (
                <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-green-700">✅ لديك طلبات مطابقة!</p>
                    <p className="text-xs text-green-600 mt-0.5">تذكر دفع عمولة ١٪ من قيمة العقد خلال ٧٢ ساعة من التوقيع</p>
                  </div>
                  <button onClick={() => setTab('leads')}
                    className="flex-shrink-0 bg-green-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-green-600 transition-colors">
                    عرض الطلبات
                  </button>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Recent Leads */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-lg">آخر الطلبات المطابقة</h3>
                    <button onClick={() => setTab('leads')} className="text-primary-500 text-sm font-semibold hover:underline">عرض الكل</button>
                  </div>
                  {matchedLeads.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                      <Zap size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">لا توجد طلبات مطابقة بعد</p>
                      <p className="text-slate-300 text-xs mt-1">ستظهر هنا عند مطابقتك مع شركة</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {matchedLeads.slice(0, 3).map(lead => {
                        const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                        return (
                          <button key={lead.id} onClick={() => setTab('leads')}
                            className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary-300 transition-all text-right flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${st.color}`}>
                              <Briefcase size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{lead.company_name}</p>
                              <p className="text-xs text-slate-400">{CATEGORY_LABELS[lead.category] || lead.category} • {st.label}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Specialties */}
                <div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4">تخصصاتي</h3>
                    {activeCats.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">لا تخصصات مسجلة</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {activeCats.map((cat: string) => (
                          <span key={cat} className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2.5 py-1 rounded-full font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Commission info */}
                  <div className="mt-4 bg-slate-900 rounded-2xl p-4 text-white">
                    <p className="text-xs text-slate-400 mb-1">نظام العمولة الحالي</p>
                    <p className="text-2xl font-black text-primary-400">١٪</p>
                    <p className="text-xs text-slate-300 mt-1">من قيمة العقد خلال ٧٢ ساعة</p>
                    <p className="text-xs text-slate-400 mt-2">{COMPANY.iban}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── LEADS ─── */}
          {tab === 'leads' && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-5">الطلبات المطابقة معي</h3>
              {matchedLeads.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                  <Briefcase size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">لا توجد طلبات مطابقة بعد</p>
                  <p className="text-slate-400 text-sm mt-1">سيُعلمك الفريق عند مطابقتك مع شركة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchedLeads.map(lead => {
                    const st = STATUS_MAP[lead.status] || STATUS_MAP.new
                    return (
                      <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-bold text-slate-900 text-lg">{lead.company_name}</p>
                            <p className="text-sm text-slate-500">{CATEGORY_LABELS[lead.category] || lead.category}</p>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${st.color}`}>{st.label}</span>
                        </div>

                        <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed mb-3">{lead.description}</p>

                        <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-3">
                          {lead.budget_range && <span className="bg-slate-100 px-2 py-0.5 rounded">💰 {lead.budget_range}</span>}
                          {lead.company_size && <span className="bg-slate-100 px-2 py-0.5 rounded">👥 {lead.company_size} موظف</span>}
                          {lead.contact_phone && <span className="bg-slate-100 px-2 py-0.5 rounded">📞 {lead.contact_phone}</span>}
                          <span>{new Date(lead.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>

                        {/* Contact info when matched */}
                        {lead.status === 'matched' && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="font-bold text-green-800 text-sm mb-2 flex items-center gap-1.5">
                              <CheckCircle size={14} /> تواصل مع الشركة
                            </p>
                            <div className="space-y-1.5">
                              <p className="text-sm text-green-700 flex items-center gap-2"><User size={13} /> {lead.contact_name}</p>
                              <a href={`mailto:${lead.contact_email}`} className="text-sm text-green-600 flex items-center gap-2 hover:underline"><Mail size={13} /> {lead.contact_email}</a>
                              {lead.contact_phone && <p className="text-sm text-green-700 flex items-center gap-2"><Phone size={13} /> {lead.contact_phone}</p>}
                            </div>
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <p className="text-xs text-amber-700 font-bold">⚠️ تذكير العمولة</p>
                              <p className="text-xs text-amber-600 mt-0.5">بعد توقيع العقد، حوّل ١٪ من قيمته لـ IBAN: {COMPANY.iban} (بنك البلاد) خلال ٧٢ ساعة</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── PROFILE ─── */}
          {tab === 'profile' && (
            <div className="max-w-2xl">
              <h3 className="font-bold text-slate-900 text-lg mb-5">ملفي الشخصي</h3>
              <div className="space-y-4">

                {/* Basic */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-black text-2xl">
                      {providerData.company_name?.[0] || '؟'}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-xl">{providerData.company_name}</p>
                      <p className="text-slate-500 text-sm">{providerData.contact_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${providerData.is_approved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {providerData.is_approved ? '✓ معتمد' : '⏳ قيد المراجعة'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {[
                      ['البريد الإلكتروني', providerData.contact_email, Mail],
                      ['رقم الجوال', providerData.contact_phone, Phone],
                      ['المدينة', details.city || providerData.city, MapPin],
                    ].filter(([,v]) => v).map(([k,v,Icon]: any) => (
                      <div key={k} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="text-slate-900 font-medium flex items-center gap-2"><Icon size={13} className="text-slate-400" />{v}</span>
                        <span className="text-slate-400">{k}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification docs */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><Shield size={15} /> وثائق التحقق المقدمة</h4>
                  <div className="space-y-2 text-sm">
                    {details.provider_type && <div className="flex justify-between"><span className="text-blue-700">النوع</span><span className="font-medium text-blue-900">{details.provider_type === 'company' ? 'شركة/مؤسسة' : 'فرد مستقل'}</span></div>}
                    {(details.cr_number || providerData.cr_number) && <div className="flex justify-between"><span className="text-blue-700">رقم السجل التجاري</span><span className="font-mono font-medium text-blue-900">{details.cr_number || providerData.cr_number}</span></div>}
                    {details.freelance_doc && <div className="flex justify-between"><span className="text-blue-700">وثيقة عمل حر</span><span className="font-mono font-medium text-blue-900">{details.freelance_doc}</span></div>}
                    {details.vat_number && <div className="flex justify-between"><span className="text-blue-700">الرقم الضريبي</span><span className="font-mono font-medium text-blue-900">{details.vat_number}</span></div>}
                    {details.cr_expiry && <div className="flex justify-between"><span className="text-blue-700">انتهاء السجل</span><span className="font-medium text-blue-900">{details.cr_expiry}</span></div>}
                  </div>
                </div>

                {/* Experience */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><Star size={15} /> الخبرات والمؤهلات</h4>
                  <div className="space-y-2 text-sm">
                    {details.years_experience && <div className="flex justify-between"><span className="text-green-700">سنوات الخبرة</span><span className="font-medium text-green-900">{details.years_experience}</span></div>}
                    {details.certifications && <div className="flex flex-col gap-1"><span className="text-green-700">الشهادات المهنية</span><span className="font-medium text-green-900 bg-white rounded-lg px-3 py-2">{details.certifications}</span></div>}
                    {details.prev_clients && <div className="flex flex-col gap-1"><span className="text-green-700">عملاء سابقون</span><span className="font-medium text-green-900 bg-white rounded-lg px-3 py-2">{details.prev_clients}</span></div>}
                  </div>
                </div>

                {/* Bio */}
                {details.bio && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h4 className="font-bold text-slate-900 mb-2">النبذة التعريفية</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{details.bio}</p>
                  </div>
                )}

                {/* Links */}
                {(providerData.linkedin_url || providerData.website_url) && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h4 className="font-bold text-slate-900 mb-3">الروابط</h4>
                    <div className="flex flex-col gap-2">
                      {providerData.linkedin_url && <a href={providerData.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-500 hover:underline"><Linkedin size={15} /> {providerData.linkedin_url}</a>}
                      {providerData.website_url && <a href={providerData.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary-500 hover:underline"><Globe size={15} /> {providerData.website_url}</a>}
                    </div>
                  </div>
                )}

                {/* Specialties */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-900 mb-3">التخصصات</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeCats.map((cat: string) => (
                      <span key={cat} className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1 rounded-full font-medium">{cat}</span>
                    ))}
                  </div>
                </div>

                {/* Commission */}
                <div className="bg-slate-900 rounded-2xl p-5 text-white">
                  <h4 className="font-bold text-primary-400 mb-3">نظام العمولة</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    عمولة <span className="text-primary-400 font-black text-lg">١٪</span> من قيمة كل عقد تُبرمه مع شركة عبر أمرني — تُحوَّل خلال ٧٢ ساعة من التوقيع.
                  </p>
                  <div className="mt-3 bg-slate-800 rounded-xl p-3 font-mono text-xs text-slate-400">
                    {COMPANY.iban} • بنك البلاد
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 right-0 w-full flex justify-around items-center h-16 bg-white border-t border-slate-200 z-50 shadow-lg">
        {[
          { id: 'overview', icon: Home, label: 'الرئيسية' },
          { id: 'leads', icon: Briefcase, label: 'الطلبات', badge: matchedLeads.length },
          { id: 'profile', icon: User, label: 'ملفي' },
        ].map(({ id, icon: Icon, label, badge }: any) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex flex-col items-center gap-1 px-4 py-1 relative transition-all ${tab === id ? 'text-primary-500' : 'text-slate-400'}`}>
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
            {badge > 0 && <span className="absolute top-0 right-2 w-4 h-4 bg-primary-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">{badge > 9 ? '9+' : badge}</span>}
          </button>
        ))}
        <button onClick={async () => { await signOut(); navigate('landing') }} className="flex flex-col items-center gap-1 px-4 py-1 text-red-400">
          <LogOut size={20} />
          <span className="text-[10px] font-medium">خروج</span>
        </button>
      </nav>
    </div>
  )
}
