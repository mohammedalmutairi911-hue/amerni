import { useEffect, useState } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Profile } from '../../types'
import { payoutDateFor, sundayLabel, upcomingTransferSunday } from '../../lib/payouts'

// طلبات سحب المنفذين — تحويل يدوي من حساب المؤسسة كل يوم أحد، ثم "تم التحويل".

type Req = { id: string; user_id: string; amount: number; status: string; bank_iban: string; bank_holder_name: string | null; admin_note: string | null; requested_at: string; processed_at: string | null }

const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
const sar = (n: number) => `${Number(n || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر`

export function AdminPayouts({ users, onCountChange }: { users: Profile[]; onCountChange?: (n: number) => void }) {
  const [pending, setPending] = useState<Req[]>([])
  const [done, setDone] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    const cols = 'id, user_id, amount, status, bank_iban, bank_holder_name, admin_note, requested_at, processed_at'
    const [p, d] = await Promise.all([
      supabase.from('withdrawal_requests').select(cols).eq('status', 'pending').order('requested_at'),
      supabase.from('withdrawal_requests').select(cols).neq('status', 'pending').order('processed_at', { ascending: false }).limit(20),
    ])
    setPending((p.data as Req[]) || []); setDone((d.data as Req[]) || [])
    onCountChange?.((p.data || []).length)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const nameOf = (id: string) => users.find(u => u.id === id)?.full_name || 'منفذ'
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  const approve = async (r: Req) => {
    if (!confirm(`تأكيد إنك حوّلت ${sar(r.amount)} إلى ${r.bank_holder_name || nameOf(r.user_id)}؟\nبيوصله إشعار إن المبلغ تحوّل.`)) return
    setBusy(r.id)
    const { error } = await supabase.rpc('admin_withdrawal_approve', { p_id: r.id })
    setBusy(null)
    if (error) { alert('ما تم: ' + error.message); return }
    load()
  }
  const reject = async (r: Req) => {
    const reason = prompt('سبب الرفض (يوصل للمنفذ، والمبلغ يرجع لرصيده):', 'الآيبان أو الاسم غير مطابق')
    if (reason === null) return
    setBusy(r.id)
    const { error } = await supabase.rpc('admin_withdrawal_reject', { p_id: r.id, p_reason: reason })
    setBusy(null)
    if (error) { alert('ما تم: ' + error.message); return }
    load()
  }

  // الطلبات المستحقة في أقرب أحد (وصلت لين نهاية الخميس) والباقي للأحد اللي بعده
  const thisSunday = upcomingTransferSunday().getTime()
  const dueNow = pending.filter(r => payoutDateFor(r.requested_at).getTime() <= thisSunday)
  const later = pending.filter(r => payoutDateFor(r.requested_at).getTime() > thisSunday)
  const total = dueNow.reduce((s, r) => s + Number(r.amount || 0), 0)

  const CopyBtn = ({ k, text }: { k: string; text: string }) => (
    <button onClick={() => copy(k, text)} aria-label="نسخ" className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
      {copied === k ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-slate-500" />}
    </button>
  )

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div>
        <h2 className="text-2xl font-black text-slate-900">تحويلات المنفذين</h2>
        <p className="text-slate-400 text-sm mt-0.5">كل يوم أحد حوّل طلبات "مستحقة هذا الأحد" (اللي وصلت لين نهاية الخميس) من حساب المؤسسة، ثم اضغط "تم التحويل" لكل طلب</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-xs text-slate-400">مستحق {sundayLabel(new Date(thisSunday))}</p>
          <p className="text-2xl font-black text-slate-900">{sar(total)}</p>
          <p className="text-xs text-slate-400">{dueNow.length} طلب{later.length ? ` · ${later.length} للأحد اللي بعده` : ''}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-700">آخر موعد للطلبات</p>
          <p className="text-lg font-black text-blue-900">نهاية الخميس</p>
          <p className="text-[11px] text-blue-700">بعدها تروح للأحد اللي بعده</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-700">طلبات السحب المعلّقة ({pending.length})</p>
        {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
          : pending.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-400">ما فيه طلبات سحب</p>
          : <div className="divide-y divide-slate-100">
            {[...dueNow, ...later].map(r => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{nameOf(r.user_id)}</p>
                    <p className="text-[11px] text-slate-400">طلب {fmt(r.requested_at)}</p>
                    {(() => { const due = payoutDateFor(r.requested_at).getTime() <= thisSunday; return (
                      <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${due ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {due ? 'مستحق هذا الأحد' : `يتحوّل ${sundayLabel(payoutDateFor(r.requested_at))}`}
                      </span>) })()}
                  </div>
                  <p className="text-lg font-black text-slate-900 flex-shrink-0">{sar(r.amount)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-[11px] text-slate-400">الآيبان</p><p className="text-sm font-bold text-slate-800 break-all" dir="ltr">{r.bank_iban}</p></div>
                    <CopyBtn k={r.id + 'i'} text={r.bank_iban} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-[11px] text-slate-400">اسم صاحب الحساب</p><p className="text-sm font-bold text-slate-800">{r.bank_holder_name || '—'}</p></div>
                    {r.bank_holder_name && <CopyBtn k={r.id + 'n'} text={r.bank_holder_name} />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(r)} disabled={busy === r.id}
                    className="flex-1 bg-green-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1">
                    {busy === r.id && <Loader2 size={12} className="animate-spin" />} تم التحويل
                  </button>
                  <button onClick={() => reject(r)} disabled={busy === r.id}
                    className="border border-red-200 text-red-500 font-bold px-4 py-2 rounded-xl text-xs">رفض</button>
                </div>
              </div>
            ))}
          </div>}
      </div>

      {done.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <p className="px-4 py-3 border-b border-slate-100 text-sm font-bold text-slate-700">آخر التحويلات</p>
          <div className="divide-y divide-slate-100">
            {done.map(r => (
              <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{nameOf(r.user_id)} · {sar(r.amount)}</p>
                  <p className="text-[11px] text-slate-400">{fmt(r.processed_at)}{r.admin_note ? ` · ${r.admin_note}` : ''}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${r.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {r.status === 'paid' ? 'تم التحويل' : 'مرفوض'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
