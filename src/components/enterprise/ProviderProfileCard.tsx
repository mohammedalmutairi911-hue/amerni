import { useState, useEffect } from 'react'
import { Star, ChevronDown, ChevronUp, Building2, Phone, Mail, Globe, Linkedin, Award, Briefcase, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { VerificationBadge, StarDisplay } from './ReviewBox'
import { PortfolioView } from './PortfolioManager'
import { ResponseSpeed } from './UXComponents'

export function ProviderProfileCard({ providerId }: { providerId: string }) {
  const [provider, setProvider] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [expanded, setExpanded] = useState(true) // مفتوح دائماً // مفتوح افتراضياً

  useEffect(() => {
    if (!providerId) return
    supabase.from('enterprise_providers').select('*').eq('user_id', providerId).maybeSingle()
      .then(({ data }) => setProvider(data))
    supabase.from('enterprise_reviews').select('*').eq('reviewee_id', providerId)
      .eq('role', 'client_reviews_provider').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setReviews(data || []))
    supabase.from('provider_portfolio').select('*').eq('provider_id', providerId)
      .order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setPortfolio(data || []))
  }, [providerId])

  if (!provider) return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
      <div className="h-5 bg-slate-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/3" />
    </div>
  )

  let details: any = {}
  try { details = provider.description ? JSON.parse(provider.description) : {} } catch {}

  return (
    <div className="bg-white border-2 border-primary-100 rounded-2xl overflow-hidden">
      {/* رأس البطاقة */}
      <div className="bg-gradient-to-l from-primary-50 to-white p-4 border-b border-primary-100">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-black text-2xl flex-shrink-0 shadow-md">
            {provider.company_name?.[0] || '🏢'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900 text-lg leading-tight">{provider.company_name}</p>
            <p className="text-sm text-slate-500 mt-0.5">{provider.contact_name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <VerificationBadge level={provider.verification_level || 'verified'} />
              {provider.review_count > 0
                ? <StarDisplay rating={provider.rating} count={provider.review_count} />
                : <span className="text-xs text-slate-400">لا يوجد تقييمات بعد</span>}
              <ResponseSpeed minutes={provider.avg_response_minutes} />
            </div>
          </div>
        </div>

        {/* زر طيّ/فتح */}
        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors">
          {expanded ? <><ChevronUp size={13} /> طيّ الملف</> : <><ChevronDown size={13} /> عرض الملف الكامل</>}
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">

          {/* معلومات التواصل */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-slate-500 mb-2">معلومات التواصل</p>
            {provider.contact_email && (
              <a href={`mailto:${provider.contact_email}`}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 hover:underline">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                {provider.contact_email}
              </a>
            )}
            {provider.contact_phone && (
              <a href={`tel:${provider.contact_phone}`}
                className="flex items-center gap-2 text-sm text-slate-700">
                <Phone size={14} className="text-slate-400 flex-shrink-0" />
                {provider.contact_phone}
              </a>
            )}
            {provider.city && (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-slate-400 flex-shrink-0 text-base">📍</span>
                {provider.city}
              </p>
            )}
            {details.website_url || provider.website_url ? (
              <a href={details.website_url || provider.website_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                <Globe size={14} className="text-slate-400 flex-shrink-0" /> الموقع الإلكتروني
              </a>
            ) : null}
            {details.linkedin_url || provider.linkedin_url ? (
              <a href={details.linkedin_url || provider.linkedin_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                <Linkedin size={14} className="text-slate-400 flex-shrink-0" /> LinkedIn
              </a>
            ) : null}
          </div>

          {/* بيانات الشركة */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(provider.cr_number || details.cr_number) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <p className="text-blue-400 mb-0.5">السجل التجاري</p>
                <p className="font-black text-blue-700 font-mono">{provider.cr_number || details.cr_number}</p>
              </div>
            )}
            {details.vat_number && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <p className="text-slate-400 mb-0.5">الرقم الضريبي</p>
                <p className="font-bold text-slate-700 font-mono">{details.vat_number}</p>
              </div>
            )}
            {details.years_experience && details.years_experience !== '' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <p className="text-slate-400 mb-0.5 flex items-center gap-1"><Clock size={10} /> سنوات الخبرة</p>
                <p className="font-bold text-slate-700">{details.years_experience} سنوات</p>
              </div>
            )}
            {provider.accepted_count > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                <p className="text-green-400 mb-0.5">طلبات مكتملة</p>
                <p className="font-bold text-green-700">{provider.accepted_count} طلب</p>
              </div>
            )}
          </div>

          {/* التخصصات */}
          {provider.categories?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1.5">التخصصات</p>
              <div className="flex flex-wrap gap-1.5">
                {provider.categories.map((cat: string) => (
                  <span key={cat} className="text-xs bg-primary-50 text-primary-600 border border-primary-200 px-2.5 py-1 rounded-full font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* الشهادات والمؤهلات */}
          {(details.certifications && details.certifications.trim()) && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-bold text-green-600 mb-1 flex items-center gap-1">
                <Award size={12} /> الشهادات والمؤهلات
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{details.certifications}</p>
            </div>
          )}

          {/* عملاء سابقون */}
          {(details.prev_clients && details.prev_clients.trim()) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-1">عملاء سابقون</p>
              <p className="text-sm text-slate-700">{details.prev_clients}</p>
            </div>
          )}

          {/* النبذة */}
          {(details.bio && details.bio.trim()) && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1.5">نبذة تعريفية</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-4 py-3">{details.bio}</p>
            </div>
          )}

          {/* الأعمال السابقة */}
          {portfolio.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                <Briefcase size={11} /> الأعمال السابقة ({portfolio.length})
              </p>
              <div className="space-y-2">
                {portfolio.map(w => (
                  <div key={w.id} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="font-bold text-sm text-slate-800">{w.title}</p>
                    {w.description && <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>}
                    <div className="flex gap-2 mt-1 text-xs text-slate-400">
                      {w.client_name && <span>{w.client_name}</span>}
                      {w.year && <span>· {w.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* تقييمات العملاء */}
          {reviews.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1.5">
                تقييمات العملاء ({reviews.length})
              </p>
              <div className="space-y-2">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white border border-slate-100 rounded-xl px-3 py-2.5">
                    <div className="flex gap-0.5 mb-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={13} className={r.stars >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                    {r.comment && <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>}
                    {r.response && (
                      <div className="mt-1.5 bg-primary-50 rounded px-2 py-1 border-r-2 border-primary-400">
                        <p className="text-xs font-bold text-primary-600">رد المزود:</p>
                        <p className="text-xs text-slate-600">{r.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* لا يوجد بيانات تفصيلية */}
          {!details.bio && !details.certifications && portfolio.length === 0 && reviews.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">لم يضف المزود تفاصيل إضافية بعد</p>
          )}
        </div>
      )}
    </div>
  )
}
