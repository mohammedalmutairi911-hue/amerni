// التحويل للمنفذين يدوي مرة في الأسبوع — كل يوم أحد (توقيت السعودية).
// آخر موعد لطلب السحب: نهاية يوم الخميس. الطلب لين الخميس الليل يتحوّل الأحد الجاي،
// وطلبات الجمعة والسبت والأحد تروح للأحد اللي بعده (لأن تسويات بوابة الدفع ما توصل فوراً).

export const PAYOUT_DAY_LABEL = 'الأحد'
export const PAYOUT_CUTOFF_LABEL = 'نهاية يوم الخميس'

const toRiyadh = (d: Date) => new Date(d.getTime() + (d.getTimezoneOffset() + 180) * 60000)

/** يوم الأحد اللي يتحوّل فيه طلب سحب أُرسل في الوقت المعطى (بتوقيت الرياض) */
export function payoutDateFor(requestedAt: Date | string = new Date()): Date {
  const r = toRiyadh(typeof requestedAt === 'string' ? new Date(requestedAt) : requestedAt)
  const day = r.getDay() // 0 الأحد … 4 الخميس، 5 الجمعة، 6 السبت
  const add = day <= 4 ? 7 - day : 14 - day
  const d = new Date(r); d.setDate(r.getDate() + add); d.setHours(0, 0, 0, 0)
  return d
}

/** للتوافق: موعد التحويل لطلب يُرسل الآن */
export const nextPayoutDate = (from = new Date()) => payoutDateFor(from)

export const sundayLabel = (d: Date) => `الأحد ${d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}`

export function nextPayoutLabel(from = new Date()): string {
  return sundayLabel(payoutDateFor(from))
}

/** أقرب أحد يحوّل فيه الأدمن (اليوم لو اليوم أحد) */
export function upcomingTransferSunday(from = new Date()): Date {
  const r = toRiyadh(from)
  const d = new Date(r); d.setDate(r.getDate() + ((7 - r.getDay()) % 7)); d.setHours(0, 0, 0, 0)
  return d
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
