import { Capacitor } from '@capacitor/core'

// داخل تطبيق أندرويد/آيفون (Capacitor) يكون origin هو localhost، فلا يصلح للروابط
// التي تُشارَك مع الآخرين. نستخدم عنوان الموقع الحقيقي دائماً.
export const SITE_URL = 'https://www.amerniksa.com'
export const isNativeApp = (): boolean => {
  try { return Capacitor.isNativePlatform() } catch { return false }
}
export const siteOrigin = (): string => (isNativeApp() ? SITE_URL : window.location.origin)
