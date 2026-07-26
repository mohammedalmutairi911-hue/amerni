// Edge Function: admin-actions
// أدوات إدارة Super Admin — تُنفَّذ بصلاحية service_role داخل الخادم فقط.
// verify_jwt = true (يتطلب توكن صالح)، ثم يتحقق أن المنفّذ Super Admin، ويسجّل كل عملية في admin_audit_log.
// النشر: supabase functions deploy admin-actions
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://amerniksa.com'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) return json({ error: 'missing_token' }, 401)

    // هوية المنفّذ من التوكن (لا نثق بأي هوية يرسلها العميل)
    const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
    const { data: userRes, error: userErr } = await anon.auth.getUser(jwt)
    const caller = userRes?.user
    if (userErr || !caller) return json({ error: 'invalid_token' }, 401)

    // عميل service_role (خادم فقط)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

    // البوابة: المنفّذ يجب أن يكون Super Admin
    const { data: isSuper } = await admin.rpc('is_super_admin', { uid: caller.id })
    if (!isSuper) return json({ error: 'forbidden_not_super_admin' }, 403)

    const body = await req.json().catch(() => ({}))
    const action: string = body.action
    const target: string | undefined = body.target_user_id
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const ua = req.headers.get('user-agent') ?? null

    // بريد الهدف + حماية: لا يجوز تنفيذ إجراء مدمّر على Super Admin آخر
    let targetEmail: string | null = null
    if (target) {
      const { data: tp } = await admin.from('profiles').select('email').eq('id', target).maybeSingle()
      targetEmail = tp?.email ?? null
      const destructive = ['login_as', 'disable_user', 'delete_user'].includes(action)
      if (destructive) {
        const { data: targetSuper } = await admin.rpc('is_super_admin', { uid: target })
        if (targetSuper) return json({ error: 'target_is_super_admin' }, 403)
      }
    }

    const audit = (details: Record<string, unknown> = {}) =>
      admin.rpc('admin_write_audit', {
        p_admin: caller.id, p_admin_email: caller.email ?? null,
        p_target: target ?? null, p_action: action, p_details: details, p_ip: ip, p_user_agent: ua,
      })

    switch (action) {
      case 'login_as': {
        if (!targetEmail) return json({ error: 'target_not_found' }, 404)
        const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: targetEmail })
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail })
        return json({ ok: true, hashed_token: data.properties?.hashed_token, email: targetEmail })
      }
      case 'disable_user': {
        if (!target) return json({ error: 'missing_target' }, 400)
        const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: '876000h' })
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail })
        return json({ ok: true })
      }
      case 'enable_user': {
        if (!target) return json({ error: 'missing_target' }, 400)
        const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: 'none' })
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail })
        return json({ ok: true })
      }
      case 'reset_password': {
        if (!targetEmail) return json({ error: 'target_not_found' }, 404)
        const { error } = await admin.auth.resetPasswordForEmail(targetEmail, { redirectTo: `${SITE_URL}` })
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail })
        return json({ ok: true })
      }
      case 'delete_user': {
        if (!target) return json({ error: 'missing_target' }, 400)
        const { data: impact } = await admin.rpc('admin_delete_impact', { target })
        const { error } = await admin.rpc('admin_hard_delete_user', { target })
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail, impact })
        return json({ ok: true, impact })
      }
      case 'delete_impact': {
        if (!target) return json({ error: 'missing_target' }, 400)
        const { data: impact, error } = await admin.rpc('admin_delete_impact', { target })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true, impact })
      }
      case 'set_approval': {
        if (!target) return json({ error: 'missing_target' }, 400)
        const table = body.kind === 'provider' ? 'enterprise_providers' : 'worker_profiles'
        const { error } = await admin.from(table).update({ is_approved: !!body.approved }).eq('user_id', target)
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail, kind: body.kind, approved: !!body.approved })
        return json({ ok: true })
      }
      case 'send_notification': {
        if (!target) return json({ error: 'missing_target' }, 400)
        const { error } = await admin.from('notifications').insert({ user_id: target, title: body.title ?? 'إشعار', body: body.body ?? '', read: false })
        if (error) return json({ error: error.message }, 400)
        await audit({ target_email: targetEmail, title: body.title })
        return json({ ok: true })
      }
      default:
        return json({ error: 'unknown_action' }, 400)
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
