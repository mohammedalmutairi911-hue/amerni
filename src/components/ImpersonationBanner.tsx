import { getImpersonation, stopImpersonation } from '../lib/adminActions'

// يظهر فقط أثناء «الدخول كمستخدم» ليتيح للمدير العودة لحسابه بضغطة واحدة.
export function ImpersonationBanner() {
  const imp = getImpersonation()
  if (!imp) return null
  return (
    <div dir="rtl"
      className="fixed top-0 inset-x-0 z-[300] bg-amber-500 text-slate-900 text-sm font-bold px-4 py-2 flex items-center justify-center gap-3 shadow-md"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      <span>👁️ تتصفّح كمستخدم {imp.email ? `(${imp.email})` : ''} — وضع الدعم الفني</span>
      <button onClick={() => stopImpersonation()}
        className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs hover:bg-slate-800 transition-colors">
        العودة لحساب المدير
      </button>
    </div>
  )
}
