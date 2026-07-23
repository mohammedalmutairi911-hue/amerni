import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-dismissed')) return

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after 3 seconds
      setTimeout(() => setShow(true), 3000)
      return
    }

    // Android/Desktop - wait for beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') setShow(false)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white border border-primary-500/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-900 text-lg font-black">أ</span>
            </div>
            <p className="font-bold text-slate-900 text-sm">أضف أمرني لشاشتك الرئيسية</p>
          </div>
          <button onClick={handleDismiss} aria-label="إغلاق" className="text-slate-400 hover:text-slate-500 flex-shrink-0 w-9 h-9 -m-2 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
              <span className="text-primary-400 text-lg">١</span>
              <p className="text-slate-600 text-xs">اضغط على أيقونة المشاركة <span className="text-primary-400 font-bold">□↑</span> في الأسفل</p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
              <span className="text-primary-400 text-lg">٢</span>
              <p className="text-slate-600 text-xs">اختر <span className="text-primary-400 font-bold">"إضافة إلى الشاشة الرئيسية"</span></p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
              <span className="text-primary-400 text-lg">٣</span>
              <p className="text-slate-600 text-xs">اضغط <span className="text-primary-400 font-bold">"إضافة"</span> وخلاص ✓</p>
            </div>
          </div>
        ) : deferredPrompt ? (
          <button onClick={handleInstall}
            className="w-full bg-primary-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary-400 transition-colors flex items-center justify-center gap-2">
            <Download size={15} /> تثبيت التطبيق
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
              <span className="text-primary-400 text-lg">١</span>
              <p className="text-slate-600 text-xs">اضغط على <span className="text-primary-400 font-bold">⋮</span> في المتصفح</p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
              <span className="text-primary-400 text-lg">٢</span>
              <p className="text-slate-600 text-xs">اختر <span className="text-primary-400 font-bold">"إضافة إلى الشاشة الرئيسية"</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
