import { useState, useCallback } from 'react'

// حالة تبقى بعد تحديث الصفحة (sessionStorage: لنفس التبويب). مثال: التبويب الحالي في لوحة.
export function usePersistedState<T extends string>(key: string, initial: T, allowed?: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key) as T | null
      if (saved && (!allowed || allowed.includes(saved))) return saved
    } catch { /* storage غير متاح */ }
    return initial
  })
  const set = useCallback((v: T) => {
    setValue(v)
    try { sessionStorage.setItem(key, v) } catch { /* ignore */ }
  }, [key])
  return [value, set] as const
}

export function readSaved(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}
export function writeSaved(key: string, v: string | null) {
  try { if (v) sessionStorage.setItem(key, v); else sessionStorage.removeItem(key) } catch { /* ignore */ }
}
