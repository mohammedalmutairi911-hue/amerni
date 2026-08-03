// حارس التزامن · يضمن تطابق طبقة المزوّدين بين المصدر القانوني ونسخة الـEdge.
// إن انحرفت إحداهما (تعديل في مكان دون الآخر) يفشل هذا الاختبار فوراً.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('providers parity (frontend ↔ edge)', () => {
  it('src/lib/verify/providers.ts == supabase/functions/verify-run/providers.ts', () => {
    const root = resolve(__dirname, '../../..')
    const canonical = readFileSync(resolve(root, 'src/lib/verify/providers.ts'), 'utf8')
    const edge = readFileSync(resolve(root, 'supabase/functions/verify-run/providers.ts'), 'utf8')
    expect(edge).toBe(canonical)
  })
})
