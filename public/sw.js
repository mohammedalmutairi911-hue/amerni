// ══════════════════════════════════════════════════════════════
// Amerni Service Worker v6 — Push Notifications + Offline + Cache
// ══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'amerni-v6'
const OFFLINE_URL = '/offline.html'
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Install: cache the offline shell ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clean old caches + claim clients ───────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  )
})

// ── Fetch: network-first for HTML, cache offline fallback ────
self.addEventListener('fetch', event => {
  const req = event.request
  // Only handle GET
  if (req.method !== 'GET') return
  // Skip cross-origin (supabase, analytics, etc)
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Skip API-like paths
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) return

  // Navigation requests → network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Static assets → cache-first
  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const clone = res.clone()
        caches.open(CACHE_VERSION).then(c => c.put(req, clone))
        return res
      }))
    )
  }
})

// ── Push: display notification ───────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'أمرني', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'أمرني ⚡'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-96.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag: data.tag || 'amerni-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        // Update badge count (if supported)
        if ('setAppBadge' in self.navigator) {
          self.navigator.setAppBadge().catch(() => {})
        }
      })
  )
})

// ── Notification Click: focus existing tab or open new ───────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Try to focus an existing window
        for (const client of clients) {
          if ('focus' in client) {
            client.postMessage({ type: 'navigate', url: targetUrl })
            return client.focus()
          }
        }
        // No window open → open new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
      .then(() => {
        if ('clearAppBadge' in self.navigator) {
          self.navigator.clearAppBadge().catch(() => {})
        }
      })
  )
})

// ── Push subscription change: re-subscribe automatically ─────
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'resubscribe' }))
    })
  )
})

// ── Message from page (e.g. skip waiting for update) ─────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
