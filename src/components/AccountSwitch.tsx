import { ArrowLeftRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

// تبديل نفس الحساب بين وضع العميل ووضع المنفّذ.
// العميل: يروح للوحة المنفّذ (لو ما عنده ملف منفّذ تفتح له صفحة التسجيل كمنفّذ).
// المنفّذ: يقدر يفتح لوحة العميل ويطلب طلبات مثل أي عميل.
export function AccountSwitch({ mode, compact = false }: { mode: 'client' | 'worker'; compact?: boolean }) {
  const { navigate } = useApp()
  const { profile } = useAuth()
  if (!profile || profile.role === 'admin') return null
  const isWorkerAccount = profile.role === 'worker'
  const target = mode === 'client' ? 'worker' : 'dashboard'
  const label = mode === 'client' ? (isWorkerAccount ? 'تبديل إلى منفّذ' : 'سجّل كمنفّذ واشتغل معنا') : 'تبديل إلى عميل'

  if (compact) return (
    <button onClick={() => navigate(target)} aria-label={label}
      className="flex items-center gap-1.5 text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-400/20 px-2.5 py-1.5 rounded-xl">
      <ArrowLeftRight size={13} /> {mode === 'client' ? 'منفّذ' : 'عميل'}
    </button>
  )

  return (
    <div className="dark-native bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-300 font-black flex items-center justify-center flex-shrink-0">
          {profile.full_name?.[0] || '؟'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{profile.full_name || 'حسابي'}</p>
          <p className="text-[11px] text-slate-400">الوضع الحالي: {mode === 'client' ? 'عميل' : 'منفّذ'}</p>
        </div>
      </div>
      <button onClick={() => navigate(target)}
        className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 rounded-xl py-2 transition-colors">
        <ArrowLeftRight size={14} /> {label}
      </button>
    </div>
  )
}
