import { useState } from 'react'
import { startTaskPayment } from '../lib/payments'

interface Props {
  amount: number
  taskId: string
  description: string
  className?: string
  label?: string
}

// نسخة آمنة: لا مفتاح سرّي في المتصفح. تبدأ الدفعة عبر الدالة الآمنة على السيرفر
// (paymob-create-payment) التي تتحقق من الملكية والسعر وتنشئ الـ Intention.
// المبلغ والوصف يُحتسبان على السيرفر من المهمة نفسها — لا نثق بأي قيمة من العميل.
export function PaymobButton({ amount, taskId, className, label = 'ادفع الآن' }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handlePay = async () => {
    setLoading(true)
    setErr(null)
    const res = await startTaskPayment(taskId)
    if (!res.ok) {
      setErr(res.error || 'تعذّر بدء الدفع — حاول مرة أخرى')
      setLoading(false)
    }
    // عند النجاح يحدث تحويل للصفحة، فلا حاجة لإيقاف التحميل
  }

  return (
    <div>
      <button onClick={handlePay} disabled={loading}
        className={className || 'w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all active:scale-95'}>
        {loading ? '⏳ جاري التحضير...' : `${label} — ${amount} ريال 💳`}
      </button>
      {err && <p className="text-xs text-red-500 mt-2 text-center">{err}</p>}
    </div>
  )
}
