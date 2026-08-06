// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — Integration Layer (Official Data Providers / Adapter)
// ──────────────────────────────────────────────────────────────────────────
// مصدر واحد لطبقة التكامل الرسمية (السجل التجاري من واثق). محايد للبيئة:
//   • يُستورد كما هو في Edge Function (Deno) عبر getProvider(denoEnv).
//   • ويُستورد في اختبارات vitest (Node) لاختبار الحتمية ورسم الحالات.
// لا يعتمد على أي API خاص بـ Deno على مستوى الوحدة — البيئة تُمرَّر حقناً.
//   • WathqProvider: تكامل واثق الحقيقي (يُفعّل عند توفّر المفتاح).
//   • MockProvider:  بيانات واقعية حتمية (تطوير + كونسيرج + اختبارات).
// ══════════════════════════════════════════════════════════════════════════

export type CrStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'unknown'
export type OfficialSource = 'wathq' | 'mock'

/** الطبقة الرسمية الموحّدة — العقد الوحيد الذي يستهلكه verify_generate_report. */
export interface OfficialData {
  cr_number: string | null
  name: string
  name_en?: string
  cr_status: CrStatus
  entity_type?: string
  activity?: string
  issue_date?: string | null // YYYY-MM-DD
  expiry_date?: string | null
  capital?: number | null
  city?: string
  region?: string
  owners?: unknown[]
  managers?: unknown[]
  branches?: unknown[]
  licenses?: unknown[]
}

/** واجهة المزوّد — كل مصادر الطبقة الرسمية تلتزم بها (Port). */
export interface OfficialProvider {
  readonly source: OfficialSource
  lookup(cr: string | null, name: string | null): Promise<OfficialData>
}

/** بيئة مجرّدة تُحقن للمصنع — يجعل الوحدة قابلة للاختبار خارج Deno. */
export interface ProviderEnv {
  WATHQ_API_KEY?: string
  WATHQ_BASE_URL?: string
  WATHQ_MOCK?: string
}

const REGIONS = ['الرياض', 'مكة المكرمة', 'الشرقية', 'المدينة المنورة', 'عسير']
const CITIES = ['الرياض', 'جدة', 'الدمام', 'المدينة المنورة', 'أبها']
const ACTIVITIES = [
  'خدمات النظافة والتشغيل',
  'المقاولات العامة',
  'تقنية المعلومات',
  'التسويق والدعاية',
  'الصيانة والتشغيل',
]
const STATUSES: CrStatus[] = ['active', 'active', 'active', 'expired', 'suspended']

/** بذرة حتمية من المدخلات — نفس المدخل يعطي دائماً نفس المخرج (قابل للاختبار). */
export function seedFrom(cr: string | null, name: string | null): number {
  return (cr ?? name ?? '0').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
}

// ── MockProvider ────────────────────────────────────────────────────────────
export class MockProvider implements OfficialProvider {
  readonly source = 'mock' as const

  // eslint-disable-next-line @typescript-eslint/require-await
  async lookup(cr: string | null, name: string | null): Promise<OfficialData> {
    const seed = seedFrom(cr, name)
    const idx = seed % 5
    const status = STATUSES[idx]
    const yearsOld = (seed % 12) + 1
    const issue = new Date()
    issue.setFullYear(issue.getFullYear() - yearsOld)
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + (status === 'expired' ? -1 : 2))
    return {
      cr_number: cr,
      name: name ?? `مؤسسة ${1000 + (seed % 9000)} التجارية`,
      name_en: `Establishment ${1000 + (seed % 9000)}`,
      cr_status: status,
      entity_type: seed % 2 === 0 ? 'مؤسسة فردية' : 'شركة ذات مسؤولية محدودة',
      activity: ACTIVITIES[idx],
      issue_date: issue.toISOString().slice(0, 10),
      expiry_date: expiry.toISOString().slice(0, 10),
      capital: (seed % 10) * 50000 + 50000,
      city: CITIES[idx],
      region: REGIONS[idx],
      owners: [{ name: `مالك ${seed % 100}`, nationality: 'سعودي' }],
      managers: [{ name: `مدير ${seed % 100}`, role: 'مدير عام' }],
      branches: seed % 3 === 0 ? [{ city: CITIES[(idx + 1) % 5] }] : [],
      licenses: seed % 2 === 0 ? [{ type: 'رخصة بلدية', status: 'سارية' }] : [],
    }
  }
}

