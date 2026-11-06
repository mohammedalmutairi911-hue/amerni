// ══════════════════════════════════════════════════════════════
// notify-workers — عند نشر طلب جديد: تنبيه على الشاشة + إيميل لكل العمال المعتمدين
// ══════════════════════════════════════════════════════════════
// يستدعيه تطبيق العميل بعد نجاح create_task (JWT مطلوب).
// الأمان: لا نثق بأي شيء من الطلب غير task_id؛ نقرأ الطلب من القاعدة ونتأكد أن
// المستدعي صاحبه، وأن الطلب مفتوح وحديث، وما أُرسل له تنبيه سابقاً.
// المفاتيح (RESEND_API_KEY) تأتي من أسرار Supabase فقط، ولا تُكتب في الكود.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE = 'https://www.amerniksa.com'
const FROM = Deno.env.get('EMAIL_FROM') ?? 'أمرني <support@amerniksa.com>'
const MAX_AGE_MS = 10 * 60 * 1000
const PAGE = 500
const NOTIF_TYPE = 'task_for_you'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function emailHtml(t: { title: string; city?: string | null; category?: string | null; price?: number | null }) {
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#f4f7ff">
  <div style="background:#fff;border-radius:16px;padding:24px;border:1px solid #e2e8f0">
    <h2 style="margin:0 0 12px;color:#1e3a8a">طلب جديد في أمرني ⚡</h2>
    <p style="font-size:18px;font-weight:bold;color:#0f172a;margin:0 0 12px">${esc(t.title)}</p>
    <p style="color:#475569;margin:0 0 4px">📍 ${esc(t.city || '—')}${t.category ? ' · ' + esc(t.category) : ''}</p>
    ${t.price ? `<p style="color:#1e3a8a;font-weight:bold;margin:0 0 4px">💰 ${esc(t.price)} ريال</p>` : ''}
    <a href="${SITE}/#/bounties" style="display:inline-block;margin-top:16px;background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:bold">شوف الطلب واقبله</a>
    <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">أول من يقبل الطلب ياخذه. تقدر توقف هذي الإشعارات من إعدادات الإشعارات في حسابك.</p>
  </div></div>`
}

async function sendEmails(list: { email: string }[], task: any) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return { sent: 0, skipped: 'no_resend_key' }
  const html = emailHtml({ title: task.title, city: task.city, category: task.category, price: task.price_suggested })
  let sent = 0
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map((r) => ({ from: FROM, to: [r.email], subject: 'طلب جديد في أمرني ⚡ — ' + String(task.title).slice(0, 60), html }))
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(chunk),
      })
      if (res.ok) sent += chunk.length
      else console.error('resend batch failed', res.status, (await res.text()).slice(0, 200))
    } catch (e) { console.error('resend error', e) }
  }
  return { sent }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  try {
    // 1) من المستدعي؟
    const auth = req.headers.get('authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { task_id } = await req.json().catch(() => ({}))
    if (typeof task_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(task_id)) return json({ error: 'bad_task_id' }, 400)

    // 2) الطلب: صاحبه، مفتوح، حديث
    const { data: task } = await admin.from('tasks')
      .select('id, title, city, category, price_suggested, status, client_id, user_id, created_at')
      .eq('id', task_id).maybeSingle()
    if (!task) return json({ ignored: 'not_found' })
    if (task.client_id !== user.id && task.user_id !== user.id) return json({ error: 'forbidden' }, 403)
    if (task.status !== 'open' || Date.now() - new Date(task.created_at).getTime() > MAX_AGE_MS) return json({ ignored: 'not_open_or_old' })

    // 3) مرة واحدة لكل طلب
    const { data: prior } = await admin.from('notifications').select('id').eq('task_id', task.id).eq('type', NOTIF_TYPE).limit(1)
    if (prior && prior.length) return json({ ignored: 'already_notified' })

    // 4) كل العمال المعتمدين (صفحة بصفحة) ما عدا صاحب الطلب
    const recipients: string[] = []
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error } = await admin.from('worker_profiles').select('user_id').eq('is_approved', true).range(from, from + PAGE - 1)
      if (error) throw error
      for (const r of rows ?? []) if (r.user_id && r.user_id !== user.id) recipients.push(r.user_id)
      if (!rows || rows.length < PAGE) break
    }
    if (!recipients.length) return json({ notified: 0, emailed: 0 })

    // احترام تفضيل من أوقف إشعارات الطلبات
    const muted = new Set<string>()
    for (let i = 0; i < recipients.length; i += PAGE) {
      const { data: prefs } = await admin.from('notification_preferences').select('user_id, notify_orders').in('user_id', recipients.slice(i, i + PAGE)).eq('notify_orders', false)
      for (const p of prefs ?? []) muted.add(p.user_id)
    }
    const targets = recipients.filter((id) => !muted.has(id))

    // 5) تنبيه على الشاشة (+ يطلق send-push عبر trigger الموجود)
    const body = `${task.title} — ${task.city ?? ''}${task.price_suggested ? ' — ' + task.price_suggested + ' ريال' : ''}`
    for (let i = 0; i < targets.length; i += PAGE) {
      const rows = targets.slice(i, i + PAGE).map((uid) => ({ user_id: uid, type: NOTIF_TYPE, title: 'طلب جديد في أمرني ⚡', body, task_id: task.id }))
      const { error } = await admin.from('notifications').insert(rows)
      if (error) throw error
    }

    // 6) إيميل
    const emails: { email: string }[] = []
    for (let i = 0; i < targets.length; i += PAGE) {
      const { data: profs } = await admin.from('profiles').select('email').in('id', targets.slice(i, i + PAGE)).not('email', 'is', null)
      for (const p of profs ?? []) if (p.email) emails.push({ email: p.email })
    }
    const mail = await sendEmails(emails, task)

    return json({ notified: targets.length, emailed: mail.sent, email_status: mail.skipped ?? 'ok' })
  } catch (e) {
    console.error('notify-workers error:', e)
    return json({ error: 'internal' }, 500)
  }
})
