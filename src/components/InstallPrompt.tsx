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
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-[#111] border border-amber-500/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black text-xl font-black">أ</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">أضف أمرني لشاشتك</p>
              {isIOS ? (
                <p className="text-zinc-400 text-xs mt-0.5">
                  اضغط <span className="text-amber-400">□↑</span> ثم "أضف إلى الشاشة الرئيسية"
                </p>
              ) : (
                <p className="text-zinc-400 text-xs mt-0.5">وصّل أسرع بدون متصفح</p>
              )}
            </div>
          </div>
          <button onClick={handleDismiss} className="text-zinc-600 hover:text-zinc-400 flex-shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button onClick={handleInstall}
            className="w-full mt-3 bg-amber-500 text-black font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
            <Download size={15} /> تثبيت التطبيق
          </button>
        )}
      </div>
    </div>
  )
}
