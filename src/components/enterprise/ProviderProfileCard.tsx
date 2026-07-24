import { useState, useEffect } from 'react'
import { Star, MapPin, Phone, Mail, Briefcase, Shield, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ResponseSpeed } from './UXComponents'

interface Props {
  providerId: string
  onAccept?: () => void
  onReject?: () => void
  accepting?: boolean
  rejecting?: boolean
  showActions?: boolean
}

export function ProviderProfileCard({ providerId, onAccept, onReject, accepting, rejecting, showActions = false }: Props) {
  const [provider, setProvider] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])

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
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3">
      <div className="flex gap-3"><div className="w-14 h-14 bg-slate-100 rounded-2xl"/><div className="flex-1 space-y-2"><div className="h-5 bg-slate-100 rounded w-1/2"/><div className="h-3 bg-slate-100 rounded w-1/3"/></div></div>
      <div className="h-24 bg-slate-100 rounded-xl"/>
    </div>
  )

  let details: any = {}
  try { details = provider.description ? JSON.parse(provider.description) : {} } catch {}

  const rating = parseFloat(provider.rating) || 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" dir="rtl">

      {/* ── Header: اسم + زري القبول ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* أيقونة الشركة */}
          <div className="w-16 h-16 rounded-2xl bg-primary-700 flex items-center justify-center text-white font-black text-2xl flex-shrink-0 shadow-md">
            {provider.company_name?.[0] || '🏢'}
          </div>

          {/* اسم + شارات */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-slate-900">{provider.company_name}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{provider.contact_name}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* سرعة الاستجابة */}
              <ResponseSpeed minutes={provider.avg_response_minutes} />

              {/* التقييم */}
              {provider.review_count > 0 && (
                <span className="flex items-center gap-1 text-sm bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-700">{rating.toFixed(1)}</span>
                  <span className="text-slate-400 text-xs">({provider.review_count})</span>
                </span>
              )}

              {/* موثّق */}
              {provider.is_approved && (
                <span className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-600 px-2.5 py-1 rounded-full font-bold">
                  <CheckCircle2 size={11} /> موثّق
                </span>
              )}
            </div>
          </div>

          {/* أزرار القبول — تظهر فقط لو showActions */}
          {showActions && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={onAccept} disabled={accepting}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-lg shadow-primary-600/20 whitespace-nowrap">
                {accepting
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><CheckCircle2 size={15} /> نعم، أوافق على المزود</>}
              </button>
              <button onClick={onReject} disabled={rejecting}
                className="flex items-center gap-2 bg-white border-2 border-red-300 text-red-500 hover:bg-red-50 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                {rejecting
                  ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                  : <>👎 لا، أريد مزوداً آخر</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── معلومات التواصل ── */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <Mail size={14} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-600">معلومات التواصل</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {provider.city && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400">المدينة</p>
                <MapPin size={14} className="text-slate-300" />
              </div>
              <p className="font-bold text-slate-800 text-sm">{provider.city}</p>
            </div>
          )}
          {provider.contact_phone && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400">رقم الجوال</p>
                <Phone size={14} className="text-slate-300" />
              </div>
              <a href={`tel:${provider.contact_phone}`} className="font-bold text-slate-800 text-sm hover:text-primary-600" dir="ltr">{provider.contact_phone}</a>
            </div>
          )}
          {provider.contact_email && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-400">البريد الإلكتروني</p>
                <Mail size={14} className="text-slate-300" />
              </div>
              <a href={`mailto:${provider.contact_email}`} className="font-bold text-slate-800 text-sm hover:text-primary-600 break-all" dir="ltr">{provider.contact_email}</a>
            </div>
          )}
        </div>
      </div>

      {/* ── بيانات الشركة (السجل + الخبرة + الطلبات) ── */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* طلبات مكتملة */}
          <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-green-500 font-medium">طلبات مكتملة</p>
              <CheckCircle2 size={16} className="text-green-400" />
            </div>
            <p className="text-xs text-green-500 mt-1">إجمالي الإنجاز</p>
            <p className="text-2xl font-black text-green-700 mt-0.5">{provider.accepted_count || 0} <span className="text-sm font-bold">طلب</span></p>
          </div>

          {/* سنوات الخبرة */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">سنوات الخبرة</p>
              <Clock size={14} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-1">الخبرة العملية</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{details.years_experience || '—'} <span className="text-sm font-medium text-slate-500">سنوات</span></p>
          </div>

          {/* السجل التجاري */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">السجل التجاري</p>
              <Briefcase size={14} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-1">رقم السجل</p>
            <p className="text-lg font-black text-slate-800 mt-0.5 font-mono">{provider.cr_number || details.cr_number || '—'}</p>
          </div>
        </div>
      </div>

      {/* ── التخصصات ── */}
      {provider.categories?.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-bold text-slate-400 mb-2 text-left">التخصصات</p>
          <div className="flex flex-wrap gap-2 justify-end">
            {provider.categories.map((cat: string) => (
              <span key={cat} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── الشهادات ── */}
      {details.certifications && details.certifications.trim() && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-green-500" />
            <p className="text-xs font-bold text-slate-500">الشهادات والمؤهلات</p>
          </div>
          <p className="text-sm text-slate-600 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">{details.certifications}</p>
        </div>
      )}

      {/* ── النبذة ── */}
      {details.bio && details.bio.trim() && (
        <div className="px-5 pb-4">
          <p className="text-xs font-bold text-slate-400 mb-2">نبذة تعريفية</p>
          <p className="text-sm text-slate-600 leading-relaxed">{details.bio}</p>
        </div>
      )}

      {/* ── الأعمال السابقة ── */}
      {portfolio.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-bold text-slate-400 mb-2">الأعمال السابقة ({portfolio.length})</p>
          <div className="space-y-2">
            {portfolio.map(w => (
              <div key={w.id} className="bg-slate-50 rounded-xl px-4 py-3">
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

      {/* ── تقييمات العملاء ── */}
      {reviews.length > 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={16} className={rating >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
              ))}
            </div>
            <p className="text-xs text-slate-400">تقييمات العملاء ({reviews.length})</p>
          </div>
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex gap-0.5 mb-2">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={13} className={r.stars >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-slate-600 leading-relaxed">"{r.comment}"</p>}
                {r.response && (
                  <div className="mt-2 bg-primary-50 rounded-lg px-3 py-2 border-r-2 border-primary-400">
                    <p className="text-xs font-bold text-primary-600">رد المزود:</p>
                    <p className="text-xs text-slate-600 mt-0.5">{r.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// شارة التوثيق (للاستخدام في أماكن أخرى)
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

// عرض النجوم (للاستخدام في أماكن أخرى)
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
