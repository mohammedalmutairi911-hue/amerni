import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SYSTEM_INDIVIDUALS = `أنت مساعد خدمة عملاء لمنصة "آمرني" — منصة سعودية لطلب الخدمات.
رد باللهجة السعودية العامية بشكل ودود ومختصر.
إذا سألوا عن شيء مو موجود في معرفتك قل: "سيتواصل معك أحد من الفريق قريباً".
آمرني تتيح: طلب خدمات يومية كالتوصيل والتصوير والتسوق والاستشارات، مقدمو خدمة موثوقون، تواصل محمي داخل المنصة، دعم ذكي.`

const SYSTEM_ENTERPRISES = `أنت مساعد خدمة عملاء متخصص لمنصة "أمرني للمنشآت" السعودية — منصة B2B تربط الشركات بمزودي خدمات في 18 تخصصاً مقسمة في 5 مجموعات:
١. الحوكمة والامتثال: الحوكمة، نطاقات والسعودة، استشارات قانونية، تدقيق ومراجعة
٢. المالية والأعمال: المالية والزكاة، تأمين، مشتريات، استراتيجية وتخطيط
٣. التقنية والرقمي: أمن سيبراني وتحول رقمي، تسويق رقمي، ترجمة، ESG واستدامة
٤. الموارد البشرية: تدريب وتطوير، HSE وسلامة، جودة وISO، علاقات حكومية
٥. العمليات والمشاريع: إدارة مشاريع، عقارات ومرافق
العمولة الحالية: ١٪ من قيمة العقد مؤقتاً — قادم نظام اشتراك شهري.
الرد خلال ٢٤ ساعة. للتواصل: support@amerniksa.com
رد بشكل احترافي ومختصر.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    }})
  }

  try {
    const { messages, context } = await req.json()

    const system = context === 'enterprises' ? SYSTEM_ENTERPRISES : SYSTEM_INDIVIDUALS

    // timeout بعد 20 ثانية
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: context === 'enterprises' ? 800 : 400,
        system,
        messages: messages.slice(-10),
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await res.json()
    const reply = data.content?.[0]?.text ?? 'عذراً، سيتواصل معك الفريق قريباً.'

    return new Response(JSON.stringify({ reply }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ reply: 'عذراً، حدث خطأ مؤقت. تواصل معنا على support@amerniksa.com' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
