// التحويل للمنفذين يدوي مرة في الأسبوع — كل يوم أحد (توقيت السعودية).

export const PAYOUT_DAY_LABEL = 'الأحد'

/** تاريخ الأحد القادم بتوقيت الرياض. طلبات يوم الأحد نفسه تروح للأحد اللي بعده
 *  (الأدمن يحوّل يوم الأحد الطلبات اللي وصلت لين نهاية السبت). */
export function nextPayoutDate(from = new Date()): Date {
  const riyadh = new Date(from.getTime() + (from.getTimezoneOffset() + 180) * 60000)
  const add = 7 - riyadh.getDay() // 0 = الأحد → 7
  const d = new Date(riyadh)
  d.setDate(riyadh.getDate() + add)
  return d
}

export function nextPayoutLabel(from = new Date()): string {
  const d = nextPayoutDate(from)
  return `الأحد ${d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}`
}

/** IBAN سعودي: SA + 22 رقم */
export function normalizeIban(v: string): string {
  return v.replace(/\s/g, '').toUpperCase()
}
export function isValidSaIban(v: string): boolean {
  return /^SA\d{22}$/.test(normalizeIban(v))
}
export function maskIban(v: string): string {
  const n = normalizeIban(v)
  return n.length > 8 ? `${n.slice(0, 4)} •••• ${n.slice(-4)}` : n
}
