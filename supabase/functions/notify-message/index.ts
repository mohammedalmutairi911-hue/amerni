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

    const { task_id } = await req.json().catch(() => ({}))
    if (typeof task_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(task_id)) return json({ error: 'bad_task_id' }, 400)

    const { data: task } = await admin.from('tasks').select('id, title, client_id, user_id, worker_id, status').eq('id', task_id).maybeSingle()
    if (!task) return json({ ignored: 'not_found' })
    const owner = task.client_id ?? task.user_id
    let to: string | null = null
    if (user.id === owner || user.id === task.user_id) to = task.worker_id
    else if (user.id === task.worker_id) to = owner
    else return json({ error: 'forbidden' }, 403)
    if (!to || to === user.id) return json({ ignored: 'no_recipient' })

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recent } = await admin.from('notifications').select('id')
      .eq('user_id', to).eq('task_id', task.id).eq('type', 'new_message').eq('read', false).gte('created_at', since).limit(1)
    if (recent && recent.length) return json({ ignored: 'throttled' })

    const { error } = await admin.from('notifications').insert({
      user_id: to, type: 'new_message', title: '💬 رسالة جديدة',
      body: `وصلتك رسالة على طلب «${String(task.title).slice(0, 60)}»`, task_id: task.id,
    })
    if (error) throw error
    return json({ notified: 1 })
  } catch (e) {
    console.error('notify-message error:', e)
    return json({ error: 'internal' }, 500)
  }
})
