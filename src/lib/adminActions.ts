import { supabase } from './supabase'

const IMPERSONATION_KEY = 'amerni_impersonation'

// استدعاء الدالة الآمنة admin-actions. التوكن يُرسَل تلقائياً من جلسة المستخدم الحالية.
export async function adminAction(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: { action, ...payload },
  })
  if (error) {
    // محاولة استخراج رسالة الخطأ من الجسم
    let msg = error.message
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error } catch { /* ignore */ }
    return { ok: false, error: msg }
  }
  if (data && (data as any).error) return { ok: false, error: (data as any).error }
  return { ok: true, ...(data as any) }
}

// «الدخول كمستخدم»: يحفظ جلسة المدير ثم يتبادل توكن سحري للدخول للحساب المستهدف.
export async function startImpersonation(targetUserId: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'no_admin_session' }

  const res = await adminAction('login_as', { target_user_id: targetUserId })
  if (!res.ok || !res.hashed_token) return { ok: false, error: res.error || 'no_token' }

  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
    admin_access_token: session.access_token,
    admin_refresh_token: session.refresh_token,
    email: res.email,
  }))

  const { error } = await supabase.auth.verifyOtp({ token_hash: res.hashed_token, type: 'magiclink' })
  if (error) {
    localStorage.removeItem(IMPERSONATION_KEY)
    return { ok: false, error: error.message }
  }
  window.location.href = '/'
  return { ok: true }
}

export function getImpersonation(): { email?: string } | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// العودة لحساب المدير: يستعيد جلسة المدير المحفوظة.
export async function stopImpersonation() {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY)
    if (!raw) { window.location.href = '/'; return }
    const s = JSON.parse(raw)
    localStorage.removeItem(IMPERSONATION_KEY)
    await supabase.auth.setSession({
      access_token: s.admin_access_token,
      refresh_token: s.admin_refresh_token,
    })
  } catch { /* ignore */ }
  window.location.href = '/'
}
