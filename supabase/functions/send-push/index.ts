// ══════════════════════════════════════════════════════════════
// Amerni Send-Push Edge Function
// ══════════════════════════════════════════════════════════════
// Triggered by database webhook on notifications table INSERT.
// Reads push_subscriptions for the target user and sends a
// Web Push (VAPID) notification to each of their devices.
//
// Setup:
//   supabase secrets set VAPID_PUBLIC_KEY='BIQwYXD3COvkMJ2XQ0idXKdUxRMRsp0p5PygMZiBLoO6FgZlW3QDHfAU6ragZ67xeU7LIvYN5V9GIqr2iPYyy6U'
//   supabase secrets set VAPID_PRIVATE_KEY='33y1J-aOpfCQCoosXWIqzpP00WByQtSqVUoDA1X9gJY'
//   supabase secrets set VAPID_SUBJECT='mailto:support@amerniksa.com'
//   supabase functions deploy send-push
//
// Then create a Database Webhook in Supabase Dashboard:
//   Table: notifications
//   Events: INSERT
//   Type: Supabase Edge Function
//   Function: send-push
// ══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from 'https://esm.sh/web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@amerniksa.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    user_id: string
    type?: string
    title: string
    body: string
    task_id?: string
    created_at: string
  }
}

// Map notification type to a target URL
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: WebhookPayload = await req.json()
    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      return new Response(JSON.stringify({ ignored: true }), { status: 200 })
    }

    const notif = payload.record
    if (!notif.user_id) {
      return new Response(JSON.stringify({ error: 'no user_id' }), { status: 400 })
    }

    // Fetch user's push subscriptions
    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', notif.user_id)

    if (subsErr) throw subsErr
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no subs' }), { status: 200 })
    }

    // Build push payload
    const pushBody = JSON.stringify({
      title: notif.title,
      body: notif.body,
      url: urlFor(notif.type),
      tag: notif.type ?? 'amerni',
      icon: '/icon-192.png',
    })

    // Send to each subscription in parallel
    const results = await Promise.allSettled(subs.map(async sub => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, pushBody)
        return { id: sub.id, ok: true }
      } catch (err: any) {
        // 404/410 → subscription expired, delete it
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          return { id: sub.id, ok: false, deleted: true }
        }
        return { id: sub.id, ok: false, error: err?.message }
      }
    }))

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).ok).length
    return new Response(JSON.stringify({ sent, total: subs.length }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  } catch (e: any) {
    console.error('send-push error:', e)
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 })
  }
})
