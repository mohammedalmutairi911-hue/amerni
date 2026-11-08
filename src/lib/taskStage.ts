// مراحل الطلب الفعلية — تُشتق من بيانات الطلب نفسها (بدون تغيير status في القاعدة).
// status = 'in_progress' في القاعدة يعني فقط "منفذ قبله"، مو إنه بدأ التنفيذ،
// فهنا نوضح وين وصل فعلياً: تواصل؟ عرض سعر؟ اتفاق؟ دفع؟ إثبات؟ اكتمال؟

export type StageMsg = { sender_id: string | null; content: string; is_system_message: boolean | null; created_at: string }

export type Stage = { key: string; label: string; done: boolean; at?: string | null }

const paid = (t: any) => ['held', 'paid', 'released'].includes(t.payment_status)

/** وصف المرحلة الحالية بسطر واحد + لون — للقوائم */
export function currentStage(t: any, msgs?: StageMsg[]): { label: string; color: string } {
  if (t.status === 'cancelled') return { label: 'ملغي', color: 'text-slate-500 bg-slate-100' }
  if (t.status === 'disputed') return { label: 'نزاع', color: 'text-red-600 bg-red-50' }
  if (t.status === 'completed') return { label: 'مكتمل', color: 'text-green-700 bg-green-50' }
  if (t.status === 'pending_confirmation') return { label: 'سلّم الإنجاز — بانتظار تأكيد العميل', color: 'text-teal-700 bg-teal-50' }
  if (!t.worker_id) return { label: 'بانتظار منفذ', color: 'text-primary-600 bg-primary-50' }
  if (paid(t)) return { label: 'مدفوع — قيد التنفيذ', color: 'text-blue-700 bg-blue-50' }
  if (t.negotiation_status === 'accepted') return { label: 'اتفقوا على السعر — بانتظار الدفع', color: 'text-indigo-700 bg-indigo-50' }
  if (t.negotiation_status === 'pending') return { label: 'عرض سعر بانتظار العميل', color: 'text-amber-700 bg-amber-50' }
  if (msgs && !msgs.some(m => m.sender_id === t.worker_id && !m.is_system_message))
    return { label: 'تم القبول — ما بدأ التواصل', color: 'text-orange-700 bg-orange-50' }
  return { label: 'تم القبول — بانتظار عرض السعر', color: 'text-amber-700 bg-amber-50' }
}

/** كل المراحل بالترتيب مع وقت كل مرحلة إن توفر — لنافذة التفاصيل */
export function stageTimeline(t: any, msgs: StageMsg[]): Stage[] {
  const firstWorkerMsg = msgs.find(m => m.sender_id === t.worker_id && !m.is_system_message)
  const sys = (prefix: string) => msgs.filter(m => m.is_system_message && m.content.startsWith(prefix)).pop()?.created_at
  const offered = t.worker_price_offer != null || !!t.negotiation_status
  const agreed = t.negotiation_status === 'accepted'
  const delivered = ['pending_confirmation', 'completed'].includes(t.status) || !!t.completion_proof
  return [
    { key: 'posted', label: 'نُشر الطلب', done: true, at: t.created_at },
    { key: 'accepted', label: 'قبله منفذ', done: !!t.worker_id, at: t.accepted_at },
    { key: 'contact', label: 'بدأ التواصل بين الطرفين', done: !!firstWorkerMsg, at: firstWorkerMsg?.created_at },
    { key: 'offer', label: offered && t.worker_price_offer != null ? `عرض سعر من المنفذ (${t.worker_price_offer} ريال)` : 'عرض سعر من المنفذ', done: offered, at: sys('💰 اقترحت') },
    { key: 'agreed', label: agreed ? `الاتفاق على السعر (${t.price_final ?? t.worker_price_offer} ريال)` : 'الاتفاق على السعر', done: agreed, at: sys('✅ وافقت على السعر') },
    { key: 'paid', label: 'الدفع (محجوز بالضمان)', done: paid(t) },
    { key: 'delivered', label: 'تسليم إثبات الإنجاز', done: delivered, at: sys('📦 رفعت إثبات') },
    { key: 'completed', label: 'تأكيد العميل واكتمال الطلب', done: t.status === 'completed', at: t.completed_at },
  ]
}
