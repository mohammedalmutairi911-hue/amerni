// ══════════════════════════════════════════════════════════════
// Amerni Send-Push Edge Function
// ══════════════════════════════════════════════════════════════
// The deployed version has VAPID_PRIVATE_KEY set via secure means.
// This source file NEVER contains the private key.
// To rotate keys: generate new pair with `npx web-push generate-vapid-keys`,
// update VAPID_PUBLIC below and src/lib/push.ts, then redeploy with new
// private key in the Supabase secret VAPID_PRIVATE_KEY.
// ══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// Public key is safe to publish (browsers need it to subscribe).
const VAPID_PUBLIC = 'BLx_rzUW80oYiKvOClv4epN4LVYCjO9qWtC6nqaY2p8s0FvQLsjTu9_jKxFav7UYOCMrNE6b_BqfaphHt8L_yYg'

// Private key MUST come from environment. Deploy will fail if missing — this
// prevents accidentally running without the secret set.
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
if (!VAPID_PRIVATE) {
  throw new Error('VAPID_PRIVATE_KEY environment variable is required')
}
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@amerniksa.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function urlFor(type: string | undefined): string {
  const map: Record<string, string> = {
    new_task: '/#/admin',
    new_user: '/#/admin',
    new_enterprise: '/#/admin-enterprises',
    new_worker: '/#/admin',
    task_accepted: '/#/admin',
    task_completed: '/#/admin',
    task_cancelled: '/#/admin',
    new_dispute: '/#/admin',
    new_review: '/#/admin',
    new_verification: '/#/admin',
  }
  return map[type ?? ''] ?? '/'
}

// أمان: الدالة عامة (يستدعيها trigger قاعدة البيانات)، لذلك لا نثق بأي محتوى في الطلب.
// نقبل فقط معرّف إشعار حقيقي أُنشئ قبل لحظات، ونقرأ المستخدم والنص من قاعدة البيانات،
// ولا نرسل لنفس الإشعار أكثر من مرة.
const MAX_AGE_MS = 2 * 60 * 1000
const sentIds = new Map<string, number>()

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const payload = await req.json()
    const id = payload?.record?.id
    if (payload?.type !== 'INSERT' || payload?.table !== 'notifications' || typeof id !== 'string') {
      return new Response(JSON.stringify({ ignored: true }), { status: 200 })
    }
    const now = Date.now()
    for (const [k, t] of sentIds) if (now - t > MAX_AGE_MS * 2) sentIds.delete(k)
    if (sentIds.has(id)) return new Response(JSON.stringify({ ignored: 'duplicate' }), { status: 200 })

    const { data: record } = await supabase
      .from('notifications')
      .select('id, user_id, title, body, type, created_at')
      .eq('id', id)
      .maybeSingle()
    if (!record?.user_id || now - new Date(record.created_at).getTime() > MAX_AGE_MS) {
      return new Response(JSON.stringify({ ignored: 'not_found_or_old' }), { status: 200 })
    }
    sentIds.set(id, now)

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', record.user_id)
    if (subsErr) throw subsErr
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_subs' }), { status: 200 })
    }

    const pushBody = JSON.stringify({
      title: record.title || 'Amerni',
      body: record.body || '',
      url: urlFor(record.type),
      tag: record.type ?? 'amerni',
      icon: '/icon-192.png',
    })

    const results = await Promise.allSettled(subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushBody
        )
        return { id: sub.id, ok: true }
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          return { id: sub.id, ok: false, deleted: true }
        }
        return { id: sub.id, ok: false, error: err?.message }
      }
    }))

    const sent = results.filter((r: any) => r.status === 'fulfilled' && (r.value as any).ok).length
    return new Response(JSON.stringify({ sent, total: subs.length }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    console.error('send-push error:', e)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 })
  }
})
