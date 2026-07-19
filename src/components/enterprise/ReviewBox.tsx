import { useState } from 'react'
import { Star, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  leadId: string
  onDone?: () => void
  targetLabel: string  // "المزود" أو "العميل"
}

export function ReviewBox({ leadId, onDone, targetLabel }: Props) {
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (stars === 0) { setError('اختر عدد النجوم'); return }
    setSubmitting(true); setError('')
    const { error: err } = await supabase.rpc('submit_enterprise_review', {
      p_lead_id: leadId, p_stars: stars, p_comment: comment.trim() || null
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setDone(true)
    onDone?.()
  }

  if (done) return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700">
      <CheckCircle2 size={16} /> شكراً! تم حفظ تقييمك
    </div>
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm font-bold text-slate-700 mb-3">قيّم {targetLabel}</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            onClick={() => setStars(n)}
            className="transition-transform hover:scale-110">
            <Star size={28} className={(hover || stars) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        rows={2} maxLength={1000} placeholder="اكتب تعليقاً (اختياري)..."
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50 resize-none mb-2" />
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button onClick={submit} disabled={submitting}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {submitting ? <Loader2 size={15} className="animate-spin" /> : 'إرسال التقييم'}
      </button>
    </div>
  )
}

// شارة التوثيق
export function VerificationBadge({ level }: { level?: string }) {
  if (level === 'premium') return (
    <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
      <CheckCircle2 size={11} /> موثّق مميّز
    </span>
  )
  if (level === 'verified') return (
    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
      <CheckCircle2 size={11} /> موثّق
    </span>
  )
  return null
}

// عرض النجوم (للقراءة فقط)
export function StarDisplay({ rating, count }: { rating?: number; count?: number }) {
  const r = rating || 0
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={14} className="fill-amber-400 text-amber-400" />
      <span className="font-bold text-slate-700">{r > 0 ? r.toFixed(1) : 'جديد'}</span>
      {count ? <span className="text-slate-400 text-xs">({count})</span> : null}
    </span>
  )
}
