import { useState, useEffect, useRef } from 'react'
import { Plus, Sparkles, Clock, CheckCircle, Loader2, Bot, MessageSquare, Star, Send, Shield, Unlock, TrendingUp, DollarSign, AlertCircle, ChevronRight, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task } from '../types'
import { NewTaskPage } from './NewTaskPage'

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
const TRACK_STEPS = ['تم النشر', 'عامل قبل', 'جاري التنفيذ', 'اكتمل']
const TASK_STATUS_STEP: Record<string, number> = { open: 1, in_progress: 2, completed: 3, cancelled: 0, disputed: 1 }

const BLOCKED = [/(\+966|00966|05\d{8})/, /[\w.-]+@[\w.-]+\.\w{2,}/, /wa\.me|whatsapp|واتساب|telegram|t\.me/i]

interface Msg { id: string; sender_id: string; content: string; is_blocked: boolean; created_at: string; profiles?: { full_name: string } }

export function UserDashboard() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [blockedWarn, setBlockedWarn] = useState('')
  const [rating, setRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (user) fetchTasks() }, [user?.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const fetchTasks = async () => {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*')
      .or(`client_id.eq.${user!.id},user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const openTask = async (task: Task) => {
    setSelectedTask(task); setRatingDone(false); setRating(0)
    const { data } = await supabase.from('task_messages')
      .select('*, profiles(full_name)').eq('task_id', task.id).order('created_at')
    setMsgs(data || [])
    const ch = supabase.channel(`task-${task.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${task.id}` },
        () => supabase.from('task_messages').select('*, profiles(full_name)').eq('task_id', task.id).order('created_at')
          .then(({ data }) => setMsgs(data || [])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${task.id}` },
        ({ new: u }) => setSelectedTask(u as Task))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }

  const sendMsg = async () => {
    const text = msg.trim()
    if (!text || !user || !selectedTask) return
    if (BLOCKED.some(p => p.test(text))) {
      setBlockedWarn('⛔ لا يمكن مشاركة بيانات تواصل خارجي')
      setTimeout(() => setBlockedWarn(''), 4000); return
    }
    setSending(true)
    await supabase.from('task_messages').insert({ task_id: selectedTask.id, sender_id: user.id, content: text, is_blocked: false })
    setMsg(''); setSending(false)
  }

  const confirmPayment = async () => {
    if (!selectedTask || !user) return
    setConfirmingPayment(true)
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', selectedTask.id)
    await supabase.from('task_messages').insert({ task_id: selectedTask.id, sender_id: user.id, content: '✅ العميل أكد استلام الخدمة وإرسال المبلغ.', is_blocked: false })
    setSelectedTask(p => p ? { ...p, status: 'completed' } : null)
    setConfirmingPayment(false)
  }

  const submitRating = async () => {
    if (!rating || !selectedTask?.worker_id) return
    await supabase.from('ratings').insert({ task_id: selectedTask.id, worker_id: selectedTask.worker_id, rater_id: user!.id, stars: rating })
    setRatingDone(true)
  }

  // Stats
  const totalSpent = tasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)
  const activeCount = tasks.filter(t => t.status === 'in_progress').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  if (showNew) return <NewTaskPage onClose={() => { setShowNew(false); fetchTasks() }} />

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
          className="text-sm text-zinc-400 hover:text-white mb-6 flex items-center gap-1.5 transition-colors">
          ← رجوع للطلبات
        </button>

        {/* Task card */}
        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="font-bold text-lg flex-1 leading-snug">{selectedTask.title}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_COLOR[selectedTask.status]}`}>
              {STATUS_LABEL[selectedTask.status]}
            </span>
          </div>

          {/* Progress tracker */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              {TRACK_STEPS.map((s, i) => {
                const currentStep = TASK_STATUS_STEP[selectedTask.status] || 0
                const done = i < currentStep
                const active = i === currentStep - 1
                return (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      done || active ? 'bg-amber-500 border-amber-500' : 'bg-zinc-800 border-zinc-700'
                    }`}>
                      {done ? <CheckCircle size={12} className="text-black" /> : <div className={`w-2 h-2 rounded-full ${active ? 'bg-black' : 'bg-zinc-600'}`} />}
                    </div>
                    <span className={`text-[10px] text-center ${done || active ? 'text-amber-400' : 'text-zinc-600'}`}>{s}</span>
                  </div>
                )
              })}
            </div>
            <div className="relative h-1 bg-zinc-800 rounded-full mt-1">
              <div className="absolute top-0 right-0 h-1 bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${(TASK_STATUS_STEP[selectedTask.status] / TRACK_STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">{selectedTask.category}</span>
            <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">📍 {selectedTask.city}</span>
            {selectedTask.price_suggested && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">💰 {selectedTask.price_suggested} ريال</span>}
            {selectedTask.price_final && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">✅ {selectedTask.price_final} ريال</span>}
          </div>
        </div>

        {/* Waiting */}
        {selectedTask.status === 'open' && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Clock size={15} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">بانتظار عامل متخصص</p>
              <p className="text-xs text-zinc-500 mt-0.5">سيتم إشعارك فور قبول عامل طلبك</p>
            </div>
          </div>
        )}

        {/* Confirm payment */}
        {selectedTask.status === 'in_progress' && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Unlock size={15} className="text-emerald-400" />
              <h3 className="font-semibold text-sm">تأكيد إتمام الخدمة والدفع</h3>
            </div>
            <p className="text-zinc-400 text-xs mb-4 leading-relaxed">بعد ما تستلم الخدمة وتتأكد من إرسال المبلغ للعامل، اضغط التأكيد لإغلاق الطلب.</p>
            <button onClick={confirmPayment} disabled={confirmingPayment}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {confirmingPayment ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              أكدت استلام الخدمة وإرسال المبلغ
            </button>
          </div>
        )}

        {/* Rating */}
        {selectedTask.status === 'completed' && selectedTask.worker_id && !ratingDone && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Star size={16} className="text-amber-400" /> قيّم العامل</h3>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={28} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
                </button>
              ))}
            </div>
            <button onClick={submitRating} disabled={!rating}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors">
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
                {selectedTask.status === 'open' ? 'المحادثة ستبدأ بعد قبول العامل' : 'لا توجد رسائل بعد'}
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
                  placeholder="اكتب رسالة..." className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600" />
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
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">
              أهلاً {profile?.full_name?.split(' ')[0] || ''} 👋
            </h1>
            <p className="text-zinc-500 text-sm mt-1">وش تحتاج اليوم؟</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-amber-500 text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-400 transition-colors flex-shrink-0">
            <Plus size={16} /> طلب جديد
          </button>
        </div>

        {/* Stats */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'إجمالي المدفوع', value: `${totalSpent} ر`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'طلبات جارية', value: activeCount, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'مكتملة', value: completedCount, icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`border rounded-2xl p-4 text-center ${bg}`}>
                <Icon size={18} className={`${color} mx-auto mb-2`} />
                <div className={`text-xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-zinc-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Active task highlight */}
        {activeCount > 0 && (
          <div className="mb-5">
            {tasks.filter(t => t.status === 'in_progress').slice(0, 1).map(task => (
              <button key={task.id} onClick={() => openTask(task)}
                className="w-full bg-blue-500/5 border-2 border-blue-500/30 rounded-2xl p-5 text-right hover:border-blue-500/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> طلب جاري الآن
                  </span>
                  <ChevronRight size={16} className="text-zinc-500" />
                </div>
                <h3 className="font-bold text-white">{task.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">اضغط للمحادثة وتتبع التقدم</p>
              </button>
            ))}
          </div>
        )}

        {/* Filter */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <Filter size={14} className="text-zinc-600 flex-shrink-0" />
            {[
              { v: 'all', l: `الكل (${tasks.length})` },
              { v: 'open', l: 'بانتظار عامل' },
              { v: 'in_progress', l: 'جاري' },
              { v: 'completed', l: 'مكتملة' },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setFilter(v as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filter === v ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Tasks list */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {filter === 'all' ? 'ما عندك طلبات بعد' : `ما في طلبات ${STATUS_LABEL[filter] || ''}`}
            </h3>
            <p className="text-zinc-500 text-sm mb-8">اكتب أي شيء تحتاجه وعامل يقبله في ثواني</p>
            <button onClick={() => setShowNew(true)}
              className="bg-amber-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-amber-400 transition-colors">
              اطلب الحين
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <button key={task.id} onClick={() => openTask(task)}
                className="w-full bg-[#0d0d0d] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 text-right transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                      {task.use_ai && <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1"><Bot size={10} /> AI</span>}
                    </div>
                    <h3 className="font-semibold mb-1.5 text-white leading-snug">{task.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                      <span>{task.category} · {task.city}</span>
                      {(task.price_final || task.price_suggested) && (
                        <span className="text-amber-400">💰 {task.price_final || task.price_suggested} ريال</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 mt-1">
                    {task.status === 'in_progress' && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />}
                    {task.status === 'open' && <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
                    {task.status === 'completed' && <CheckCircle size={16} className="text-emerald-500" />}
                    <ChevronRight size={15} className="text-zinc-600" />
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
