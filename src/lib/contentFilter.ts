// فلتر المحتوى المحظور في السعودية
const BLOCKED_PATTERNS = {
  // مواد مخدرة
  drugs: /حشيش|ماريجوانا|كوكايين|هيروين|مخدر|بودر|كريستال|شيشة معطرة|نبتة|قنب|أقراص منشطة|كبتاغون|ترامادول|استروييد|حبوب|بنزو|انتن/gi,
  
  // محتوى جنسي
  sexual: /دعارة|بغاء|جنس|فاحشة|عاهرة|مومس|زانية|بورن|خليع|عارية|جنسي|ممارسة|شهوة|فاحش|قحبة/gi,
  
  // كحول وخمور
  alcohol: /خمر|كحول|بيرة|ويسكي|فودكا|نبيذ|مسكر|تهريب خمور|دواء مسكر/gi,
  
  // أسلحة وتهديد
  weapons: /سلاح|مسدس|بندقية|قنبلة|متفجر|ذخيرة|رشاش|سكين للضرب|تهديد|اغتيال/gi,
  
  // قمار
  gambling: /قمار|ميسر|رهان|كازينو|بوكر|روليت|يانصيب|لوتري/gi,
  
  // احتيال
  fraud: /غش|احتيال|تزوير|اختراق حساب|سرقة بيانات|فيشينج|اختراق|هكر موقع|كسر باسورد/gi,
}

const SEVERITY: Record<string, 'block' | 'warn'> = {
  drugs: 'block',
  sexual: 'block',
  alcohol: 'block',
  weapons: 'block',
  gambling: 'block',
  fraud: 'block',
}

export interface FilterResult {
  blocked: boolean
  reason?: string
  category?: string
}

export function filterContent(text: string): FilterResult {
  for (const [category, pattern] of Object.entries(BLOCKED_PATTERNS)) {
    if (pattern.test(text)) {
      const reasons: Record<string, string> = {
        drugs: 'محتوى يتعلق بمواد مخدرة محظورة',
        sexual: 'محتوى جنسي غير لائق',
        alcohol: 'محتوى يتعلق بالكحول المحظور',
        weapons: 'محتوى يتعلق بأسلحة أو تهديدات',
        gambling: 'محتوى يتعلق بالقمار المحظور',
        fraud: 'محتوى يتعلق بعمليات احتيال',
      }
      return { blocked: true, reason: reasons[category], category }
    }
  }
  return { blocked: false }
}

// Rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string, action: string, limit: number = 10, windowMs: number = 60000): boolean {
  const key = `${userId}:${action}`
  const now = Date.now()
  const entry = requestCounts.get(key)
  
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (entry.count >= limit) return false
  entry.count++
  return true
}
