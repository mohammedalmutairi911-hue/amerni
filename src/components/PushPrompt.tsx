import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { enablePushNotifications, shouldPromptForPermission, recordPromptDismissed, isPushSupported } from '../lib/push'
import { useToast } from './Toast'

// يظهر بعد 30 ثانية من التصفح للمستخدمين المسجّلين
// ولا يظهر مرة ثانية إلا بعد 7 أيام إذا رُفض
const APPEAR_AFTER_MS = 30_000

export function PushPrompt() {
  const { user } = useAuth()
  const { page } = useApp()
  const { toast } = useToast()
  const [show, setShow] = useState(false)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!isPushSupported()) return
    if (!shouldPromptForPermission()) return
    // لا نطلب في صفحات معيّنة (auth flows, etc)
    if (['landing', 'join'].includes(page)) return

    const t = setTimeout(() => setShow(true), APPEAR_AFTER_MS)
    return () => clearTimeout(t)
  }, [user?.id, page])

  const handleEnable = async () => {
    setEnabling(true)
    const res = await enablePushNotifications()
    setEnabling(false)
    setShow(false)
    if (res.success) {
      toast('✅ راح توصلك الإشعارات على جوالك', 'success')
    } else if (res.reason === 'denied') {
      toast('رفضت الإذن — فعّله لاحقاً من إعدادات الإشعارات', 'info')
    }
  }

  const handleDismiss = () => {
    recordPromptDismissed()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-4 left-4 right-4 z-40 max-w-sm mx-auto lg:mx-0 lg:right-auto lg:left-4">
      <div className="bg-white border-2 border-primary-500/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm mb-0.5">فعّل الإشعارات</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              راح يوصلك إشعار فوري على جوالك لما يقبل عامل طلبك أو يوصلك تحديث مهم
            </p>
          </div>
          <button onClick={handleDismiss} aria-label="إغلاق"
            className="text-slate-400 hover:text-slate-600 flex-shrink-0 w-8 h-8 -m-1 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDismiss}
            className="flex-1 border border-slate-200 text-slate-600 font-medium py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors">
            لاحقاً
          </button>
          <button onClick={handleEnable} disabled={enabling}
            className="flex-1 bg-primary-500 text-white font-bold py-2 rounded-xl text-xs hover:bg-primary-600 transition-colors disabled:opacity-50">
            {enabling ? 'جاري التفعيل...' : 'فعّل الإشعارات'}
          </button>
        </div>
      </div>
    </div>
  )
}
