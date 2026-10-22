import { App as CapApp } from '@capacitor/app'
import { isNativeApp, SITE_URL } from './platform'

declare const __BUILD_ID__: string

// سلوك خاص بتطبيق الجوال فقط (الموقع لا يتأثر)
export function initNativeApp() {
  if (!isNativeApp()) return

  // زر الرجوع في أندرويد: يرجع للصفحة السابقة، وعند الجذر يخرج من التطبيق
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else CapApp.exitApp()
  })

  // فتح روابط الموقع (مشاركة منفّذ، دعوة إحالة…) داخل التطبيق بنفس المعاملات
  CapApp.addListener('appUrlOpen', ({ url }) => {
    try {
      const u = new URL(url)
      if (!/(^|\.)amerniksa\.com$/.test(u.hostname)) return
      window.location.href = `/${u.search}${u.hash}`
    } catch { /* رابط غير صالح */ }
  })

  // تنبيه عند وجود إصدار أحدث على الموقع (التطبيق يحمل نسخة مضمّنة)
  const check = async () => {
    try {
      const r = await fetch(`${SITE_URL}/version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!r.ok) return
      const { build } = await r.json()
      if (build && build !== __BUILD_ID__) {
        // لا نزعج المستخدم أكثر من مرة كل ٣ أيام
        let last = 0
        try { last = Number(localStorage.getItem('amerni-update-shown') || 0) } catch { /* ignore */ }
        if (Date.now() - last > 3 * 24 * 3600 * 1000) {
          try { localStorage.setItem('amerni-update-shown', String(Date.now())) } catch { /* ignore */ }
          showUpdateBanner()
        }
      }
    } catch { /* بدون إنترنت */ }
  }
  check()
  CapApp.addListener('resume', check)
}

function showUpdateBanner() {
  if (document.getElementById('amerni-update-banner')) return
  const d = document.createElement('div')
  d.id = 'amerni-update-banner'
  d.dir = 'rtl'
  d.setAttribute('style', 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:99999;background:#1E3A8A;color:#fff;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;font:500 14px "IBM Plex Sans Arabic",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)')
  d.innerHTML = '<span style="flex:1">يتوفر إصدار أحدث من أمرني. حدّث التطبيق من المتجر.</span><button style="background:#fff;color:#1E3A8A;border:0;border-radius:10px;padding:6px 12px;font:700 13px inherit;cursor:pointer">حسناً</button>'
  d.querySelector('button')!.addEventListener('click', () => d.remove())
  document.body.appendChild(d)
}
