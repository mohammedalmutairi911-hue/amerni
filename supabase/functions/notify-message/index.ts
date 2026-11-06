// notify-message — تنبيه الطرف الآخر عند وصول رسالة جديدة في محادثة الطلب
// الأمان: المستدعي لازم يكون طرفاً في الطلب (عميل أو العامل المسند). المستلم دائماً الطرف الآخر.
// منع الإزعاج: تنبيه واحد غير مقروء لكل طلب خلال 10 دقائق.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  try {
    const auth = req.headers.get('authorization') ?? ''
    const uc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await uc.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const payload = await req.json().catch(() => ({}))
    const { task_id, lead_id } = payload as { task_id?: string; lead_id?: string }
    const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

    let to: string | null = null
    let title = ''
    let taskRef: string | null = null

    if (isUuid(lead_id)) {
      // محادثة منشأة ↔ مزود
      const { data: lead } = await admin.from('enterprise_leads').select('id, company_name, category, user_id, provider_id').eq('id', lead_id).maybeSingle()
      if (!lead) return json({ ignored: 'not_found' })
      if (user.id === lead.user_id) to = lead.provider_id
      else if (user.id === lead.provider_id) to = lead.user_id
      else return json({ error: 'forbidden' }, 403)
      title = String(lead.category || lead.company_name || 'طلب منشأة')
    } else if (isUuid(task_id)) {
      const { data: task } = await admin.from('tasks').select('id, title, client_id, user_id, worker_id, status').eq('id', task_id).maybeSingle()
      if (!task) return json({ ignored: 'not_found' })
      const owner = task.client_id ?? task.user_id
      if (user.id === owner || user.id === task.user_id) to = task.worker_id
      else if (user.id === task.worker_id) to = owner
      else return json({ error: 'forbidden' }, 403)
      title = String(task.title)
      taskRef = task.id
    } else return json({ error: 'bad_id' }, 400)
    if (!to || to === user.id) return json({ ignored: 'no_recipient' })

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    let q = admin.from('notifications').select('id').eq('user_id', to).eq('type', 'new_message').eq('read', false).gte('created_at', since).limit(1)
    q = taskRef ? q.eq('task_id', taskRef) : q.is('task_id', null).ilike('body', `%${title.slice(0, 60)}%`)
    const { data: recent } = await q
    if (recent && recent.length) return json({ ignored: 'throttled' })

    const { error } = await admin.from('notifications').insert({
      user_id: to, type: 'new_message', title: '💬 رسالة جديدة',
      body: `وصلتك رسالة على طلب «${title.slice(0, 60)}»`, task_id: taskRef,
    })
    if (error) throw error
    return json({ notified: 1 })
  } catch (e) {
    console.error('notify-message error:', e)
    return json({ error: 'internal' }, 500)
  }
})
