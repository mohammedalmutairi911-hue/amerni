// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify-Run Edge Function
// ──────────────────────────────────────────────────────────────────────────
// الخادم الموثوق لطبقة الثقة. هو الوحيد الذي يجلب الطبقة الرسمية (من واثق)
// ويكتبها عبر verify_generate_report بصلاحية service_role — العميل لا يستطيع
// تزوير بيانات السجل التجاري إطلاقاً.
//
// Integration Layer قابل للاستبدال:
//   • إن وُجد WATHQ_API_KEY  → يستدعي واثق الحقيقي (WathqProvider).
//   • وإلا                   → MockProvider ببيانات واقعية للتطوير/الكونسيرج.
// لا Placeholder: كلا المزوّدين منفّذان بالكامل خلف واجهة واحدة (OfficialProvider).
// ══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// ── نوع الطبقة الرسمية الموحّد ──────────────────────────────────────────────
interface OfficialData {
  cr_number: string | null
  name: string
  name_en?: string
  cr_status: 'active' | 'expired' | 'cancelled' | 'suspended' | 'unknown'
  entity_type?: string
  activity?: string
  issue_date?: string | null   // YYYY-MM-DD
  expiry_date?: string | null
  capital?: number | null
  city?: string
  region?: string
  owners?: unknown[]
  managers?: unknown[]
  branches?: unknown[]
  licenses?: unknown[]
}

interface OfficialProvider {
  readonly source: 'wathq' | 'mock'
  lookup(cr: string | null, name: string | null): Promise<OfficialData>
}

// ── MockProvider: بيانات واقعية مشتقّة من رقم السجل (حتمية وقابلة للتكرار) ────
class MockProvider implements OfficialProvider {
  readonly source = 'mock' as const
  async lookup(cr: string | null, name: string | null): Promise<OfficialData> {
    const seed = (cr ?? name ?? '0').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
    const regions = ['الرياض', 'مكة المكرمة', 'الشرقية', 'المدينة المنورة', 'عسير']
    const cities = ['الرياض', 'جدة', 'الدمام', 'المدينة المنورة', 'أبها']
    const activities = ['خدمات النظافة والتشغيل', 'المقاولات العامة', 'تقنية المعلومات', 'التسويق والدعاية', 'الصيانة والتشغيل']
    const statuses: OfficialData['cr_status'][] = ['active', 'active', 'active', 'expired', 'suspended']
    const idx = seed % 5
    const yearsOld = (seed % 12) + 1
    const issue = new Date()
    issue.setFullYear(issue.getFullYear() - yearsOld)
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + (statuses[idx] === 'expired' ? -1 : 2))
    return {
      cr_number: cr,
      name: name ?? `مؤسسة ${1000 + (seed % 9000)} التجارية`,
      name_en: `Establishment ${1000 + (seed % 9000)}`,
      cr_status: statuses[idx],
      entity_type: seed % 2 === 0 ? 'مؤسسة فردية' : 'شركة ذات مسؤولية محدودة',
      activity: activities[idx],
      issue_date: issue.toISOString().slice(0, 10),
      expiry_date: expiry.toISOString().slice(0, 10),
      capital: (seed % 10) * 50000 + 50000,
      city: cities[idx],
      region: regions[idx],
      owners: [{ name: `مالك ${seed % 100}`, nationality: 'سعودي' }],
      managers: [{ name: `مدير ${seed % 100}`, role: 'مدير عام' }],
      branches: seed % 3 === 0 ? [{ city: cities[(idx + 1) % 5] }] : [],
      licenses: seed % 2 === 0 ? [{ type: 'رخصة بلدية', status: 'سارية' }] : [],
    }
  }
}

// ── WathqProvider: تكامل واثق الحقيقي (يُفعّل تلقائياً عند وجود المفتاح) ──────
class WathqProvider implements OfficialProvider {
  readonly source = 'wathq' as const
  constructor(private apiKey: string, private baseUrl: string) {}
  async lookup(cr: string | null, name: string | null): Promise<OfficialData> {
    if (!cr) {
      // واثق يحتاج رقم سجل — بدون رقم نرجّع unknown قابل للإكمال Concierge
      return { cr_number: null, name: name ?? 'غير معروف', cr_status: 'unknown' }
    }
    const res = await fetch(`${this.baseUrl}/commercialregistration/fullinfo/${cr}`, {
      headers: { apikey: this.apiKey, accept: 'application/json' },
    })
    if (res.status === 404) return { cr_number: cr, name: name ?? 'سجل غير موجود', cr_status: 'unknown' }
    if (!res.ok) throw new Error(`wathq_error_${res.status}`)
    const d = await res.json()
    const statusMap: Record<string, OfficialData['cr_status']> = {
      نشط: 'active', ساري: 'active', منتهي: 'expired', ملغي: 'cancelled', موقوف: 'suspended',
    }
    return {
      cr_number: cr,
      name: d?.crName ?? d?.name ?? name ?? 'غير معروف',
      name_en: d?.crNameEn,
      cr_status: statusMap[d?.status?.name ?? d?.status] ?? 'unknown',
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
}

function getProvider(): OfficialProvider {
  const key = Deno.env.get('WATHQ_API_KEY')
  const forceMock = Deno.env.get('WATHQ_MOCK') === 'true'
  if (key && !forceMock) {
    return new WathqProvider(key, Deno.env.get('WATHQ_BASE_URL') ?? 'https://api.wathq.sa/v5')
  }
  return new MockProvider()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { request_id } = await req.json().catch(() => ({}))
    if (!request_id) return json({ error: 'request_id مطلوب' }, 400)

    // حمّل الطلب + الشركة
    const { data: reqRow, error: reqErr } = await admin
      .from('verify_requests')
      .select('id, company_id, input_cr, input_name, status')
      .eq('id', request_id)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return json({ error: 'request_not_found' }, 404)

    // امنع إعادة التوليد إن كان جاهزاً
    if (reqRow.status === 'ready') {
      return json({ ok: true, already: true, request_id })
    }

    const provider = getProvider()
    const official = await provider.lookup(reqRow.input_cr, reqRow.input_name)

    // ولّد التقرير عبر RPC بصلاحية service_role (العميل لا يمرّ من هنا)
    const { data: gen, error: genErr } = await admin.rpc('verify_generate_report', {
      p_request_id: request_id,
      p_official: official,
      p_source: provider.source,
    })
    if (genErr) {
      await admin.from('verify_requests')
        .update({ status: 'failed', error_msg: genErr.message })
        .eq('id', request_id)
      throw genErr
    }

    return json({ ok: true, source: provider.source, ...gen })
  } catch (e) {
    console.error('verify-run error:', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
