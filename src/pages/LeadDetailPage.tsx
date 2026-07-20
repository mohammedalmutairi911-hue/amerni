import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, Clock, X, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { ProviderProfileCard } from '../components/enterprise/ProviderProfileCard'
import { EnterpriseChat } from '../components/chat/EnterpriseChat'
import { StatusTimeline } from '../components/enterprise/UXComponents'
import { ReviewBox } from '../components/enterprise/ReviewBox'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  open:      { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  matched:   { label: 'مزود قبِل — جاري التنفيذ', color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle2 },
  closed:    { label: 'مكتمل', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: CheckCircle2 },
  cancelled: { label: 'ملغى', color: 'bg-red-50 text-red-500 border-red-200', icon: X },
  new:       { label: 'منشور — بانتظار مزود', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
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
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [changing, setChanging] = useState(false)

  // نقرأ الـ leadId من hash: #/lead-detail/ID
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

  const closeLead = async () => {
    const val = prompt('قيمة العقد المتفق عليها (ريال) — لحساب العمولة ١٪:')
    if (val === null) return
    setClosing(true)
    const { data, error } = await supabase.rpc('close_enterprise_lead', {
      p_lead_id: lead.id, p_contract_value: parseFloat(val) || null
    })
    setClosing(false)
    if (error) { alert('خطأ: ' + error.message); return }
    alert('تم إغلاق الطلب' + (data?.commission ? ` — العمولة: ${data.commission} ريال` : ''))
    setLead((l: any) => ({ ...l, status: 'closed' }))
  }

  const changeProvider = async () => {
    if (!confirm('تغيير المزود؟ سيُستبعد الحالي نهائياً ويعود طلبك لباقي المزودين.')) return
    setChanging(true)
    const { error } = await supabase.rpc('company_change_provider', { p_lead_id: lead.id })
    setChanging(false)
    if (error) { alert('خطأ: ' + error.message); return }
    setLead((l: any) => ({ ...l, status: 'open', provider_id: null }))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-primary-400" />
    </div>
  )
  if (!lead) return null

  const st = STATUS_MAP[lead.status] || STATUS_MAP.open
  const StIcon = st.icon

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate('enterprises')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowRight size={16} /> طلباتي
        </button>
        <span className="text-slate-300">/</span>
        <p className="font-bold text-slate-800 truncate">{lead.company_name}</p>
        <span className={`mr-auto text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${st.color}`}>
          <StIcon size={11} /> {st.label}
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* خط زمني */}
        {lead.status !== 'cancelled' && <StatusTimeline status={lead.status} />}

        {/* تفاصيل الطلب */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900">{lead.company_name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{CATEGORY_LABELS[lead.category] || lead.category}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${st.color}`}>
              {st.label}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-slate-700 leading-relaxed">{lead.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {lead.budget_range && <span className="bg-slate-100 px-2.5 py-1 rounded-lg">💰 {lead.budget_range}</span>}
            {lead.company_size && <span className="bg-slate-100 px-2.5 py-1 rounded-lg">👥 {lead.company_size} موظف</span>}
            <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
              🗓 {new Date(lead.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* طلب مفتوح - بانتظار مزود */}
        {(lead.status === 'open' || lead.status === 'new') && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
            <Clock size={32} className="text-blue-400 mx-auto mb-2 animate-pulse" />
            <p className="font-bold text-blue-700">طلبك منشور لكل المزودين المعتمدين</p>
            <p className="text-sm text-blue-500 mt-1">ستصلك إشعار فوراً عند قبول أحدهم</p>
          </div>
        )}

        {/* مزود قبل الطلب */}
        {lead.status === 'matched' && lead.provider_id && (
          <>
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> مزود الخدمة
              </h2>
              <ProviderProfileCard providerId={lead.provider_id} />
            </div>

            <EnterpriseChat leadId={lead.id} senderRole="company" />

            <div className="flex gap-3">
              <button onClick={closeLead} disabled={closing}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {closing ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={15} /> إغلاق الطلب (تم التعاقد)</>}
              </button>
              <button onClick={changeProvider} disabled={changing}
                className="border border-red-200 text-red-500 hover:bg-red-50 font-bold px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                {changing ? <Loader2 size={15} className="animate-spin" /> : 'تغيير المزود'}
              </button>
            </div>
          </>
        )}

        {/* مغلق - تقييم */}
        {lead.status === 'closed' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
              <p className="text-green-700 font-bold">تم إغلاق الطلب بنجاح — شكراً لاستخدامك أمرني للمنشآت</p>
            </div>
            {lead.provider_id && (
              <ReviewBox leadId={lead.id} targetLabel="المزود" />
            )}
          </div>
        )}

        {/* ملغى */}
        {lead.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-red-600 font-medium">تم إلغاء هذا الطلب</p>
          </div>
        )}
      </div>
    </div>
  )
}
