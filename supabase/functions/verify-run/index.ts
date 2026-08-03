// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify-Run Edge Function
// ──────────────────────────────────────────────────────────────────────────
// الخادم الموثوق لطبقة الثقة. هو الوحيد الذي يجلب الطبقة الرسمية (من واثق)
// ويكتبها عبر verify_generate_report بصلاحية service_role — العميل لا يستطيع
// تزوير بيانات السجل التجاري إطلاقاً.
//
// طبقة التكامل (Integration Layer) في ./providers.ts، مصدر واحد مشترك مع
// اختبارات الواجهة (Adapter): WathqProvider عند توفّر المفتاح، وإلا MockProvider.
// كل الأسرار من Environment Secrets فقط (WATHQ_API_KEY, SUPABASE_SERVICE_ROLE_KEY).
// ══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getProvider } from './providers.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { request_id } = await req.json().catch(() => ({}))
    if (!request_id) return json({ error: 'request_id مطلوب' }, 400)

    // حمّل الطلب
    const { data: reqRow, error: reqErr } = await admin
      .from('verify_requests')
      .select('id, company_id, input_cr, input_name, status')
      .eq('id', request_id)
      .maybeSingle()
    if (reqErr) throw reqErr
    if (!reqRow) return json({ error: 'request_not_found' }, 404)

    // امنع إعادة التوليد إن كان جاهزاً (idempotent)
    if (reqRow.status === 'ready') return json({ ok: true, already: true, request_id })

    // اختر المزوّد من الأسرار (واثق/Mock) — طبقة تكامل واحدة قابلة للاستبدال
    const provider = getProvider({
      WATHQ_API_KEY: Deno.env.get('WATHQ_API_KEY'),
      WATHQ_BASE_URL: Deno.env.get('WATHQ_BASE_URL'),
      WATHQ_MOCK: Deno.env.get('WATHQ_MOCK'),
    })
    const official = await provider.lookup(reqRow.input_cr, reqRow.input_name)

    // ولّد التقرير عبر RPC بصلاحية service_role (العميل لا يمرّ من هنا إطلاقاً)
    const { data: gen, error: genErr } = await admin.rpc('verify_generate_report', {
      p_request_id: request_id,
      p_official: official,
      p_source: provider.source,
    })
    if (genErr) {
      await admin.from('verify_requests').update({ status: 'failed', error_msg: genErr.message }).eq('id', request_id)
      throw genErr
    }

    return json({ ok: true, source: provider.source, ...gen })
  } catch (e) {
    console.error('verify-run error:', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
