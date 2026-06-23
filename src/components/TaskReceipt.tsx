import { CheckCircle, Download, Star, Share2 } from 'lucide-react'
import { Task } from '../types'

interface Props {
  task: Task
  workerName: string
  onRate: () => void
  onClose: () => void
}

export function TaskReceipt({ task, workerName, onRate, onClose }: Props) {
  const price = task.price_final || task.price_suggested || 0
  const commission = (price * 0.02).toFixed(2)
  const date = new Date(task.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-green-500 px-6 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={36} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white mb-1">تم إتمام الخدمة!</h2>
        <p className="text-green-100 text-sm">شكراً لاستخدامك آمرني</p>
      </div>

      {/* Receipt body */}
      <div className="p-6">
        <div className="text-center mb-5">
          <p className="text-xs text-slate-400 mb-1">رقم الطلب</p>
          <p className="font-mono text-xs text-slate-600">#{task.id.slice(0,8).toUpperCase()}</p>
        </div>

        <div className="space-y-3 mb-5">
          {[
            ['الخدمة', task.title],
            ['مقدم الخدمة', workerName || '—'],
            ['التاريخ', date],
            ['التصنيف', task.category || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-900 font-medium text-sm">{v}</span>
              <span className="text-slate-400 text-sm">{k}</span>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        {price > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-900 font-bold">{price} ريال</span>
              <span className="text-slate-500">قيمة الخدمة</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-orange-500 font-bold">{commission} ريال</span>
              <span className="text-slate-500">عمولة المنصة (2%) — على العامل</span>
            </div>
            <div className="flex justify-between font-black text-base pt-2 border-t border-slate-200">
              <span className="text-green-500">{price} ريال</span>
              <span className="text-slate-700">المبلغ المدفوع</span>
            </div>
          </div>
        )}

        {/* Rate CTA */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="font-bold text-amber-700 text-sm mb-1 text-center">قيّم تجربتك</p>
          <p className="text-amber-600 text-xs text-center mb-3">تقييمك يساعد مقدمي الخدمة ويفيد المستخدمين الآخرين</p>
          <div className="flex justify-center gap-2 mb-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={28} className="text-amber-300 hover:text-amber-400 cursor-pointer transition-colors" />
            ))}
          </div>
          <button onClick={onRate}
            className="w-full bg-amber-400 text-slate-900 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-500 transition-colors">
            أضف تقييمك الآن
          </button>
        </div>

        <button onClick={onClose}
          className="w-full border border-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
          رجوع للرئيسية
        </button>
      </div>
    </div>
  )
}
