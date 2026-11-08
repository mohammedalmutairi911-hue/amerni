import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Wallet, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { nextPayoutLabel, isValidSaIban, normalizeIban, maskIban } from '../lib/payouts'

// محفظة المنفذ: الرصيد المتاح، المحجوز بالضمان، وطلب سحب يُحوَّل يدوياً كل يوم أحد.

type W = { balance_available: number; balance_held: number; total_earned: number; total_withdrawn: number }
type Req = { id: string; amount: number; status: string; bank_iban: string; admin_note: string | null; requested_at: string; processed_at: string | null }

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'بانتظار تحويل الأحد', cls: 'bg-amber-50 text-amber-700' },
  paid: { label: 'تم التحويل', cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'مرفوض — رجع لرصيدك', cls: 'bg-red-50 text-red-600' },
}

const ERR: Record<string, string> = {
  invalid_iban: 'رقم الآيبان غير صحيح — لازم يبدأ بـ SA وبعده 22 رقم',
  iban_required: 'اكتب رقم الآيبان',
  holder_required: 'اكتب اسم صاحب الحساب كما هو في البنك',
  insufficient_balance: 'الرصيد المتاح ما يكفي لهذا المبلغ',
  invalid_amount: 'اكتب مبلغ صحيح',
}

const sar = (n: number) => `${Number(n || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر`

export function WorkerWallet() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [w, setW] = useState<W | null>(null)
  const [reqs, setReqs] = useState<Req[]>([])
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [iban, setIban] = useState('')
  const [holder, setHolder] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!user) return
    const [{ data: wd }, { data: rq }] = await Promise.all([
      supabase.rpc('wallet_get_mine'),
      supabase.from('withdrawal_requests')
        .select('id, amount, status, bank_iban, bank_holder_name, admin_note, requested_at, processed_at')
        .eq('user_id', user.id).order('requested_at', { ascending: false }).limit(5),
    ])
    if (wd) setW(wd as W)
    setReqs((rq as any[]) || [])
    // آخر آيبان واسم استخدمهم — عشان ما يكتبهم كل مرة
    const last = (rq as any[])?.[0]
    if (last) { setIban(v => v || last.bank_iban || ''); setHolder(v => v || last.bank_holder_name || '') }
  }

  useEffect(() => { load() }, [user?.id])

  const submit = async () => {
    setErr('')
    const amt = Number(amount)
    if (!amt || amt <= 0) { setErr(ERR.invalid_amount); return }
    if (w && amt > Number(w.balance_available)) { setErr(ERR.insufficient_balance); return }
    if (!isValidSaIban(iban)) { setErr(ERR.invalid_iban); return }
    if (!holder.trim()) { setErr(ERR.holder_required); return }
    setSaving(true)
    const { error } = await supabase.rpc('withdrawal_request_create', { p_amount: amt, p_iban: normalizeIban(iban), p_holder_name: holder.trim() })
    setSaving(false)
    if (error) { const k = Object.keys(ERR).find(k => error.message.includes(k)); setErr(k ? ERR[k] : 'صار خطأ، حاول مرة ثانية'); return }
    toast(`تم استلام طلب السحب ✅ بيتحوّل ${nextPayoutLabel()}`, 'success')
    setOpen(false); setAmount('')
    load()
  }

  if (!w) return null
  const available = Number(w.balance_available) || 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-primary-600" />
          <p className="font-bold text-slate-800">محفظتي</p>
        </div>
        <button onClick={() => { setErr(''); setAmount(available ? String(available) : ''); setOpen(true) }} disabled={available <= 0}
          className="bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-4 py-2 rounded-xl text-xs">
          اسحب رصيدي
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xs text-green-700">متاح للسحب</p>
          <p className="text-xl font-black text-green-800">{sar(available)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">محجوز بالضمان</p>
          <p className="text-xl font-black text-slate-700">{sar(w.balance_held)}</p>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">ينضاف لرصيدك بعد ما يأكد العميل اكتمال الطلب</p>
        </div>
      </div>

      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
        <p className="text-xs text-blue-800 leading-relaxed">
          🗓️ <span className="font-bold">التحويل لحسابك البنكي يتم مرة في الأسبوع، كل يوم أحد.</span> الطلبات اللي توصل لين نهاية يوم السبت تتحوّل يوم الأحد، وطلبك الجديد يتحوّل: <span className="font-bold">{nextPayoutLabel()}</span>.
        </p>
      </div>

      {reqs.length > 0 && (
        <div className="mt-3 divide-y divide-slate-100">
          {reqs.map(r => (
            <div key={r.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{sar(r.amount)}</p>
                <p className="text-[11px] text-slate-400" dir="ltr">{maskIban(r.bank_iban)}</p>
                {r.status === 'rejected' && r.admin_note && <p className="text-[11px] text-red-500">السبب: {r.admin_note}</p>}
              </div>
              <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${STATUS[r.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                {STATUS[r.status]?.label || r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[120] bg-slate-900/50 flex items-end sm:items-center justify-center" dir="rtl" onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <p className="font-black text-slate-900">طلب سحب</p>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-500">المتاح: <span className="font-bold text-slate-800">{sar(available)}</span> · يتحوّل {nextPayoutLabel()}</p>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">المبلغ (ريال)</span>
              <input type="number" inputMode="decimal" min="1" value={amount} onChange={e => { setErr(''); setAmount(e.target.value) }}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">رقم الآيبان</span>
              <input dir="ltr" value={iban} onChange={e => { setErr(''); setIban(e.target.value) }} placeholder="SA00 0000 0000 0000 0000 0000" autoComplete="off"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base tracking-wide focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">اسم صاحب الحساب (كما في البنك)</span>
              <input value={holder} onChange={e => { setErr(''); setHolder(e.target.value) }}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </label>
            {err && <p className="text-xs text-red-600 font-bold">{err}</p>}
            <button onClick={submit} disabled={saving}
              className="w-full bg-primary-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />} أرسل طلب السحب
            </button>
            <p className="text-[11px] text-slate-400 text-center">التحويلات تتم يدوياً كل يوم أحد. تأكد إن الحساب باسمك.</p>
          </div>
        </div>, document.body
      )}
    </div>
  )
}
