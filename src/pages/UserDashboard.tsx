import { useState, useEffect, useRef } from 'react'
import { Plus, Sparkles, Clock, CheckCircle, X, Loader2, Bot, MessageSquare, Star, Send, Shield, Unlock, TrendingUp, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task } from '../types'

const CATEGORIES = ['توصيل ومشاوير', 'تحقق ومتابعة', 'تصوير ومحتوى', 'مساعدة إدارية', 'تسوق', 'أخرى']
const CITIES = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'حائل', 'جازان']

const STATUS_LABEL: Record<string, string> = {
  open: 'بانتظار عامل', in_progress: 'جاري', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع'
}
const STATUS_COLOR: Record<string, string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-zinc-500 bg-zinc-800 border-zinc-700',
  disputed: 'text-red-400 bg-red-500/10 border-red-500/20',
}
const STATUS_ICON: Record<string, string> = {
  open: '🟡', in_progress: '🔵', completed: '✅', cancelled: '⚫', disputed: '🔴'
}

const BLOCKED = [/(\+966|00966|05\d{8})/, /[\w.-]+@[\w.-]+\.\w{2,}/, /wa\.me|whatsapp|واتساب|telegram|t\.me/i]

interface Msg {
  id: string; sender_id: string; content: string; is_blocked: boolean; created_at: string
  profiles?: { full_name: string }
}

