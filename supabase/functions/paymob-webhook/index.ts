// ══════════════════════════════════════════════════════════════════════════
// أمرني · paymob-webhook (Transaction Processed Callback)
// ──────────────────────────────────────────────────────────────────────────
// المصدر الوحيد الموثوق لتأكيد الدفع. Paymob تستدعي هذا الرابط من خوادمها
// مباشرة (server-to-server) — لا نثق أبداً برابط الرجوع (redirection_url) في المتصفح لأن
// أي شخص يقدر يزوّره. كل طلب يُتحقق بتوقيع HMAC-SHA512 قبل أي كتابة على قاعدة البيانات، أي
// توقيع غير صحيح يُرفض فوراً ويُسجّل للتدقيق.
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// ترتيب الحقول الثابت الذي توثّقه Paymob لحساب HMAC على Transaction Callback
const HMAC_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
  'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
  'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
]

function getPath(obj: any, path: string): string {
  const val = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
  return val === undefined || val === null ? '' : String(val)
}

async function hmacSha512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function extractReference(obj: any): string | null {
  return obj?.order?.merchant_order_id || obj?.special_reference || null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const hmacSecret = Deno.env.get('PAYMOB_HMAC_SECRET')

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const obj = payload?.obj ?? payload
  const url = new URL(req.url)
  const receivedHmac = (url.searchParams.get('hmac') || payload?.hmac || '').toLowerCase()

  let hmacValid = false
  if (hmacSecret && receivedHmac) {
    const concatenated = HMAC_FIELDS.map(f => getPath(obj, f)).join('')
    const computed = await hmacSha512Hex(hmacSecret, concatenated)
    hmacValid = computed.toLowerCase() === receivedHmac
  }

  const reference = extractReference(obj)

  await admin.from('payment_webhook_log').insert({
    provider: 'paymob', hmac_valid: hmacValid, raw: payload,
    matched_transaction_id: null,
  })

  if (!hmacSecret) {
    console.error('paymob-webhook: PAYMOB_HMAC_SECRET غير مُهيّأ — رفض كل النداءات احتياطاً')
    return json({ error: 'hmac_not_configured' }, 500)
  }
  if (!hmacValid) {
    console.error('paymob-webhook: توقيع HMAC غير صحيح — تم الرفض')
    return json({ error: 'invalid_signature' }, 401)
  }
  if (!reference) {
    return json({ error: 'no_reference' }, 400)
  }

  const success = obj?.success === true || obj?.success === 'true'
  const errorOccurred = obj?.error_occured === true || obj?.error_occured === 'true'
  const refunded = obj?.is_refunded === true
  const voided = obj?.is_voided === true

  try {
    if (success && !errorOccurred && !refunded && !voided) {
      const { data, error } = await admin.rpc('payment_mark_paid', {
        p_special_reference: reference,
        p_paymob_transaction_id: String(obj?.id ?? ''),
        p_raw: payload,
      })
      if (error) throw error
      return json({ ok: true, ...data })
    } else {
      const { error } = await admin.rpc('payment_mark_failed', {
        p_special_reference: reference, p_raw: payload,
      })
      if (error) throw error
      return json({ ok: true, failed: true })
    }
  } catch (e) {
    console.error('paymob-webhook processing error:', (e as Error).message)
    return json({ ok: false, note: 'logged_for_review' })
  }
})
