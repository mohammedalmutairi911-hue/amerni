// ══════════════════════════════════════════════════════════════════════════
// أمرني · paymob-create-payment
// ──────────────────────────────────────────────────────────────────────────
// نقطة الدخول الوحيدة الآمنة لبدء دفعة. يعمل بالنيابة عن العميل (يمرّر توكن
// المستخدم) لإنشاء/استرجاع سجل payment_transactions عبر RPC محكوم بالملكية،
// ثم يستدعي Paymob Intention API بمفتاح سرّي محفوظ في متغيرات بيئة Supabase
// فقط (لا يصل أبداً إلى المتصفح) — هذا يغلق الثغرة التي كانت في PaymobButton
// القديم (VITE_PAYMOB_SECRET_KEY كان مكشوفاً بالكامل في حزمة الواجهة).
// ══════════════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthorized' }, 401)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // عميل يمثّل المستخدم الحقيقي — auth.uid() داخل الـ RPC سيكون هويته الفعلية
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  // عميل بصلاحية كاملة — فقط لتحديث حقول تكامل Paymob بعد التحقق من الملكية أعلاه
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    const { task_id } = await req.json().catch(() => ({}))
    if (!task_id) return json({ error: 'task_id مطلوب' }, 400)

    // 1) أنشئ/استرجع طلب الدفع — الملكية والسعر والحالة تُتحقق داخل الدالة نفسها
    const { data: reqData, error: reqErr } = await asUser.rpc('payment_create_request', { p_task_id: task_id })
    if (reqErr) return json({ error: reqErr.message }, 400)

    const { transaction_id, special_reference, amount, reused } = reqData as {
      transaction_id: string; special_reference: string; amount: number; reused: boolean
    }

    // لو الطلب معاد استخدامه ومربوط فعلاً بعملية Paymob سابقة، لا داعي لإنشاء Intention جديد
    if (reused) {
      const { data: existing } = await admin.from('payment_transactions')
        .select('paymob_order_id').eq('id', transaction_id).maybeSingle()
      if (existing?.paymob_order_id) {
        return json({
          transaction_id, special_reference, amount,
          client_secret: existing.paymob_order_id,
          public_key: Deno.env.get('PAYMOB_PUBLIC_KEY') ?? '',
        })
      }
    }

    // 2) نادِ Paymob Intention API بمفتاح سرّي من بيئة السيرفر فقط
    const secretKey = Deno.env.get('PAYMOB_SECRET_KEY')
    const publicKey = Deno.env.get('PAYMOB_PUBLIC_KEY')
    if (!secretKey || !publicKey) {
      return json({ error: 'بوابة الدفع غير مُهيّأة على الخادم (PAYMOB_SECRET_KEY/PAYMOB_PUBLIC_KEY)' }, 500)
    }

    // اجلب عنوان/اسم المهمة والعميل لإثراء بيانات الفوترة (اختياري لكن يحسّن قبول العمليات)
    const { data: task } = await admin.from('tasks').select('title').eq('id', task_id).maybeSingle()
    const { data: { user } } = await asUser.auth.getUser()
    const email = user?.email || 'customer@amerniksa.com'
    const fullName = (user?.user_metadata?.full_name as string) || 'عميل أمرني'
    const [firstName, ...rest] = fullName.trim().split(' ')
    const lastName = rest.join(' ') || 'أمرني'

    const webhookUrl = `${SUPABASE_URL}/functions/v1/paymob-webhook`
    const siteUrl = Deno.env.get('SITE_URL') || 'https://amerniksa.com'

    const res = await fetch('https://ksa.paymob.com/v1/intention/', {
      method: 'POST',
      headers: { Authorization: `Token ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'SAR',
        payment_methods: ['card'],
        items: [{ name: task?.title || 'خدمة أمرني', amount: Math.round(amount * 100), description: task?.title || '', quantity: 1 }],
        billing_data: {
          first_name: firstName || 'عميل', last_name: lastName,
          email, phone_number: '+966500000000',
          country: 'SA', city: 'Riyadh', street: 'NA', building: 'NA', floor: 'NA', apartment: 'NA',
        },
        special_reference,
        notification_url: webhookUrl,
        redirection_url: `${siteUrl}/#/dashboard?payment_ref=${special_reference}`,
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.client_secret) {
      await admin.rpc('payment_mark_failed', { p_special_reference: special_reference, p_raw: data })
      return json({ error: 'تعذّر إنشاء عملية الدفع لدى المزوّد' }, 502)
    }

    // خزّن مرجع Paymob (client_secret مؤقت + order id) — لإعادة الاستخدام لاحقاً
    await admin.from('payment_transactions')
      .update({ paymob_order_id: data.client_secret, updated_at: new Date().toISOString() })
      .eq('id', transaction_id)

    return json({
      transaction_id, special_reference, amount,
      client_secret: data.client_secret,
      public_key: publicKey,
    })
  } catch (e) {
    console.error('paymob-create-payment error:', (e as Error).message)
    return json({ error: (e as Error).message }, 500)
  }
})
