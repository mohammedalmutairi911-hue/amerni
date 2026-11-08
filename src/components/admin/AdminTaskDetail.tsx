import { useEffect, useState } from 'react'
import { X, Loader2, User, Wrench, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Profile, Task, WorkerProfile } from '../../types'

// تفاصيل طلب كاملة للأدمن: صاحب الطلب، العامل اللي قبله، الحالة والأسعار والدفع،
// ونص المحادثة كامل مع اسم ودور كل مرسل. القراءة فقط — لا يرسل شيء باسم الأدمن.

interface Msg {
  id: string; sender_id: string | null; content: string
  is_system_message: boolean | null; is_filtered: boolean | null; created_at: string
}

const STATUS_AR: Record<string, string> = {
  open: 'مفتوح — بانتظار عامل', waiting_for_worker: 'بانتظار عامل', in_progress: 'جاري التنفيذ',
  completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع',
}
const PAY_AR: Record<string, string> = { unpaid: 'غير مدفوع', paid: 'مدفوع', held: 'محجوز (ضمان)', released: 'محوّل للعامل', refunded: 'مسترد' }

const fmt = (iso?: string | null) => iso
  ? new Date(iso).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  : '—'

export function AdminTaskDetail({ task, users, workers, onClose, onStatusChange }: {
  task: Task; users: Profile[]; workers: WorkerProfile[]; onClose: () => void
  onStatusChange?: (id: string, status: string) => void
}) {
  const t = task as any
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)

  const clientId: string | undefined = t.client_id || t.user_id
  const client = users.find(u => u.id === clientId) as any
  const workerProfile = workers.find(w => w.user_id === t.worker_id) as any
  const workerUser = users.find(u => u.id === t.worker_id) as any

  const load = async () => {
    // استعلام على task_id المفهرس فقط
    const { data } = await supabase.from('task_messages')
      .select('id, sender_id, content, is_system_message, is_filtered, created_at')
      .eq('task_id', task.id).order('created_at')
    setMsgs((data as Msg[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`admin-task-${task.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${task.id}` }, load)
      .subscribe()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { supabase.removeChannel(ch); document.body.style.overflow = prev }
  }, [task.id])

  const senderInfo = (m: Msg) => {
    if (m.is_system_message) return { name: 'النظام', role: '', tone: 'system' as const }
    if (m.sender_id && m.sender_id === clientId) return { name: client?.full_name || 'العميل', role: 'العميل', tone: 'client' as const }
    if (m.sender_id && m.sender_id === t.worker_id) return { name: workerProfile?.full_name || workerUser?.full_name || 'العامل', role: 'العامل', tone: 'worker' as const }
    const u = users.find(x => x.id === m.sender_id) as any
    return { name: u?.full_name || 'مستخدم', role: u?.role === 'admin' ? 'الإدارة' : 'آخر', tone: 'other' as const }
  }

  const price = t.final_price ?? t.price_final ?? null
  const rows: [string, any][] = [
    ['الحالة', STATUS_AR[t.status] || t.status],
    ['الدفع', PAY_AR[t.payment_status] || t.payment_status || '—'],
    ['المدينة', t.city || t.location || '—'],
    ['التصنيف', t.category || '—'],
    ['سعر العميل المقترح', (t.client_price ?? t.price_suggested) != null ? `${t.client_price ?? t.price_suggested} ريال` : '—'],
    ['عرض العامل', t.worker_price_offer != null ? `${t.worker_price_offer} ريال` : '—'],
    ['السعر النهائي', price != null ? `${price} ريال` : '—'],
    ['الموعد', t.deadline || '—'],
    ['انطلب في', fmt(t.created_at)],
    ['انقبل في', t.worker_id ? fmt(t.accepted_at) : 'لم يُقبل بعد'],
    ['اكتمل في', t.completed_at ? fmt(t.completed_at) : '—'],
    ['آخر تحديث', fmt(t.updated_at)],
    ...(t.status === 'in_progress' && t.accepted_at && !msgs.some(m => m.sender_id === t.worker_id && !m.is_system_message)
      ? [['مهلة التواصل', `ينسحب ${fmt(new Date(new Date(t.accepted_at).getTime() + 3600000).toISOString())} إذا ما تواصل`] as [string, any]]
      : []),
  ]

  // بدون جوال أو إيميل — التواصل والاتفاق يبقى داخل المنصة فقط
  const Person = ({ icon: Icon, label, name, extra }: any) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Icon size={12} /> {label}</div>
      {name ? <>
        <p className="font-bold text-slate-800 text-sm truncate">{name}</p>
        {extra && <p className="text-xs text-slate-400 mt-0.5">{extra}</p>}
      </> : <p className="text-sm text-slate-400">لم يقبله أحد بعد</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-end sm:items-center justify-center" onClick={onClose} dir="rtl">
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 mb-0.5">تفاصيل الطلب</p>
            <h3 className="font-black text-slate-900 leading-snug">{t.title}</h3>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {t.description && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{t.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Person icon={User} label="صاحب الطلب (العميل)" name={client?.full_name || 'عميل'} />
            <Person icon={Wrench} label="العامل اللي قبله" name={t.worker_id ? (workerProfile?.full_name || workerUser?.full_name || 'عامل') : null}
              extra={workerProfile ? [workerProfile.city, workerProfile.is_approved ? 'معتمد' : 'غير معتمد', workerProfile.missed_tasks ? `انسحب منه ${workerProfile.missed_tasks} طلب لعدم التواصل` : ''].filter(Boolean).join(' · ') : undefined} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-white border border-slate-200 rounded-xl p-4">
            {rows.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <p className="text-[11px] text-slate-400">{k}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{v}</p>
              </div>
            ))}
          </div>

          {onStatusChange && (t.status === 'in_progress' || t.status === 'disputed') && (
            <div className="flex gap-2">
              {t.status === 'in_progress' && (
                <button onClick={() => { if (confirm('تحويل الطلب لنزاع؟ استخدمه فقط إذا فيه خلاف بين العميل والعامل.')) onStatusChange(t.id, 'disputed') }}
                  className="flex-1 border border-red-200 text-red-500 font-bold py-2 rounded-xl text-xs">فتح نزاع على الطلب</button>
              )}
              {t.status === 'disputed' && (
                <button onClick={() => { if (confirm('إنهاء النزاع واعتبار الطلب مكتمل؟')) onStatusChange(t.id, 'completed') }}
                  className="flex-1 bg-primary-700 text-white font-bold py-2 rounded-xl text-xs">حل النزاع (اعتبار الطلب مكتمل)</button>
              )}
            </div>
          )}

          {(t.completion_note || t.completion_proof) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 mb-1">إثبات الإنجاز</p>
              {t.completion_note && <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.completion_note}</p>}
              {t.completion_proof && <a href={t.completion_proof} target="_blank" rel="noreferrer" className="text-xs text-primary-600 font-bold underline">فتح المرفق</a>}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare size={14} className="text-slate-400" />
              <p className="text-sm font-bold text-slate-700">المحادثة ({msgs.length} {msgs.length === 1 ? 'رسالة' : 'رسائل'})</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
              {loading ? <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
                : msgs.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">ما فيه رسائل بين الطرفين</p>
                : msgs.map(m => {
                  const s = senderInfo(m)
                  if (s.tone === 'system') return (
                    <p key={m.id} className="text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 mx-auto w-fit max-w-full">{m.content} · {fmt(m.created_at)}</p>
                  )
                  const bubble = s.tone === 'client' ? 'bg-white border-slate-200' : s.tone === 'worker' ? 'bg-primary-50 border-primary-100' : 'bg-amber-50 border-amber-200'
                  return (
                    <div key={m.id} className={`border rounded-xl px-3 py-2 ${bubble}`}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-bold text-slate-700 truncate">{s.name}{s.role && <span className="font-normal text-slate-400"> · {s.role}</span>}</p>
                        <p className="text-[11px] text-slate-400 flex-shrink-0">{fmt(m.created_at)}</p>
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{m.content}</p>
                      {m.is_filtered && <p className="text-[11px] text-red-500 mt-0.5">محجوبة عن الطرف الآخر (فلتر التواصل الخارجي)</p>}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
