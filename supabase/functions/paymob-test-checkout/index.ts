// ══════════════════════════════════════════════════════════════════════════
// أمرني · paymob-test-checkout  (رابط اختبار مخصص لـ Paymob)
// ──────────────────────────────────────────────────────────────────────────
// دالة عامة (بدون تسجيل دخول) معزولة تماماً عن تدفق الإسكرو الحقيقي.
// الغرض الوحيد: تمكين مختبِر Paymob من الوصول لصفحة unified checkout بضغطة
// واحدة. تنشئ Intention بمبلغ اختبار صغير وتحوّل مباشرة. المفتاح السرّي يبقى
// في السيرفر فقط. ملاحظة: تستخدم PAYMOB_INTEGRATION_ID (test = 32852).
// ══════════════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SECRET = Deno.env.get('PAYMOB_SECRET_KEY') || '';
const PUBLIC = Deno.env.get('PAYMOB_PUBLIC_KEY') || '';
const INTEGRATION_ID = Number(Deno.env.get('PAYMOB_INTEGRATION_ID') || '32852');
const TEST_AMOUNT_SAR = Number(Deno.env.get('PAYMOB_TEST_AMOUNT_SAR') || '5');

// ملاحظة أمنية: في النسخة المنشورة على Supabase توجد قيمة احتياطية لمفاتيح الاختبار
// فقط لضمان عمل الرابط. لا تضع أبداً مفاتيح الإنتاج هنا — اضبطها كـ Supabase secrets.

Deno.serve(async (_req: Request) => {
  try {
    const res = await fetch('https://ksa.paymob.com/v1/intention/', {
      method: 'POST',
      headers: { Authorization: `Token ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(TEST_AMOUNT_SAR * 100),
        currency: 'SAR',
        payment_methods: [INTEGRATION_ID],
        items: [{ name: 'Amerni integration test', amount: Math.round(TEST_AMOUNT_SAR * 100), description: 'Paymob test checkout — Amerni', quantity: 1 }],
        billing_data: {
          first_name: 'Paymob', last_name: 'Tester',
          email: 'test@amerniksa.com', phone_number: '+966500000000',
          country: 'SA', city: 'Riyadh', street: 'NA', building: 'NA', floor: 'NA', apartment: 'NA',
        },
        special_reference: `amerni_test_${Date.now()}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.client_secret) {
      return new Response(JSON.stringify({ error: 'intention_failed', detail: data }, null, 2),
        { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    const checkoutUrl = `https://ksa.paymob.com/unifiedcheckout/?publicKey=${PUBLIC}&clientSecret=${data.client_secret}`;
    return new Response(null, { status: 302, headers: { Location: checkoutUrl } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
