// ══════════════════════════════════════════════════════════════
// Amerni Push Notifications — Client Subscription
// ══════════════════════════════════════════════════════════════

import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BIQwYXD3COvkMJ2XQ0idXKdUxRMRsp0p5PygMZiBLoO6FgZlW3QDHfAU6ragZ67xeU7LIvYN5V9GIqr2iPYyy6U'

const PROMPT_DELAY_KEY = 'amerni_notif_prompt_last'
const PROMPT_DENIED_DAYS = 7 // إعادة السؤال بعد 7 أيام

// ── تحويل base64 لـ Uint8Array (للـ VAPID) ─────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// ── فحص الدعم ───────────────────────────────────────────────
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

// ── حالة الإذن الحالية ──────────────────────────────────────
export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

// ── هل مضى وقت كافٍ لإعادة سؤال المستخدم؟ ──────────────────
export function shouldPromptForPermission(): boolean {
  if (!isPushSupported()) return false
  if (Notification.permission === 'granted') return false
  if (Notification.permission === 'denied') return false

  const lastPrompt = localStorage.getItem(PROMPT_DELAY_KEY)
  if (!lastPrompt) return true

  const daysSince = (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24)
  return daysSince >= PROMPT_DENIED_DAYS
}

// ── سجّل رفض المستخدم لتأخير الطلب ──────────────────────────
export function recordPromptDismissed(): void {
  localStorage.setItem(PROMPT_DELAY_KEY, Date.now().toString())
}

// ── نوع الجهاز ──────────────────────────────────────────────
function getDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'desktop'
}

// ── طلب إذن الإشعارات وحفظ الاشتراك ────────────────────────
export async function enablePushNotifications(): Promise<{
  success: boolean
  reason?: 'unsupported' | 'denied' | 'error'
  error?: string
}> {
  if (!isPushSupported()) return { success: false, reason: 'unsupported' }

  try {
    // 1) طلب الإذن
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      recordPromptDismissed()
      return { success: false, reason: 'denied' }
    }

    // 2) تسجيل Service Worker (إن لم يكن مسجّلاً)
    const registration = await navigator.serviceWorker.ready

    // 3) إنشاء الاشتراك
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    // 4) حفظ الاشتراك في قاعدة البيانات
    const { user } = (await supabase.auth.getSession()).data.session || {}
    if (!user) return { success: false, reason: 'error', error: 'not authenticated' }

    const json = subscription.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('Failed to save push subscription:', error)
      return { success: false, reason: 'error', error: error.message }
    }

    return { success: true }
  } catch (e: any) {
    console.error('Push subscription failed:', e)
    return { success: false, reason: 'error', error: e?.message }
  }
}

// ── إلغاء الاشتراك (عند تسجيل الخروج) ──────────────────────
export async function disablePushNotifications(): Promise<void> {
  try {
    if (!isPushSupported()) return
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      // احذف من DB أولاً
      const endpoint = subscription.endpoint
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      // ثم من المتصفح
      await subscription.unsubscribe()
    }
  } catch (e) {
    console.warn('Push unsubscribe failed:', e)
  }
}

// ── هل المستخدم مشترك حالياً؟ ──────────────────────────────
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
