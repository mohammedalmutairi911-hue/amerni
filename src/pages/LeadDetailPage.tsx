import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRight, CheckCircle2, Clock, X, Loader2, AlertCircle, MessageSquare, LayoutDashboard, List, Plus, LogOut, Building2, FileText, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { ProviderProfileCard } from '../components/enterprise/ProviderProfileCard'
import { EnterpriseChat } from '../components/chat/EnterpriseChat'
import { StatusTimeline } from '../components/enterprise/UXComponents'
import { ReviewBox } from '../components/enterprise/ReviewBox'
import { useToast } from '../components/Toast'

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  open:      { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-400' },
  matched:   { label: 'بانتظار موافقتك', color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400' },
  closed:    { label: 'مكتمل', color: 'bg-green-50 text-green-600 border-green-200', dot: 'bg-green-400' },
  cancelled: { label: 'ملغى', color: 'bg-red-50 text-red-500 border-red-200', dot: 'bg-red-400' },
  new:       { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-400' },
}

const CATEGORY_LABELS: Record<string, string> = {
  governance: 'الحوكمة والامتثال', saudization: 'نطاقات والسعودة', legal: 'الخدمات القانونية',
  finance: 'المالية والزكاة', iso: 'الجودة والـ ISO', cybersecurity: 'الأمن السيبراني',
  marketing: 'التسويق والعلامة', procurement: 'المشتريات', strategy: 'الاستشارات الإدارية',
  government: 'العلاقات الحكومية', translation: 'الترجمة', hse: 'السلامة المهنية',
  realestate: 'العقارات', training: 'التدريب والتطوير', pm: 'إدارة المشاريع',
  esg: 'الاستدامة والحوكمة', insurance: 'التأمين', audit: 'التدقيق الداخلي',
}

export function LeadDetailPage() {
  const { navigate } = useApp()
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [changing, setChanging] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [contractVal, setContractVal] = useState('')
  const [showClose, setShowClose] = useState(false)
  const [showChangeConfirm, setShowChangeConfirm] = useState(false)

  const leadId = window.location.hash.split('/')[2]

  useEffect(() => {
    if (!leadId) { navigate('enterprises'); return }
    supabase.from('enterprise_leads').select('*').eq('id', leadId).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('enterprises')
        else setLead(data)
        setLoading(false)
      })
  }, [leadId])

  const goBack = () => { sessionStorage.setItem('enterprises_tab', 'my-requests'); navigate('enterprises') }

  const acceptProvider = async () => {
    setAccepting(true)
    await supabase.from('enterprise_leads').update({ company_accepted: true }).eq('id', lead.id)
    await supabase.from('enterprise_messages').insert({
      lead_id: lead.id, sender_id: user?.id, sender_role: 'company',
      content: '✅ وافقت الشركة على المزود — يمكنكم الآن بدء التواصل', is_system: true
    })
    setLead((l: any) => ({ ...l, company_accepted: true }))
    setAccepting(false)
  }

  const changeProvider = async () => {
    setShowChangeConfirm(false)
    setChanging(true)
    const { error } = await supabase.rpc('company_change_provider', { p_lead_id: lead.id })
    setChanging(false)
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    setLead((l: any) => ({ ...l, status: 'open', provider_id: null, company_accepted: false }))
    toast('تم استبعاد المزود — طلبك الآن متاح لباقي المزودين', 'info')
    setTimeout(goBack, 1500)
  }

  const closeLead = async () => {
    const num = parseFloat(contractVal) || null
    setClosing(true)
    const { data, error } = await supabase.rpc('close_enterprise_lead', { p_lead_id: lead.id, p_contract_value: num })
    setClosing(false)
    if (error) { toast('خطأ: ' + error.message, 'error'); return }
    setShowClose(false)
    setLead((l: any) => ({ ...l, status: 'closed' }))
    toast('✅ تم إغلاق الطلب' + (data?.commission ? ` — العمولة المستحقة: ${data.commission} ريال` : ''), 'success')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )
  if (!lead) return null

  const st = lead.status === 'matched' && lead.company_accepted === true
    ? { label: 'جاري التنفيذ', color: 'bg-green-50 text-green-600 border-green-200', dot: 'bg-green-500' }
    : STATUS_MAP[lead.status] || STATUS_MAP.open

  const isMatchedPending = lead.status === 'matched' && lead.provider_id && lead.company_accepted !== true
  const isMatchedActive  = lead.status === 'matched' && lead.provider_id && lead.company_accepted === true
  const isClosed         = lead.status === 'closed'
  const isCancelled      = lead.status === 'cancelled'
  const isOpen           = lead.status === 'open' || lead.status === 'new'

  return (
    <div className="min-h-screen flex bg-slate-50" dir="rtl">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 bg-slate-900 w-56 flex-shrink-0">
        {/* Company Info */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {(profile?.full_name || user?.email || 'ش')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{profile?.full_name || user?.email?.split('@')[0]}</p>
              <p className="text-slate-400 text-xs">عميل المنشآت</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { icon: LayoutDashboard, label: 'لوحة التحكم', action: () => { sessionStorage.setItem('enterprises_tab', 'dashboard'); navigate('enterprises') } },
            { icon: List, label: 'طلباتي', action: goBack, active: true },
            { icon: Plus, label: 'طلب جديد', action: () => { sessionStorage.setItem('enterprises_tab', 'home'); navigate('enterprises') } },
          ].map(({ icon: Icon, label, action, active }: any) => (
            <button key={label} onClick={action}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-primary-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon size={16} />
              <span className="flex-1 text-right">{label}</span>
            </button>
          ))}
        </nav>

        {/* Company name */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-3 mb-2">
            <p className="text-xs text-slate-400 mb-0.5">الطلب الحالي</p>
            <p className="text-white font-bold text-sm truncate">{lead.company_name}</p>
            <p className="text-slate-400 text-xs mt-0.5">{CATEGORY_LABELS[lead.category] || lead.category}</p>
          </div>
          <button onClick={goBack}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-xs py-2 transition-colors">
            <LogOut size={13} /> خروج من الداشبورد
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <button onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-500 transition-colors font-medium">
            <ArrowRight size={16} /> طلباتي
          </button>
          <span className="text-slate-200">/</span>
          <p className="font-bold text-slate-800 truncate flex-1">{lead.company_name}</p>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${st.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </header>

        {/* Content */}
        <div className="flex-1 p-5 md:p-6 max-w-5xl w-full mx-auto space-y-5">

          {/* خط زمني */}
          {!isCancelled && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <StatusTimeline status={isMatchedActive ? 'matched' : lead.status} />
            </div>
          )}

          {/* تفاصيل الطلب + إجراءات */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* تفاصيل الطلب — يمين */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h2 className="font-black text-slate-900 text-lg mb-1">{lead.company_name}</h2>
                <p className="text-sm text-primary-500 font-medium mb-3">{CATEGORY_LABELS[lead.category] || lead.category}</p>
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{lead.description}</p>
                </div>
                <div className="space-y-2">
                  {lead.budget_range && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign size={14} className="text-slate-400" />
                      <span className="text-slate-600">{lead.budget_range}</span>
                    </div>
                  )}
                  {lead.company_size && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="text-slate-600">{lead.company_size} موظف</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-slate-600">{new Date(lead.created_at).toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* إغلاق الطلب card */}
              {isMatchedActive && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText size={15} /> إغلاق الطلب
                  </p>
                  {showClose ? (
                    <div className="space-y-2">
                      <input type="number" value={contractVal} onChange={e => setContractVal(e.target.value)}
                        placeholder="قيمة العقد (ريال)" inputMode="numeric"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                      <p className="text-xs text-slate-400">العمولة ١٪ من القيمة = {contractVal ? Math.round(parseFloat(contractVal)*0.01) : 0} ريال</p>
                      <div className="flex gap-2">
                        <button onClick={closeLead} disabled={closing}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                          {closing ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> تأكيد</>}
                        </button>
                        <button onClick={() => setShowClose(false)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-500">إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowClose(true)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} /> تم التعاقد — أغلق الطلب
                    </button>
                  )}
                  <button onClick={() => setShowChangeConfirm(true)} disabled={changing}
                    className="w-full mt-2 border border-red-200 text-red-500 hover:bg-red-50 py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    {changing ? <Loader2 size={14} className="animate-spin" /> : 'تغيير المزود'}
                  </button>
                </div>
              )}
            </div>

            {/* المحتوى الرئيسي — يسار */}
            <div className="lg:col-span-2 space-y-4">

              {/* بانتظار مزود */}
              {isOpen && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <Clock size={28} className="text-blue-500 animate-pulse" />
                  </div>
                  <p className="font-bold text-blue-700 text-lg">طلبك منشور للمزودين</p>
                  <p className="text-sm text-blue-500 mt-1">ستصلك إشعار فوراً عند قبول أحد المزودين المعتمدين</p>
                </div>
              )}

              {/* انتظار موافقة الشركة */}
              {isMatchedPending && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <p className="font-bold text-blue-800">مزود خدمة قبِل طلبك!</p>
                      <p className="text-sm text-blue-600 mt-0.5">راجع ملفه أدناه وأكّد موافقتك للبدء في التواصل</p>
                    </div>
                  </div>
                  <ProviderProfileCard
                    providerId={lead.provider_id}
                    showActions={true}
                    onAccept={acceptProvider}
                    onReject={() => setShowChangeConfirm(true)}
                    accepting={accepting}
                    rejecting={changing}
                  />
                </div>
              )}

              {/* وافق + شات */}
              {isMatchedActive && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    <p className="text-sm font-bold text-green-700">وافقت على المزود — تواصل معه الآن</p>
                  </div>
                  <ProviderProfileCard providerId={lead.provider_id} showActions={false} />
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <MessageSquare size={15} className="text-primary-500" />
                      <p className="font-bold text-slate-800 text-sm">المحادثة مع المزود</p>
                    </div>
                    <div className="p-3">
                      <EnterpriseChat leadId={lead.id} senderRole="company" />
                    </div>
                  </div>
                </div>
              )}

              {/* مغلق */}
              {isClosed && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                    <CheckCircle2 size={36} className="text-green-500 mx-auto mb-2" />
                    <p className="font-bold text-green-800 text-lg">تم إغلاق الطلب بنجاح!</p>
                    <p className="text-sm text-green-600 mt-1">شكراً لاستخدامك أمرني للمنشآت</p>
                  </div>
                  {lead.provider_id && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <p className="font-bold text-slate-800 mb-3">قيّم تجربتك مع المزود</p>
                      <ReviewBox leadId={lead.id} targetLabel="المزود" />
                    </div>
                  )}
                </div>
              )}

              {/* ملغى */}
              {isCancelled && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                  <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
                  <p className="text-red-600 font-bold">تم إلغاء هذا الطلب</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Provider Confirmation Modal */}
      {showChangeConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={22} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">تغيير المزود؟</h3>
              <p className="text-sm text-slate-500 leading-relaxed">سيُستبعد المزود الحالي نهائياً ويعود طلبك متاحاً لباقي المزودين</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowChangeConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                إلغاء
              </button>
              <button onClick={changeProvider}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors">
                نعم، غيّر المزود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
