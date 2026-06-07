// طلب إذن الإشعارات وتسجيل Service Worker
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// إشعار محلي (بدون push server)
export function sendLocalNotification(title: string, body: string, url?: string) {
  if (Notification.permission !== 'granted') return
  
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    dir: 'rtl',
    lang: 'ar',
    tag: 'amerni-notification',
  })
  
  notification.onclick = () => {
    window.focus()
    if (url) window.location.href = url
    notification.close()
  }
  
  // أغلق بعد 10 ثوانٍ
  setTimeout(() => notification.close(), 10000)
}

// تسجيل Service Worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js')
    } catch (e) {
      console.log('SW registration failed:', e)
    }
  }
}
