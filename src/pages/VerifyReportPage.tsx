import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, ArrowRight, Building2, Loader2, AlertTriangle, CheckCircle2,
  XCircle, MapPin, Calendar, Briefcase, Users, FileCheck, Globe, RefreshCw,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { supabase } from '../lib/supabase'
import {
  getVerifyReport, runVerification, VERDICT_META, CR_STATUS_LABEL,
  type VerifyReportBundle,
} from '../lib/verify'

function toneClasses(tone: 'green' | 'amber' | 'red') {
  if (tone === 'green') return { ring: 'stroke-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' }
  if (tone === 'amber') return { ring: 'stroke-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' }
  return { ring: 'stroke-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' }
}

const SEV_META: Record<string, { label: string; cls: string }> = {
  critical: { label: 'حرج', cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  high:     { label: 'مرتفع', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  medium:   { label: 'متوسط', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  low:      { label: 'منخفض', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
}

function ScoreGauge({ score, tone }: { score: number; tone: 'green' | 'amber' | 'red' }) {
  const t = toneClasses(tone)
  const r = 52, c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} className={t.ring} strokeWidth="10" fill="none"
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${t.text}`}>{score}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">من ١٠٠</span>
      </div>
    </div>
  )
}

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-bold text-slate-700 dark:text-slate-200">{value}/{max}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}

export function VerifyReportPage() {
  const { navigate } = useApp()
  const requestId = window.location.hash.split('/')[2]
  const [bundle, setBundle] = useState<VerifyReportBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    if (!requestId) { navigate('verify'); return }
    try {
      const b = await getVerifyReport(requestId)
      setBundle(b)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => { load() }, [load])

  // تابع الحالة لحظياً حتى يجهز التقرير (processing → ready)
  useEffect(() => {
    if (!requestId) return
    const ch = supabase
      .channel(`verify_req_${requestId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'verify_requests', filter: `id=eq.${requestId}` },
        () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [requestId, load])

  // شبكة أمان: لو ظل processing، أعِد الاستعلام كل ٣ ثوانٍ (حد أقصى ~30ث)
  useEffect(() => {
    if (bundle?.request.status !== 'processing') return
    let n = 0
    const iv = setInterval(() => { n++; if (n > 10) { clearInterval(iv); return } load() }, 3000)
    return () => clearInterval(iv)
  }, [bundle?.request.status, load])

  const retry = async () => {
    setRetrying(true)
    try { await runVerification(requestId); await load() }
    catch (e) { setError((e as Error).message) }
    finally { setRetrying(false) }
  }

  const back = (
    <button onClick={() => navigate('verify')}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-500 mb-5">
      <ArrowRight size={16} /> تحقّق آخر
    </button>
  )

  if (loading) return <ReportSkeleton />

  if (error && !bundle) return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-14 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <XCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
        <button onClick={() => navigate('verify')} className="text-primary-500 font-bold">رجوع</button>
      </div>
    </div>
  )

  const status = bundle!.request.status
  const company = bundle!.company
  const report = bundle!.report

  // قيد المعالجة
  if (status === 'processing' || status === 'pending' || !report) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-14">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {back}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
            <Loader2 size={40} className="text-primary-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">جاري إعداد التقرير…</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              نتحقق من البيانات الرسمية ونحسب درجة الثقة. لا تغلق الصفحة.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // فشل
  if (status === 'failed') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-14">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {back}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
            <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">تعذّر إكمال التحقق</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">حدث خطأ أثناء المعالجة. جرّب مرة أخرى.</p>
            <button onClick={retry} disabled={retrying}
              className="inline-flex items-center gap-2 bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl">
              {retrying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    )
  }

  const verdict = VERDICT_META[report.verdict]
  const t = toneClasses(verdict.tone)
  const bd = report.score_breakdown

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {back}

        {/* رأس التقرير + القرار */}
        <div className={`rounded-3xl border ${t.border} ${t.bg} p-6 mb-5`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-slate-900/50 flex items-center justify-center">
                <Building2 size={24} className="text-slate-700 dark:text-slate-200" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{company.name}</h1>
              {company.cr_number && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5" dir="ltr">CR {company.cr_number}</p>
              )}
              <div className={`inline-flex items-center gap-1.5 mt-3 text-sm font-bold ${t.text}`}>
                <span className="w-6 h-6 rounded-full bg-white/70 dark:bg-slate-900/50 flex items-center justify-center text-xs">{verdict.icon}</span>
                {verdict.label}
              </div>
            </div>
          </div>
        </div>

        {/* درجة الثقة + التفصيل */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-5">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center">
              <ScoreGauge score={report.trust_score} tone={verdict.tone} />
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2">درجة الثقة</span>
            </div>
            <div className="flex-1 w-full space-y-3">
              <BreakdownBar label="البيانات الرسمية" value={bd.official} max={bd.official_max} />
              <BreakdownBar label="الحضور التشغيلي" value={bd.operational} max={bd.operational_max} />
              <BreakdownBar label="الاستجابة والسمعة" value={bd.reputation} max={bd.reputation_max} />
              {bd.penalty > 0 && (
                <div className="text-xs text-red-500 dark:text-red-400 font-bold">−{bd.penalty} نقطة (أعلام حمراء)</div>
              )}
            </div>
          </div>
        </div>

        {/* الأعلام الحمراء */}
        {report.red_flags.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-5">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-4">
              <AlertTriangle size={18} className="text-red-500" /> أعلام حمراء
            </h3>
            <div className="space-y-2">
              {report.red_flags.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${SEV_META[f.severity]?.cls ?? SEV_META.low.cls}`}>
                    {SEV_META[f.severity]?.label ?? f.severity}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{f.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الطبقة الرسمية */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-4">
            <FileCheck size={18} className="text-primary-500" /> البيانات الرسمية
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field icon={ShieldCheck} label="حالة السجل" value={CR_STATUS_LABEL[company.cr_status]}
              highlight={company.cr_status === 'active' ? 'green' : ['expired', 'cancelled'].includes(company.cr_status) ? 'red' : undefined} />
            <Field icon={Briefcase} label="نوع الكيان" value={company.entity_type || '—'} />
            <Field icon={Briefcase} label="النشاط" value={company.activity || '—'} />
            <Field icon={Calendar} label="تاريخ الإصدار" value={company.issue_date || '—'} ltr />
            <Field icon={MapPin} label="المدينة" value={company.city || '—'} />
            <Field icon={MapPin} label="المنطقة" value={company.region || '—'} />
            <Field icon={Users} label="الملاك" value={`${company.owners?.length ?? 0}`} />
            <Field icon={Users} label="المفوضون" value={`${company.managers?.length ?? 0}`} />
            <Field icon={Building2} label="الفروع" value={`${company.branches?.length ?? 0}`} />
            <Field icon={FileCheck} label="التراخيص" value={`${company.licenses?.length ?? 0}`} />
          </div>
        </div>

        {/* الطبقة التشغيلية */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-4">
            <Globe size={18} className="text-primary-500" /> الحضور التشغيلي
          </h3>
          {company.website || (company.socials && Object.keys(company.socials).length > 0)
            || (Array.isArray(report.operational?.evidence) && report.operational.evidence.length > 0) ? (
            <div className="space-y-3">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" dir="ltr"
                  className="block text-sm text-primary-500 underline break-all">{company.website}</a>
              )}
              {Array.isArray(report.operational?.evidence) && report.operational.evidence.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={15} className={e.verified ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'} />
                  <span className="font-medium">{e.label}</span>
                  {e.value && <span className="text-slate-400 dark:text-slate-500 truncate" dir="ltr">— {e.value}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
              لم يُوثّق حضور تشغيلي بعد لهذا المورد. اطلب من المورد إثبات موقعه وأعماله السابقة.
            </div>
          )}
        </div>

        {/* التوصيات */}
        {report.recommendations.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-5">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-4">
              <CheckCircle2 size={18} className="text-primary-500" /> التوصيات
            </h3>
            <ul className="space-y-2">
              {report.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-primary-400 mt-1">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-6">
          مصدر البيانات الرسمية: {report.generated_by === 'wathq' ? 'واثق — وزارة التجارة' : report.generated_by === 'manual' ? 'تحقق يدوي (أمرني)' : 'بيانات تجريبية (Mock)'}
          {' · '}{new Date(report.generated_at).toLocaleDateString('ar-SA')}
        </p>
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-1">
          هذا التقرير أداة مساعدة لاتخاذ القرار ولا يُغني عن العناية الواجبة من طرفك.
        </p>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, value, ltr, highlight }: {
  icon: any; label: string; value: string; ltr?: boolean; highlight?: 'green' | 'red'
}) {
  const hl = highlight === 'green' ? 'text-green-600 dark:text-green-400'
    : highlight === 'red' ? 'text-red-600 dark:text-red-400'
    : 'text-slate-900 dark:text-white'
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-slate-400 dark:text-slate-500">{label}</div>
        <div className={`text-sm font-bold truncate ${hl}`} dir={ltr ? 'ltr' : undefined}>{value}</div>
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-5" />
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl mb-5" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl mb-5" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    </div>
  )
}
