// تسجيل الدخول بقوقل عبر Google Identity Services مباشرة من أمرني
// (النافذة تظهر باسم amerniksa.com بدل عنوان Supabase).
// يحتاج VITE_GOOGLE_CLIENT_ID (معرّف عام وليس سراً). بدونه أو داخل تطبيق الجوال
// أو لو تعذّر تحميل السكربت: يظهر الزر القديم (fallback) كما هو.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { isNativeApp } from '../lib/platform'

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || ''
const GSI_SRC = 'https://accounts.google.com/gsi/client'

let gsiPromise: Promise<any> | null = null
function loadGsi(): Promise<any> {
  if ((window as any).google?.accounts?.id) return Promise.resolve((window as any).google)
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = GSI_SRC; s.async = true; s.defer = true
      s.onload = () => resolve((window as any).google)
      s.onerror = () => { gsiPromise = null; reject(new Error('gsi load failed')) }
      document.head.appendChild(s)
    })
  }
  return gsiPromise
}

const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')
async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function GoogleSignInButton({ fallback, text = 'continue_with' }: { fallback: ReactNode; text?: 'signin_with' | 'signup_with' | 'continue_with' }) {
  const holder = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const enabled = !!CLIENT_ID && !isNativeApp() && typeof crypto?.subtle !== 'undefined'

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const google = await loadGsi()
        if (cancelled || !holder.current) return
        const raw = rand()
        const hashed = await sha256Hex(raw)
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          ux_mode: 'popup',
          callback: async (resp: { credential?: string }) => {
            if (!resp.credential) return
            const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: raw })
            if (error) console.warn('google sign-in failed:', error.message)
          },
        })
        const width = Math.min(Math.max(holder.current.offsetWidth || 320, 200), 400)
        google.accounts.id.renderButton(holder.current, { type: 'standard', theme: 'outline', size: 'large', text, shape: 'pill', width, locale: 'ar' })
        setReady(true)
      } catch { if (!cancelled) setFailed(true) }
    })()
    return () => { cancelled = true }
  }, [enabled, text])

  if (!enabled || failed) return <>{fallback}</>
  return (
    <div className="w-full flex justify-center" style={{ minHeight: ready ? undefined : 44 }}>
      <div ref={holder} className="w-full flex justify-center" />
    </div>
  )
}
