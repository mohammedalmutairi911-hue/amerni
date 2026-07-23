import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'

import { ErrorBoundary } from './App'

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