export function UserDashboard() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [blockedWarn, setBlockedWarn] = useState('')
  const [rating, setRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ title: '', description: '', category: CATEGORIES[0], city: 'الرياض', use_ai: false, budget: '' })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!user) return
    // حفظ الطلب المعلق من الصفحة الرئيسية
    const pending = sessionStorage.getItem('pending_task')
    if (pending) {
      sessionStorage.removeItem('pending_task')
      try {
        const { title, city } = JSON.parse(pending)
        if (title) {
          supabase.from('tasks').insert({
            client_id: user.id, user_id: user.id,
            title, description: title,
            category: 'أخرى', city: city || 'الرياض',
            use_ai: false, status: 'open'
          }).then(() => fetchTasks())
          return
        }
      } catch {}
    }
    fetchTasks()
  }, [user?.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const fetchTasks = async () => {
    setLoading(true)
    // جيب كل الطلبات اللي فيها user_id أو client_id يساوي المستخدم
    const { data, error } = await supabase.from('tasks').select('*')
      .or(`client_id.eq.${user!.id},user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
    console.log('Tasks:', data, 'Error:', error)
    setTasks(data || [])
    setLoading(false)
  }

  const openTask = async (task: Task) => {
    setSelectedTask(task)
    setRatingDone(false)
    setRating(0)
    const { data } = await supabase.from('task_messages')
      .select('*, profiles(full_name)').eq('task_id', task.id).order('created_at')
    setMsgs(data || [])

    const ch = supabase.channel(`task-client-${task.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${task.id}` },
        () => supabase.from('task_messages').select('*, profiles(full_name)').eq('task_id', task.id).order('created_at')
          .then(({ data }) => setMsgs(data || [])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${task.id}` },
        ({ new: updated }) => setSelectedTask(updated as Task))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }

  const sendMsg = async () => {
    const text = msg.trim()
    if (!text || !user || !selectedTask) return
    if (BLOCKED.some(p => p.test(text))) {
      setBlockedWarn('⛔ لا يمكن مشاركة بيانات تواصل — التواصل داخل المنصة فقط')
      setTimeout(() => setBlockedWarn(''), 4000)
      return
    }
    setSending(true)
    await supabase.from('task_messages').insert({ task_id: selectedTask.id, sender_id: user.id, content: text, is_blocked: false })
    setMsg('')
    setSending(false)
  }

  const confirmPayment = async () => {
    if (!selectedTask || !user) return
    setConfirmingPayment(true)
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', selectedTask.id)
    await supabase.from('task_messages').insert({
      task_id: selectedTask.id, sender_id: user.id,
      content: '✅ العميل أكد استلام الخدمة وإرسال المبلغ.',
      is_blocked: false
    })
    setSelectedTask(p => p ? { ...p, status: 'completed' } : null)
    setConfirmingPayment(false)
  }

  const submitRating = async () => {
    if (!rating || !selectedTask?.worker_id) return
    await supabase.from('ratings').insert({ task_id: selectedTask.id, worker_id: selectedTask.worker_id, rater_id: user!.id, stars: rating }).catch(() => {})
    setRatingDone(true)
  }

  const submitTask = async () => {
    if (!form.title.trim() || !user) return
    setSubmitting(true)
    const { data, error } = await supabase.from('tasks').insert({
      client_id: user.id,
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || form.title.trim(),
      category: form.category,
      city: form.city,
      use_ai: form.use_ai,
      status: 'open',
      price_suggested: form.budget ? Number(form.budget) : null
    }).select().single()
    console.log('New task:', data, 'Error:', error)
    if (data) {
      setTasks(p => [data as Task, ...p])
      setShowNew(false)
      setForm({ title: '', description: '', category: CATEGORIES[0], city: 'الرياض', use_ai: false, budget: '' })
    }
    setSubmitting(false)
  }

  // Stats
  const openTasks = tasks.filter(t => t.status === 'open').length
  const activeTasks = tasks.filter(t => t.status === 'in_progress').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  // Task detail
  if (selectedTask) return (
    <div className="min-h-screen bg-[#080808] pt-14">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => { setSelectedTask(null); fetchTasks() }}
          className="text-sm text-zinc-400 hover:text-white mb-5 flex items-center gap-1 transition-colors">
          ← رجوع للطلبات
        </button>

        {/* Task card */}
        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="font-bold text-lg flex-1">{selectedTask.title}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_COLOR[selectedTask.status]}`}>
              {STATUS_ICON[selectedTask.status]} {STATUS_LABEL[selectedTask.status]}
            </span>
          </div>
          {selectedTask.description !== selectedTask.title && (
            <p className="text-zinc-400 text-sm mb-3">{selectedTask.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">{selectedTask.category}</span>
            <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">📍 {selectedTask.city}</span>
            {selectedTask.price_suggested && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
                💰 {selectedTask.price_suggested} ريال
              </span>
            )}
            {selectedTask.price_final && (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                ✅ متفق: {selectedTask.price_final} ريال
              </span>
            )}
          </div>
        </div>

        {/* Waiting for worker */}
        {selectedTask.status === 'open' && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-300">بانتظار عامل</p>
              <p className="text-xs text-zinc-500 mt-0.5">سيتم إشعارك فور قبول عامل طلبك</p>
            </div>
          </div>
        )}

        {/* Confirm payment */}
        {selectedTask.status === 'in_progress' && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Unlock size={16} className="text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">تأكيد إتمام الخدمة</h3>
            </div>
            <p className="text-zinc-400 text-xs mb-4">بعد ما تستلم الخدمة وتتأكد من إرسال المبلغ للعامل اضغط التأكيد.</p>
            <button onClick={confirmPayment} disabled={confirmingPayment}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {confirmingPayment ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {confirmingPayment ? 'جاري...' : 'أكدت استلام الخدمة وإرسال المبلغ'}
            </button>
          </div>
        )}

        {/* Rating */}
        {selectedTask.status === 'completed' && selectedTask.worker_id && !ratingDone && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Star size={16} className="text-amber-400" /> قيّم العامل</h3>
            <div className="flex gap-2 mb-3">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={26} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
                </button>
              ))}
            </div>
            <button onClick={submitRating} disabled={!rating}
              className="bg-amber-500 text-black font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-40 hover:bg-amber-400 transition-colors">
              إرسال التقييم
            </button>
          </div>
        )}
        {ratingDone && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle size={15} /> شكراً على تقييمك!
          </div>
        )}

        {/* Chat */}
        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare size={15} className="text-amber-500" /> المحادثة مع العامل
            </span>
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <Shield size={11} className="text-emerald-500" /> محمية
            </span>
          </div>
          <div className="h-72 overflow-y-auto px-4 py-3 space-y-2">
            {msgs.length === 0 && (
              <p className="text-center text-zinc-600 text-sm py-8">
                {selectedTask.status === 'open' ? 'المحادثة ستفتح بعد قبول العامل' : 'لا توجد رسائل بعد'}
              </p>
            )}
            {msgs.map(m => {
              const isMe = m.sender_id === user?.id
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%]">
                    {!isMe && <p className="text-xs text-zinc-500 mb-1">{m.profiles?.full_name}</p>}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'bg-amber-500 text-black rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
          {blockedWarn && (
            <div className="mx-3 mb-2 px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-xl text-sm text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> {blockedWarn}
            </div>
          )}
          {selectedTask.status === 'in_progress' && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-amber-500/40 transition-colors">
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                  placeholder="اكتب رسالة للعامل..." className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600" />
                <button onClick={sendMsg} disabled={!msg.trim() || sending} className="text-amber-500 disabled:opacity-30 transition-colors">
                  {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080808] pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">مرحباً {profile?.full_name?.split(' ')[0] || ''} 👋</h1>
            <p className="text-zinc-500 text-sm mt-0.5">وش تحتاج اليوم؟</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-amber-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-400 transition-colors">
            <Plus size={16} /> طلب جديد
          </button>
        </div>

        {/* Stats */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'بانتظار عامل', value: openTasks, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'جاري', value: activeTasks, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'مكتمل', value: completedTasks, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`border rounded-2xl p-4 text-center ${bg}`}>
                <div className={`text-2xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-zinc-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* New task modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#111] border border-zinc-800 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">طلب جديد</h3>
                <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">وش تبي؟ *</label>
                  <textarea value={form.title} onChange={e => set('title', e.target.value)} rows={2}
                    placeholder="اكتب طلبك بأي كلام..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">تفاصيل إضافية (اختياري)</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                    placeholder="أي تفاصيل تساعد العامل..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-colors resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">التصنيف</label>
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">المدينة</label>
                    <select value={form.city} onChange={e => set('city', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none">
                      {CITIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">ميزانيتك (اختياري)</label>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
                    <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)}
                      placeholder="مثال: 80" className="flex-1 bg-transparent text-sm outline-none" />
                    <span className="text-zinc-500 text-sm">ريال</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl cursor-pointer border border-zinc-800 hover:border-zinc-700 transition-colors"
                  onClick={() => set('use_ai', !form.use_ai)}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${form.use_ai ? 'bg-purple-500 border-purple-500' : 'border-zinc-600'}`}>
                    {form.use_ai && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5"><Bot size={13} className="text-purple-400" /> أريد حل بالذكاء الاصطناعي</p>
                    <p className="text-xs text-zinc-500">أسرع وأرخص — للشرح والبحث والكتابة</p>
                  </div>
                </div>
              </div>
              <button onClick={submitTask} disabled={!form.title.trim() || submitting}
                className="w-full mt-4 bg-amber-500 text-black font-bold py-3 rounded-xl text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={15} className="animate-spin" />}
                نشر الطلب
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">ما عندك طلبات بعد</h3>
            <p className="text-zinc-500 text-sm mb-8 max-w-xs mx-auto">اكتب أي شيء تحتاجه وعامل يقبله في ثواني</p>
            <button onClick={() => setShowNew(true)}
              className="bg-amber-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-amber-400 transition-colors text-base">
              اطلب الحين
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-zinc-500" />
              <h2 className="text-sm font-medium text-zinc-400">طلباتك ({tasks.length})</h2>
            </div>
            {tasks.map(task => (
              <button key={task.id} onClick={() => openTask(task)}
                className="w-full bg-[#0d0d0d] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 text-right transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLOR[task.status]}`}>
                        {STATUS_ICON[task.status]} {STATUS_LABEL[task.status]}
                      </span>
                      {task.use_ai && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                          <Bot size={10} /> AI
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1.5 text-white">{task.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                      <span>{task.category}</span>
                      <span>📍 {task.city}</span>
                      {task.price_suggested && <span className="text-amber-400">💰 {task.price_suggested} ريال</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {task.status === 'in_progress' && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />}
                    {task.status === 'open' && <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
                    {task.status === 'completed' && <CheckCircle size={16} className="text-emerald-500" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
