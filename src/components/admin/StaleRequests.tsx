// طلبات مفتوحة تنتظر رد: عمر الطلب، المنفّذون المناسبون، وأزرار تواصل سريعة.
// قراءة فقط من البيانات المحمّلة في لوحة الأدمن — لا تكتب في قاعدة البيانات.

import { useMemo, useState } from 'react'
import { Clock, MapPin, MessageCircle, AlertTriangle, Users as UsersIcon, ChevronDown } from 'lucide-react'

const SLA_HOURS = 2

function ageLabel(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} دقيقة`
  if (h < 48) return `${Math.round(h)} ساعة`
  return `${Math.round(h / 24)} يوم`
}
const hoursOld = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5
const wa = (phone: string | null | undefined, text: string) => {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return null
  const intl = d.startsWith('966') ? d : d.startsWith('0') ? '966' + d.slice(1) : d
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`
}
const norm = (s?: string | null) => (s || '').trim()

interface Props { tasks: any[]; workers: any[]; users: any[] }

export function StaleRequests({ tasks, workers, users }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => {
    const byId = new Map<string, any>(users.map(u => [u.id, u]))
    const approved = workers.filter(w => w.is_approved)
    return tasks
      .filter(t => t.status === 'open' && !t.worker_id)
      .map(t => {
        const owner = byId.get(t.client_id || t.user_id)
        const matches = approved.filter(w => {
          const skills: string[] = w.skills || []
          return skills.includes(t.category) || skills.includes('أخرى')
        }).map(w => ({ w, p: byId.get(w.user_id), sameCity: norm(w.city) === norm(t.city) }))
        matches.sort((a, b) => Number(b.sameCity) - Number(a.sameCity))
        return { t, owner, matches }
      })
      .sort((a, b) => hoursOld(b.t.created_at) - hoursOld(a.t.created_at))
  }, [tasks, workers, users])

  if (rows.length === 0) return null
  const late = rows.filter(r => hoursOld(r.t.created_at) >= SLA_HOURS).length

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden" dir="rtl">
      <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3">
        <AlertTriangle size={20} className="text-amber-600" />
        <div className="flex-1">
          <h3 className="font-black text-slate-900">طلبات تنتظر رد ({rows.length})</h3>
          <p className="text-xs text-slate-500">{late} منها مر عليها أكثر من {SLA_HOURS} ساعة بدون قبول</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.slice(0, 30).map(({ t, owner, matches }) => {
          const isLate = hoursOld(t.created_at) >= SLA_HOURS
          const expanded = open === t.id
          const clientMsg = `هلا ${owner?.full_name || ''}، معك فريق أمرني. استلمنا طلبك "${t.title}" ونشتغل على إيجاد منفّذ مناسب لك، وبنوافيك أول ما يتوفر. تبي تضيف أي تفاصيل؟`
          const clientLink = wa(owner?.phone, clientMsg)
          return (
            <div key={t.id} className="p-4">
              <button className="w-full text-right" onClick={() => setOpen(expanded ? null : t.id)}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className={`flex items-center gap-1 font-bold ${isLate ? 'text-red-600' : 'text-slate-500'}`}><Clock size={11} /> {ageLabel(t.created_at)}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {t.city}</span>
                      <span className="bg-slate-100 rounded-full px-2 py-0.5">{t.category}</span>
                      {t.price_suggested ? <span className="text-primary-600 font-bold">{t.price_suggested} ريال</span> : <span className="text-slate-400">بدون سعر مقترح</span>}
                      <span className={`flex items-center gap-1 ${matches.length === 0 ? 'text-red-600 font-bold' : ''}`}><UsersIcon size={11} /> {matches.length} منفّذ مناسب</span>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {expanded && (
                <div className="mt-3 space-y-3">
                  {t.description && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{t.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {clientLink
                      ? <a href={clientLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg"><MessageCircle size={13} /> طمّن العميل ({owner?.full_name || 'العميل'})</a>
                      : <span className="text-xs text-slate-400">ما فيه رقم جوال للعميل</span>}
                  </div>
                  {matches.length === 0 ? (
                    <p className="text-xs text-red-600 font-bold">ما فيه منفّذ معتمد يناسب هذا الطلب، تحتاج تجنّد منفّذ لهذا النوع أو المدينة.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500">منفّذون مناسبون (نفس المدينة أولاً):</p>
                      {matches.map(({ w, p, sameCity }) => {
                        const text = `هلا ${p?.full_name || ''}، عندنا طلب جديد في أمرني: "${t.title}" في ${t.city}${t.price_suggested ? ` بسعر مقترح ${t.price_suggested} ريال` : ''}. تقدر تقبله من تطبيق أمرني: https://www.amerniksa.com`
                        const link = wa(p?.phone, text)
                        return (
                          <div key={w.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{p?.full_name || w.user_id}</p>
                              <p className="text-[11px] text-slate-500">{norm(w.city)}{sameCity ? ' · نفس مدينة الطلب' : ''}</p>
                            </div>
                            {link
                              ? <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"><MessageCircle size={12} /> راسله</a>
                              : <span className="text-[11px] text-slate-400">لا يوجد رقم</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
