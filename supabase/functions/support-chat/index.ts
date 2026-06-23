import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SYSTEM = `أنت مساعد خدمة عملاء لمنصة "آمرني" — منصة سعودية لطلب الخدمات.
رد باللهجة السعودية العامية بشكل ودود ومختصر.
إذا سألوا عن شيء مو موجود في معرفتك قل: "سيتواصل معك أحد من الفريق قريباً".
آمرني تتيح: طلب خدمات يومية كالتوصيل والتصوير والتسوق والاستشارات، مقدمو خدمة موثوقون، تواصل محمي داخل المنصة، دعم ذكي.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    }})
  }

  try {
    const { messages } = await req.json()

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM,
        messages: messages.slice(-10),
      }),
    })

    const data = await res.json()
    const reply = data.content?.[0]?.text ?? 'عذراً، سيتواصل معك الفريق قريباً.'

    return new Response(JSON.stringify({ reply }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ reply: 'عذراً، حدث خطأ. تواصل معنا على support@amerniksa.com' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
