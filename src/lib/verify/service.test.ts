// اختبارات تكامل · طبقتا الخدمة والمستودع فوق عميل Supabase وهمي (بلا شبكة)
import { describe, it, expect, vi } from 'vitest'
import { VerifyRepository, type SupabaseLike } from './repository'
import { VerifyService } from './service'

function fakeDb(overrides: Partial<Record<string, any>> = {}): SupabaseLike {
  return {
    rpc: vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      if (overrides[fn]) return overrides[fn](args)
      if (fn === 'verify_create_request') return { data: { request_id: 'req-1', company_id: 'co-1' }, error: null }
      if (fn === 'verify_get_report')
        return {
          data: { request: { id: 'req-1', status: 'ready' }, company: { id: 'co-1', name: 'x' }, report: { trust_score: 80 } },
          error: null,
        }
      if (fn === 'verify_list_my_requests') return { data: [{ request_id: 'req-1' }], error: null }
      return { data: null, error: null }
    }),
    functions: {
      invoke: vi.fn(async (_name: string, _opts: { body: unknown }) => {
        if (overrides['verify-run']) return overrides['verify-run'](_opts)
        return { data: { ok: true, source: 'mock', report_id: 'rep-1', score: 80 }, error: null }
      }),
    },
  }
}

function makeService(db: SupabaseLike) {
  return new VerifyService(new VerifyRepository(db))
}

describe('VerifyService.validate', () => {
  it('يرفض المدخلات الفارغة قبل لمس الشبكة', async () => {
    const db = fakeDb()
    await expect(makeService(db).createRequest({})).rejects.toThrow(/رقم السجل|اسم الشركة/)
    expect((db.rpc as any)).not.toHaveBeenCalled()
  })

  it('يرفض رقم سجل غير مكوّن من ١٠ أرقام', async () => {
    const db = fakeDb()
    await expect(makeService(db).createRequest({ cr: '123' })).rejects.toThrow(/١٠ أرقام/)
    expect((db.rpc as any)).not.toHaveBeenCalled()
  })

  it('يقبل رقم سجل صحيح', async () => {
    const db = fakeDb()
    const r = await makeService(db).createRequest({ cr: '1010101010' })
    expect(r).toEqual({ request_id: 'req-1', company_id: 'co-1' })
    expect((db.rpc as any)).toHaveBeenCalledWith('verify_create_request', { p_cr: '1010101010', p_name: null })
  })

  it('يقبل الاسم فقط', async () => {
    const db = fakeDb()
    await makeService(db).createRequest({ name: 'شركة الاختبار' })
    expect((db.rpc as any)).toHaveBeenCalledWith('verify_create_request', { p_cr: null, p_name: 'شركة الاختبار' })
  })
})

describe('VerifyRepository error propagation', () => {
  it('يحوّل خطأ RPC إلى استثناء', async () => {
    const db = fakeDb({ verify_create_request: () => ({ data: null, error: { message: 'boom' } }) })
    await expect(makeService(db).createRequest({ cr: '1010101010' })).rejects.toThrow('boom')
  })

  it('run يحوّل خطأ الدالة إلى استثناء', async () => {
    const db = fakeDb({ 'verify-run': () => ({ data: null, error: { message: 'edge_down' } }) })
    await expect(makeService(db).run('req-1')).rejects.toThrow('edge_down')
  })
})

describe('VerifyService.verifyEndToEnd', () => {
  it('ينسّق: أنشئ → شغّل → اجلب، بالترتيب', async () => {
    const calls: string[] = []
    const db: SupabaseLike = {
      rpc: vi.fn(async (fn: string) => {
        calls.push(fn)
        if (fn === 'verify_create_request') return { data: { request_id: 'r', company_id: 'c' }, error: null }
        if (fn === 'verify_get_report') return { data: { request: { id: 'r' }, company: {}, report: { trust_score: 72 } }, error: null }
        return { data: null, error: null }
      }),
      functions: {
        invoke: vi.fn(async () => {
          calls.push('verify-run')
          return { data: { ok: true }, error: null }
        }),
      },
    }
    const bundle = await makeService(db).verifyEndToEnd({ cr: '7001234567' })
    expect(calls).toEqual(['verify_create_request', 'verify-run', 'verify_get_report'])
    expect(bundle.report?.trust_score).toBe(72)
  })
})
