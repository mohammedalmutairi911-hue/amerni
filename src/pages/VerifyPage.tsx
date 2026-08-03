import { useState, useEffect } from 'react'
import { ShieldCheck, Search, Building2, Hash, Loader2, AlertCircle, History, ChevronLeft } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import {
  createVerifyRequest, runVerification, listMyVerifyRequests,
  VERDICT_META, type VerifyListItem,
} from '../lib/verify'

type Mode = 'cr' | 'name'

export function VerifyPage() {
  const { navigate, openAuth } = useApp()
  const { user } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('cr')
  const [cr, setCr] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<VerifyListItem[] | null>(null)

  useEffect(() => {
    if (!user) { setHistory([]); return }
    listMyVerifyRequests().then(setHistory).catch(() => setHistory([]))
  }, [user?.id])

  const validate = (): string | null => {
    if (mode === 'cr') {
      const clean = cr.replace(/\D/g, '')
      if (clean.length !== 10) return 'رقم السجل التجاري يجب أن يكون ١٠ أرقام'
    } else {
      if (name.trim().length < 2) return 'أدخل اسم الشركة (حرفان على الأقل)'
    }
    return null
  }

  const submit = async () => {
    setError(null)
    if (!user) { openAuth('login', 'individuals'); return }
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    try {
      const input = mode === 'cr' ? { cr: cr.replace(/\D/g, '') } : { name: name.trim() }
      const { request_id } = await createVerifyRequest(input)
      // شغّل خط التحقق (لا نُفشل الانتقال لو تأخّر — صفحة التقرير تتابع الحالة)
      runVerification(request_id).catch(() => {})
      navigate(`verify-report/${request_id}`)
    } catch (e) {
      setError((e as Error).message)
      toast('تعذّر بدء التحقق', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 text-primary-500 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">
            تأكد من المورد قبل التعامل
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            أدخل رقم السجل التجاري أو اسم الشركة، ونعطيك تقريراً احترافياً: البيانات الرسمية،
            الحضور التشغيلي، درجة ثقة، وأعلام حمراء إن وُجدت.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 shadow-sm">
          {/* Mode toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
            {([['cr', 'رقم السجل', Hash], ['name', 'اسم الشركة', Building2]] as const).map(([m, label, Icon]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  mode === m
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {/* Input */}
          {mode === 'cr' ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">رقم السجل التجاري</label>
              <input
                inputMode="numeric"
                dir="ltr"
                value={cr}
                onChange={e => { setCr(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="1010XXXXXX"
                className="w-full text-center tracking-widest text-lg font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/40 outline-none transition"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">اسم الشركة</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="مثال: مؤسسة الإتقان للنظافة"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/40 outline-none transition"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 mt-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full mt-5 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            {submitting ? <><Loader2 size={18} className="animate-spin" /> جاري البدء…</> : <><Search size={18} /> تحقّق الآن</>}
          </button>

          {!user && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
              تحتاج تسجيل دخول لحفظ تقاريرك والرجوع لها لاحقاً
            </p>
          )}
        </div>

        {/* History */}
        {history && history.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-bold mb-3">
              <History size={16} /> تقاريرك السابقة
            </div>
            <div className="space-y-2">
              {history.map(h => {
                const meta = h.verdict ? VERDICT_META[h.verdict] : null
                return (
                  <button
                    key={h.request_id}
                    onClick={() => navigate(`verify-report/${h.request_id}`)}
                    className="w-full flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-right hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{h.company_name}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono" dir="ltr">
                        {h.cr_number || '—'}
                      </div>
                    </div>
                    {h.trust_score != null && meta && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        meta.tone === 'green' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : meta.tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {h.trust_score}/100
                      </span>
                    )}
                    <ChevronLeft size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