// ── WathqProvider ───────────────────────────────────────────────────────────
// ✅ مراجعة تكامل (2026-08-06، مُحدَّثة): تأكّد base URL + مسار fullinfo عبر مصدرين:
//   (1) مثال إنتاجي حقيقي مؤرَّخ فبراير 2026: https://api.wathq.sa/v5/commercialregistration/{op}/{id}
//       بترويسة apiKey — مطابق تماماً لما هذا الكود يستخدمه (baseUrl الافتراضي
//       ونمط المسار). (2) توثيق OpenAPI الرسمي (Sandbox v6.7.0، سبتمبر 2025)
//       يؤكد وجود GET /fullinfo/{id} بنفس الدلالة. base URL/path الحاليان صحيحان،
//       لا حاجة لتغييرهما.
//   ⚠️ لم يُتحقّق: v6 "التشريعات الجديدة" (api/32 في بوابة المطورين) قد يكون
//     مساراً/بنية استجابة مختلفة تماماً — يبدو بيئة Sandbox منفصلة لم تُعمَّم
//     على الإنتاج بعد اعتباراً من هذا التاريخ؛ يُعاد فحصه دورياً.
//   💰 الأسعار لم تعد مجانية: تجربة 100 استعلام/30 يوم (5 طلبات/ثانية)، ثم مدفوعة
//     (fullinfo = 12 ريال/نداء، باقات تبدأ 5,000 ريال/شهر).
//   🔁 429 = "Quota Violation" رسمياً (نفاد حصة حساب) — لا يُعاد محاولته تلقائياً
//     (انظر wathq_quota_exceeded أدناه)، بعكس فشل الشبكة/Timeout (محاولة واحدة إضافية).
// خريطة حالة السجل من مسميات واثق العربية إلى enum الموحّد.
export const WATHQ_STATUS_MAP: Record<string, CrStatus> = {
  نشط: 'active',
  ساري: 'active',
  سارية: 'active',
  منتهي: 'expired',
  ملغي: 'cancelled',
  ملغى: 'cancelled',
  موقوف: 'suspended',
}

export function mapWathqPayload(cr: string, name: string | null, d: any): OfficialData {
  return {
    cr_number: cr,
    name: d?.crName ?? d?.name ?? name ?? 'غير معروف',
    name_en: d?.crNameEn,
    cr_status: WATHQ_STATUS_MAP[d?.status?.name ?? d?.status] ?? 'unknown',
    entity_type: d?.entityType?.name ?? d?.companyType,
    activity: Array.isArray(d?.activities) ? d.activities[0]?.name : d?.activity,
    issue_date: d?.issueDate ?? null,
    expiry_date: d?.expiryDate ?? null,
    capital: d?.capital ?? null,
    city: d?.location?.city,
    region: d?.location?.region,
    owners: d?.parties ?? d?.owners ?? [],
    managers: d?.managers ?? [],
    branches: d?.branches ?? [],
    licenses: d?.licenses ?? [],
  }
}

export class WathqProvider implements OfficialProvider {
  readonly source = 'wathq' as const
  constructor(private apiKey: string, private baseUrl: string) {}

  private async fetchOnce(cr: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(`${this.baseUrl}/commercialregistration/fullinfo/${cr}`, {
        headers: { apikey: this.apiKey, accept: 'application/json', 'content-type': 'application/json' },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  async lookup(cr: string | null, name: string | null): Promise<OfficialData> {
    if (!cr) {
      // واثق يتطلب رقم سجل — بدونه نرجّع unknown قابلاً للإكمال Concierge.
      return { cr_number: null, name: name ?? 'غير معروف', cr_status: 'unknown' }
    }

    const TIMEOUT_MS = 8000 // مطلوب صراحة: الكود الأصلي لم يكن يضبط أي مهلة على fetch()
    let res: Response
    try {
      res = await this.fetchOnce(cr, TIMEOUT_MS)
    } catch (e) {
      // إعادة محاولة واحدة فقط على فشل الشبكة/الانتهاء — أخطاء HTTP الحتمية (401/403/429/4xx)
      // لا تُعاد محاولتها هنا لأن التكرار لن يغيّر نتيجتها.
      const isAbort = e instanceof Error && e.name === 'AbortError'
      try {
        res = await this.fetchOnce(cr, TIMEOUT_MS)
      } catch {
        throw new Error(isAbort ? 'wathq_timeout' : 'wathq_network_error')
      }
    }

    if (res.status === 404) return { cr_number: cr, name: name ?? 'سجل غير موجود', cr_status: 'unknown' }
    // 429 = "Quota Violation" حسب توثيق واثق الرسمي — نفاد حصة الحساب، وليس throttle عابر
    // يستفيد من إعادة المحاولة؛ يُعزَل عن wathq_error_<status> العام ليتعامل معه المستدعي بوضوح.
    if (res.status === 429) throw new Error('wathq_quota_exceeded')
    if (!res.ok) throw new Error(`wathq_error_${res.status}`)
    return mapWathqPayload(cr, name, await res.json())
  }
}

/** مصنع الاختيار — واثق إن توفّر المفتاح ولم يُفرَض Mock، وإلا Mock. */
export function getProvider(env: ProviderEnv): OfficialProvider {
  const key = env.WATHQ_API_KEY
  const forceMock = env.WATHQ_MOCK === 'true'
  if (key && !forceMock) {
    return new WathqProvider(key, env.WATHQ_BASE_URL ?? 'https://api.wathq.sa/v5')
  }
  return new MockProvider()
}
