import { useState, useEffect } from 'react'
import { Clock, Zap, CheckCircle2, Circle, Send, FileText, Users, Award } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ١. مؤشر سرعة الاستجابة
export function ResponseSpeed({ minutes }: { minutes?: number | null }) {
  if (!minutes) return null
  let label = ''
  if (minutes <= 60) label = 'يرد خلال ساعة'
  else if (minutes <= 180) label = 'يرد خلال ٣ ساعات'
  else if (minutes <= 1440) label = 'يرد خلال يوم'
  else label = 'يرد خلال أيام'
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
      <Zap size={11} /> {label}
    </span>
  )
}

// ٦. خط زمني لحالة الطلب
const TIMELINE_STEPS = [
  { key: 'open', label: 'نُشر الطلب', icon: FileText },
  { key: 'matched', label: 'قبِله مزود', icon: CheckCircle2 },
  { key: 'closed', label: 'اكتمل', icon: Award },
]
export function StatusTimeline({ status }: { status: string }) {
  const order = ['open', 'matched', 'closed']
  const norm = status === 'new' || status === 'reviewing' ? 'open' : status
  const currentIdx = order.indexOf(norm)
  return (
    <div className="flex items-center gap-1 py-2">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const Icon = done ? step.icon : Circle
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                <Icon size={14} />
              </div>
              <span className={`text-xs whitespace-nowrap ${done ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>{step.label}</span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < currentIdx ? 'bg-primary-500' : 'bg-slate-100'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ٣. دليل اجتماعي بالأرقام
export function SocialProofBar() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    supabase.rpc('get_platform_stats').then(({ data }) => setStats(data))
  }, [])
  if (!stats || stats.verified_providers === 0) return null
  const items = [
    { icon: Users, value: stats.verified_providers, label: 'مزود معتمد' },
    { icon: CheckCircle2, value: stats.completed_leads, label: 'طلب مكتمل' },
    { icon: Award, value: stats.categories, label: 'تخصص' },
  ].filter(i => i.value > 0)
  if (items.length === 0) return null
  return (
    <div className="flex items-center justify-center gap-6 flex-wrap py-3 px-4 bg-slate-50 rounded-xl">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <it.icon size={16} className="text-primary-500" />
          <span className="font-black text-slate-800">{it.value}</span>
          <span className="text-xs text-slate-500">{it.label}</span>
        </div>
      ))}
    </div>
  )
}

// ٢. حالة فارغة ذكية
export function EmptyRequests({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
        <FileText size={28} className="text-primary-400" />
      </div>
      <h3 className="font-bold text-slate-800 mb-2">ابدأ بنشر أول طلب</h3>
      <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto leading-relaxed">
        انشر احتياج منشأتك، وسيصلك مزودون معتمدون خلال ساعات. أول من يقبل يبدأ التواصل معك مباشرة.
      </p>
      <div className="flex flex-col gap-2 max-w-xs mx-auto text-right mb-5">
        {['اختر التخصص واكتب احتياجك', 'يصل طلبك لكل المزودين المعتمدين', 'أول مزود يقبل — تبدأ المحادثة'].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
            {s}
          </div>
        ))}
      </div>
      <button onClick={onCreate}
        className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors inline-flex items-center gap-2">
        <Send size={15} /> انشر طلبك الآن
      </button>
    </div>
  )
}

// ٤. الرد على تقييم (للمزود)
export function ReviewResponse({ reviewId, existing, onDone }: { reviewId: string; existing?: string; onDone?: () => void }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [show, setShow] = useState(false)

  if (existing) return (
    <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 border-r-2 border-primary-300">
      <p className="text-xs font-bold text-slate-500 mb-0.5">رد المزود:</p>
      <p className="text-xs text-slate-600">{existing}</p>
    </div>
  )

  const submit = async () => {
    if (!text.trim()) return
    setSaving(true)
    const { error } = await supabase.rpc('respond_to_review', { p_review_id: reviewId, p_response: text.trim() })
    setSaving(false)
    if (!error) { setShow(false); onDone?.() }
  }

  if (!show) return (
    <button onClick={() => setShow(true)} className="text-xs text-primary-500 hover:underline mt-1">الرد على التقييم</button>
  )
  return (
    <div className="mt-2 flex gap-2">
      <input value={text} onChange={e => setText(e.target.value)} maxLength={500}
        placeholder="اكتب ردك..." className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white" />
      <button onClick={submit} disabled={saving || !text.trim()}
        className="bg-primary-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">إرسال</button>
    </div>
  )
}

// تقييمات المزود مع إمكانية الرد
export function ProviderReviews({ providerId }: { providerId: string }) {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    supabase.from('enterprise_reviews').select('*')
      .eq('reviewee_id', providerId).eq('role', 'client_reviews_provider')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setReviews(data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [providerId])

  if (loading) return null
  if (reviews.length === 0) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h4 className="font-bold text-slate-800 mb-2">تقييمات العملاء</h4>
      <p className="text-sm text-slate-400 text-center py-3">لا توجد تقييمات بعد — أكمل طلبات لتحصل على تقييمات</p>
    </div>
  )

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h4 className="font-bold text-slate-800 mb-3">تقييمات العملاء ({reviews.length})</h4>
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
            <div className="flex gap-0.5 mb-1">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={r.stars >= n ? 'text-amber-400' : 'text-slate-200'}>★</span>
              ))}
            </div>
            {r.comment && <p className="text-sm text-slate-600 mb-1">{r.comment}</p>}
            <ReviewResponse reviewId={r.id} existing={r.response} onDone={load} />
          </div>
        ))}
      </div>
    </div>
  )
}
