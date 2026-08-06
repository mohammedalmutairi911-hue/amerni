// اختبارات وحدة · طبقة التكامل (Adapter) — MockProvider / WathqProvider / المصنع
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  MockProvider,
  WathqProvider,
  getProvider,
  mapWathqPayload,
  seedFrom,
  WATHQ_STATUS_MAP,
} from './providers'

describe('seedFrom', () => {
  it('حتمي: نفس المدخل يعطي نفس البذرة', () => {
    expect(seedFrom('1010101010', null)).toBe(seedFrom('1010101010', null))
  })
  it('يفضّل رقم السجل على الاسم', () => {
    expect(seedFrom('1010101010', 'شركة')).toBe(seedFrom('1010101010', 'أخرى'))
  })
})

describe('MockProvider', () => {
  const p = new MockProvider()

  it('source = mock', () => expect(p.source).toBe('mock'))

  it('حتمي: نفس رقم السجل ينتج نفس النتيجة', async () => {
    const a = await p.lookup('1010101010', null)
    const b = await p.lookup('1010101010', null)
    expect(a).toEqual(b)
  })

  it('يعيد حالة سجل ضمن القيم المسموحة', async () => {
    const r = await p.lookup('2050001234', null)
    expect(['active', 'expired', 'cancelled', 'suspended', 'unknown']).toContain(r.cr_status)
  })

  it('يمرّر رقم السجل كما هو ويولّد اسماً عند غيابه', async () => {
    const r = await p.lookup('4030009999', null)
    expect(r.cr_number).toBe('4030009999')
    expect(r.name.length).toBeGreaterThan(1)
  })

  it('تاريخ الإصدار سابق لليوم وبصيغة YYYY-MM-DD', async () => {
    const r = await p.lookup('1010203040', null)
    expect(r.issue_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(r.issue_date!).getTime()).toBeLessThan(Date.now())
  })
})

describe('mapWathqPayload', () => {
  it('يخرّط مسميات الحالة العربية إلى enum الموحّد', () => {
    expect(WATHQ_STATUS_MAP['نشط']).toBe('active')
    expect(mapWathqPayload('1010101010', null, { status: { name: 'منتهي' } }).cr_status).toBe('expired')
    expect(mapWathqPayload('1010101010', null, { status: 'موقوف' }).cr_status).toBe('suspended')
  })
  it('حالة غير معروفة → unknown', () => {
    expect(mapWathqPayload('1010101010', null, { status: 'شيء غريب' }).cr_status).toBe('unknown')
  })
  it('يستخرج الاسم والنشاط من مصادر بديلة', () => {
    const r = mapWathqPayload('1010101010', 'احتياطي', { crName: 'شركة النخبة', activities: [{ name: 'مقاولات' }] })
    expect(r.name).toBe('شركة النخبة')
    expect(r.activity).toBe('مقاولات')
  })
})

describe('WathqProvider', () => {
  afterEach(() => vi.restoreAllMocks())

  it('بدون رقم سجل يرجّع unknown دون نداء الشبكة', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const r = await new WathqProvider('k', 'https://api.wathq.sa/v5').lookup(null, 'بلا رقم')
    expect(r.cr_status).toBe('unknown')
    expect(spy).not.toHaveBeenCalled()
  })

  it('404 → unknown', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    const r = await new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)
    expect(r.cr_status).toBe('unknown')
  })

  it('خطأ خادم يرمي استثناءً', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
    await expect(new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)).rejects.toThrow(
      /wathq_error_500/,
    )
  })

  it('429 يُعزَل كـ Quota Violation مميّز عن wathq_error العام', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }))
    await expect(new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)).rejects.toThrow(
      /wathq_quota_exceeded/,
    )
  })

  it('يرسل apikey و accept و content-type في كل نداء', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    await new WathqProvider('secret-key', 'https://api.wathq.sa/v5').lookup('1010101010', null)
    const [, init] = spy.mock.calls[0]
    expect(init?.headers).toMatchObject({
      apikey: 'secret-key',
      accept: 'application/json',
      'content-type': 'application/json',
    })
  })

  it('فشل شبكة أول محاولة ثم نجاح ثاني محاولة → لا يرمي (retry مرة واحدة)', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ crName: 'شركة بعد إعادة المحاولة' }), { status: 200 }))
    const r = await new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(r.name).toBe('شركة بعد إعادة المحاولة')
  })

  it('فشل شبكة في المحاولتين → wathq_network_error (بلا محاولة ثالثة)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'))
    await expect(new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)).rejects.toThrow(
      /wathq_network_error/,
    )
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('انتهاء المهلة (AbortError) في المحاولتين → wathq_timeout', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)
    await expect(new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)).rejects.toThrow(
      /wathq_timeout/,
    )
  })

  it('استجابة سليمة تُخرَّط للعقد الموحّد', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ crName: 'مؤسسة الوفاء', status: { name: 'نشط' }, capital: 500000 }), {
        status: 200,
      }),
    )
    const r = await new WathqProvider('k', 'https://api.wathq.sa/v5').lookup('1010101010', null)
    expect(r).toMatchObject({ name: 'مؤسسة الوفاء', cr_status: 'active', capital: 500000 })
  })
})

describe('getProvider (factory)', () => {
  it('بلا مفتاح → Mock', () => expect(getProvider({}).source).toBe('mock'))
  it('مع مفتاح → Wathq', () => expect(getProvider({ WATHQ_API_KEY: 'k' }).source).toBe('wathq'))
  it('WATHQ_MOCK=true يفرض Mock رغم وجود المفتاح', () =>
    expect(getProvider({ WATHQ_API_KEY: 'k', WATHQ_MOCK: 'true' }).source).toBe('mock'))
})
