import { useState, useEffect } from 'react'
import { Star, ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { VerificationBadge, StarDisplay } from './ReviewBox'
import { PortfolioView } from './PortfolioManager'

// بطاقة ملف المزود المطابق — تظهر للشركة لتقييم المزود قبل الاستمرار
export function ProviderProfileCard({ providerId }: { providerId: string }) {
  const [provider, setProvider] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!providerId) return
    supabase.from('enterprise_providers').select('*').eq('user_id', providerId).maybeSingle()
      .then(({ data }) => setProvider(data))
    supabase.from('enterprise_reviews').select('*').eq('reviewee_id', providerId).eq('role', 'client_reviews_provider').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setReviews(data || []))
  }, [providerId])

  if (!provider) return null

  let details: any = {}
  try { details = provider.description ? JSON.parse(provider.description) : {} } catch {}

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-black text-lg flex-shrink-0">
            {provider.company_name?.[0] || <Building2 size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">{provider.company_name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <VerificationBadge level={provider.verification_level || 'verified'} />
              {provider.review_count > 0 && <StarDisplay rating={provider.rating} count={provider.review_count} />}
            </div>
          </div>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-primary-500 hover:text-primary-700 transition-colors">
          {expanded ? <>إخفاء الملف <ChevronUp size={13} /></> : <>عرض ملف المزود <ChevronDown size={13} /></>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
          {details.years_experience && (
            <div className="text-sm"><span className="text-slate-400">سنوات الخبرة: </span><span className="font-bold text-slate-700">{details.years_experience}</span></div>
          )}
          {details.certifications && (
            <div className="text-sm"><span className="text-slate-400">الشهادات: </span><span className="font-medium text-slate-700">{details.certifications}</span></div>
          )}
          {details.bio && <p className="text-sm text-slate-600 leading-relaxed">{details.bio}</p>}

          <PortfolioView providerId={providerId} />

          {reviews.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">تقييمات العملاء ({reviews.length})</p>
              {reviews.map(r => (
                <div key={r.id} className="bg-white rounded-lg px-3 py-2">
                  <div className="flex gap-0.5 mb-1">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={12} className={r.stars >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                    ))}
                  </div>
                  {r.comment && <p className="text-xs text-slate-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
