import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import '@fontsource/ibm-plex-sans-arabic/latin-400.css'
import '@fontsource/ibm-plex-sans-arabic/latin-500.css'
import '@fontsource/ibm-plex-sans-arabic/latin-700.css'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'

import { ErrorBoundary } from './App'
import { initNativeApp } from './lib/nativeApp'

initNativeApp()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

// ── Service Worker Registration + Update Handling ────────────
if ('serviceWorker' in navigator && !window.location.hostname.includes('localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Check for updates on load
        reg.update()

        // Handle SW updates: prompt user to refresh
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // A new version is ready. Skip waiting silently and reload once.
              newSW.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      })
      .catch(err => console.warn('SW registration failed:', err))

    // Reload after new SW takes control (one-time flag prevents infinite loop)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    // Handle navigation messages from SW (notification clicks)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'navigate' && event.data?.url) {
        const url = event.data.url
        // Same-origin hash navigation → dispatch popstate
        if (url.startsWith('/#') || url.startsWith('#')) {
          window.location.hash = url.replace(/^\//, '')
        } else if (url.startsWith('/')) {
          window.location.pathname = url
        }
      }
      // Re-subscribe request from SW
      if (event.data?.type === 'resubscribe') {
        import('./lib/push').then(({ enablePushNotifications }) => {
          enablePushNotifications().catch(() => {})
        })
      }
    })

    // Clear app badge when app comes to foreground
    if ('clearAppBadge' in navigator) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          ;(navigator as any).clearAppBadge().catch(() => {})
        }
      })
    }
  })
}

// ── كشف النسخ الجديدة ────────────────────────────────────────
// الصفحة المفتوحة تبقى على الكود القديم بعد أي نشر. نقارن ملف الـ JS الرئيسي
// في index.html الحالي على السيرفر مع اللي شغال الآن: إذا تغيّر نحدّث تلقائياً
// عند الرجوع للتبويب، أو نعرض شريط "تحديث" إذا المستخدم داخل الصفحة.
;(() => {
  if (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1') return
  const current = (document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement | null)?.getAttribute('src')
  if (!current) return
  let pending = false
  let banner: HTMLElement | null = null
  const showBanner = () => {
    if (banner) return
    banner = document.createElement('button')
    banner.setAttribute('dir', 'rtl')
    banner.textContent = '🔄 فيه تحديث جديد — اضغط للتحديث'
    banner.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(88px + env(safe-area-inset-bottom));z-index:200;background:#1e3a8a;color:#fff;font:700 13px inherit;font-family:inherit;padding:10px 16px;border-radius:999px;border:0;box-shadow:0 8px 24px rgba(0,0,0,.2)'
    banner.onclick = () => window.location.reload()
    document.body.appendChild(banner)
  }
  const check = async () => {
    if (pending) return
    try {
      const res = await fetch('/?_v=' + Date.now(), { cache: 'no-store' })
      if (!res.ok) return
      const html = await res.text()
      const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/index-[^"]+)"/) || html.match(/src="([^"]*\/assets\/index-[^"]+\.js)"/)
      if (m && m[1] !== current) { pending = true; if (document.visibilityState === 'visible') showBanner() }
    } catch { /* offline */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (pending) { window.location.reload(); return }
    check()
  })
  window.addEventListener('focus', check)
  setInterval(check, 3 * 60 * 1000)
})()
