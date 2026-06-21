import { useState, useEffect, useRef } from 'react'
import { Plus, Sparkles, Clock, CheckCircle, Loader2, Bot, MessageSquare, Star, Send, Shield, Unlock, TrendingUp, DollarSign, AlertCircle, ChevronRight, Filter, Zap, MapPin, Search, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Task } from '../types'
import { NewTaskPage } from './NewTaskPage'

const STATUS_LABEL: Record<string, string> = {
  open: 'بانتظار عامل', in_progress: 'جاري التنفيذ', pending_confirmation: 'بانتظار تأكيدك', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع'
}
const STATUS_COLOR: Record<string, string> = {
  open: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-secondary-400 bg-secondary-500/10 border-secondary-500/20',
  cancelled: 'text-zinc-500 bg-zinc-800 border-zinc-700',
  pending_confirmation: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  disputed: 'text-red-400 bg-red-500/10 border-red-500/20',
}
const TRACK_STEPS = ['تم النشر', 'عامل قبل', 'جاري', 'اكتمل']
const TASK_STATUS_STEP: Record<string, number> = { open: 1, in_progress: 2, completed: 4, cancelled: 0, disputed: 1 }
const BLOCKED = [/(\+966|00966|05\d{8})/, /[\w.-]+@[\w.-]+\.\w{2,}/, /wa\.me|whatsapp|واتساب|telegram|t\.me/i]
interface Msg { id: string; sender_id: string; content: string; is_blocked: boolean; created_at: string; profiles?: { full_name: string } }

export function UserDashboard() {
  const { user, profile } = useAuth()
  const { navigate } = useApp()
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
  const [filter, setFilter] = useState<'all'|'open'|'in_progress'|'completed'>('all')
  const [search, setSearch] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (user) fetchTasks() }, [user?.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('tasks').select('*')
      .or(`client_id.eq.${user!.id},user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
    if (!error) setTasks(data || [])
    setLoading(false)
  }

  const openTask = async (task: Task) => {
    setSelectedTask(task); setRatingDone(false); setRating(0)
    const { data } = await supabase.from('task_messages').select('*, profiles(full_name)').eq('task_id', task.id).order('created_at')
    setMsgs(data || [])
    const ch = supabase.channel(`task-${task.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${task.id}` },
        () => supabase.from('task_messages').select('*, profiles(full_name)').eq('task_id', task.id).order('created_at').then(({ data }) => setMsgs(data || [])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${task.id}` },
        ({ new: u }) => setSelectedTask(u as Task))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }

  const sendMsg = async () => {
    const text = msg.trim()
    if (!text || !user || !selectedTask) return
    if (BLOCKED.some(p => p.test(text))) { setBlockedWarn('⛔ لا يمكن مشاركة بيانات تواصل'); setTimeout(() => setBlockedWarn(''), 4000); return }
    setSending(true)
    await supabase.from('task_messages').insert({ task_id: selectedTask.id, sender_id: user.id, content: text, is_blocked: false })
    setMsg(''); setSending(false)
  }

  const confirmPayment = async () => {
    if (!selectedTask || !user) return
    setConfirmingPayment(true)
    const price = (selectedTask as any).price_final || (selectedTask as any).price_suggested || 0
    const commission = (price * 0.02).toFixed(2)
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', selectedTask!.id)
    // Confirm message
    await supabase.from('task_messages').insert({
      task_id: selectedTask.id, sender_id: user.id,
      content: '✅ العميل أكد استلام الخدمة — الطلب مكتمل.',
      is_blocked: false
    })
    // Commission reminder message to worker
    if (price > 0) {
      await supabase.from('task_messages').insert({
        task_id: selectedTask.id, sender_id: user.id,
        content: '💰 تذكير للعامل: يرجى تحويل عمولة المنصة (' + commission + ' ريال = 2% من ' + price + ' ريال) إلى حساب أمرني — IBAN: SA54150009001465965400007 | بنك البلاد | مؤسسة حلول الغد — خلال ٧٢ ساعة.',
        is_blocked: false
      })
    }
    // Notify worker
    if (selectedTask.worker_id) {
      await supabase.from('notifications').insert({
        user_id: selectedTask.worker_id,
        title: 'تم تأكيد استلام الخدمة ✅',
        body: 'العميل أكد الاستلام — لا تنسَ تحويل العمولة (' + commission + ' ريال) خلال ٧٢ ساعة',
        type: 'payment_reminder',
      })
    }
    setSelectedTask(p => p ? { ...p, status: 'completed' } : null)
    setConfirmingPayment(false)
  }

  const submitRating = async () => {
    if (!rating || !selectedTask?.worker_id) return
    await supabase.from('ratings').insert({ task_id: selectedTask.id, worker_id: selectedTask.worker_id, rater_id: user!.id, stars: rating })
    // إشعار العامل بالتقييم
    try {
      await supabase.from('notifications').insert({
        user_id: selectedTask.worker_id,
        title: `⭐ حصلت على تقييم ${rating} نجوم!`,
        body: `العميل قيّمك على طلب: ${selectedTask.title}`
      })
    } catch {
      // فشل الإشعار لا يجب أن يمنع إتمام التقييم نفسه
    }
    setRatingDone(true)
  }

  const totalSpent = tasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)
  const activeCount = tasks.filter(t => t.status === 'in_progress').length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const openCount = tasks.filter(t => t.status === 'open').length

  const filteredTasks = tasks.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter
    const matchSearch = !search || t.title.includes(search) || t.category?.includes(search)
    return matchFilter && matchSearch
  })

  if (showNew) return <NewTaskPage onClose={() => { setShowNew(false); fetchTasks() }} />

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-600 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )

  // Task detail
  if (selectedTask) return (
    <div className="min-h-screen bg-[#080808] pt-14">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => { setSelectedTask(null); fetchTasks() }}
          className="text-sm text-zinc-400 hover:text-white mb-6 flex items-center gap-1.5 transition-colors">
          ← رجوع
        </button>

        {/* Task card */}
        <div className="bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-5">
            <h2 className="font-bold text-xl flex-1 leading-snug">{selectedTask.title}</h2>
            <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold flex-shrink-0 ${STATUS_COLOR[selectedTask.status]}`}>
              {STATUS_LABEL[selectedTask.status]}
            </span>
          </div>

          {/* Track steps */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              {TRACK_STEPS.map((s, i) => {
                const cur = TASK_STATUS_STEP[selectedTask.status] || 0
                const done = i < cur; const active = i === cur - 1
                return (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${done || active ? 'bg-primary-500 border-primary-500' : 'bg-zinc-900 border-zinc-700'}`}>
                      {done ? <CheckCircle size={13} className="text-white" /> : <div className={`w-2 h-2 rounded-full ${active ? 'bg-black' : 'bg-zinc-600'}`} />}
                    </div>
                    <span className={`text-[10px] text-center font-medium ${done || active ? 'text-primary-400' : 'text-zinc-600'}`}>{s}</span>
                  </div>
                )
              })}
            </div>
            <div className="relative h-1.5 bg-zinc-800 rounded-full">
              <div className="absolute top-0 right-0 h-1.5 bg-gradient-to-l from-primary-400 to-primary-600 rounded-full transition-all duration-700"
                style={{ width: `${((TASK_STATUS_STEP[selectedTask.status] || 0) / TRACK_STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-zinc-800/80 text-zinc-300 px-3 py-1.5 rounded-full font-medium">{selectedTask.category}</span>
            <span className="bg-zinc-800/80 text-zinc-300 px-3 py-1.5 rounded-full flex items-center gap-1"><MapPin size={10} /> {selectedTask.city}</span>
            {selectedTask.price_suggested && <span className="bg-primary-500/10 text-primary-400 border border-primary-500/20 px-3 py-1.5 rounded-full font-medium">💰 {selectedTask.price_suggested} ريال</span>}
          </div>
        </div>

        {/* Disputed */}
        {selectedTask.status === 'disputed' && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-sm">⚠️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">نزاع قيد المراجعة</p>
              <p className="text-xs text-zinc-500 mt-0.5">فريق أمرني راح يراجع الطلب ويتواصل معك</p>
            </div>
          </div>
        )}

        {/* Waiting */}
        {selectedTask.status === 'open' && (
          <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-primary-400 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-primary-300">جاري البحث عن عامل مناسب</p>
                <p className="text-xs text-zinc-500 mt-0.5">سيتم إشعارك فور قبول عامل طلبك</p>
              </div>
            </div>
          </div>
        )}

        {/* Dispute button */}
        {selectedTask.status === 'in_progress' && (
          <div className="flex justify-end mb-2">
            <button onClick={async () => {
              if (confirm('هل تريد رفع نزاع لهذا الطلب؟ سيتم إشعار فريق أمرني للمراجعة.')) {
                await supabase.from('tasks').update({ status: 'disputed' }).eq('id', selectedTask.id)
                await supabase.from('notifications').insert({
                  user_id: selectedTask.worker_id,
                  title: '⚠️ تم رفع نزاع',
                  body: `العميل رفع نزاع على طلب: ${selectedTask.title}`
                })
                setSelectedTask(p => p ? { ...p, status: 'disputed' } : null)
              }
            }} className="text-xs text-red-400 border border-red-900/50 px-3 py-1.5 rounded-lg hover:bg-red-950/30 transition-colors">
              ⚠️ رفع نزاع
            </button>
          </div>
        )}

        {/* Confirm payment - triggered when worker marks pending_confirmation */}
        {selectedTask.status === 'pending_confirmation' && (
          <div className="bg-gradient-to-br from-secondary-950/30 to-[#0d0d0d] border border-secondary-500/30 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-secondary-500/20 flex items-center justify-center"><CheckCircle size={15} className="text-secondary-400" /></div>
              <div>
                <h3 className="font-bold text-sm text-white">🏁 العامل أنهى الطلب — راجع وأكد</h3>
                <p className="text-xs text-zinc-500">تحقق من الإنجاز ثم أكد الاستلام</p>
              </div>
            </div>
            {(selectedTask as any).completion_proof && (
              <div className="mb-3">
                <p className="text-xs text-zinc-500 mb-2">صورة الإنجاز:</p>
                <img src={(selectedTask as any).completion_proof} alt="إنجاز" className="w-full rounded-xl border border-zinc-700 max-h-48 object-cover" />
              </div>
            )}
            {(selectedTask as any).completion_note && (
              <div className="bg-zinc-900 rounded-xl px-4 py-3 mb-3 text-sm text-zinc-300 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">ملاحظة العامل:</p>
                {(selectedTask as any).completion_note}
              </div>
            )}
            <button onClick={confirmPayment} disabled={confirmingPayment}
              className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {confirmingPayment ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              ✅ استلمت الخدمة وأؤكد الإنجاز
            </button>
          </div>
        )}

        {/* Mutual rating — client rates worker */}
        {selectedTask.status === 'completed' && selectedTask.worker_id && !ratingDone && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Star size={16} className="text-primary-400" /> قيّم تجربتك</h3>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                  <Star size={30} className={s <= rating ? 'text-primary-400 fill-primary-400' : 'text-zinc-700 hover:text-zinc-500'} />
                </button>
              ))}
            </div>
            <button onClick={submitRating} disabled={!rating}
              className="bg-primary-500 hover:bg-primary-400 text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors">
              إرسال التقييم
            </button>
          </div>
        )}
        {ratingDone && (
          <div className="bg-secondary-500/10 border border-secondary-500/20 rounded-xl p-4 mb-4 flex items-center gap-2 text-secondary-400">
            <CheckCircle size={16} /> <span className="font-medium">شكراً! تقييمك يساعد العمال الآخرين</span>
          </div>
        )}

        {/* Chat */}
        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/30">
            <span className="font-semibold text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center"><MessageSquare size={14} className="text-primary-500" /></div>
              المحادثة مع العامل
            </span>
            <span className="text-xs text-zinc-600 flex items-center gap-1.5"><Shield size={11} className="text-secondary-500" /> محمية بالكامل</span>
          </div>
          <div className="h-72 overflow-y-auto px-4 py-4 space-y-2.5">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
                <MessageSquare size={28} className="text-zinc-700" />
                <p className="text-zinc-600 text-sm">{selectedTask.status === 'open' ? 'المحادثة تبدأ بعد قبول العامل' : 'لا توجد رسائل'}</p>
              </div>
            )}
            {msgs.map(m => {
              const isMe = m.sender_id === user?.id
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[78%]">
                    {!isMe && <p className="text-[11px] text-zinc-500 mb-1 mr-1">{m.profiles?.full_name}</p>}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'bg-primary-500 text-white rounded-tr-sm font-medium' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
          {blockedWarn && <div className="mx-3 mb-2 px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-xl text-sm text-red-400 flex items-center gap-2"><AlertCircle size={13} /> {blockedWarn}</div>}
          {selectedTask.status === 'in_progress' && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 focus-within:border-primary-500/40 transition-colors">
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                  placeholder="اكتب رسالة للعامل..." className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600" />
                <button onClick={sendMsg} disabled={!msg.trim() || sending} className="w-8 h-8 rounded-lg bg-primary-500 hover:bg-primary-400 disabled:opacity-30 flex items-center justify-center transition-all">
                  {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
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
      {/* Hero header */}
      <div className="bg-gradient-to-b from-primary-500/5 to-transparent border-b border-zinc-900/50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black mb-1">
                أهلاً {profile?.full_name?.split(' ')[0] || ''} 👋
              </h1>
              <p className="text-zinc-500 text-sm">وش تحتاج اليوم؟</p>
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-primary-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/20">
              <Plus size={16} /> طلب جديد
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'إجمالي الطلبات', value: tasks.length, color: 'text-white' },
              { label: 'بانتظار عامل', value: openCount, color: 'text-primary-400' },
              { label: 'جارية', value: activeCount, color: 'text-blue-400' },
              { label: 'مكتملة', value: completedCount, color: 'text-secondary-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0d0d0d] border border-zinc-800/50 rounded-2xl p-3.5 text-center">
                <div className={`text-2xl font-black ${color}`}>{value}</div>
                <div className="text-[10px] text-zinc-500 mt-1 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Payment history */}
        {completedCount > 0 && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-secondary-400" /> تاريخ المدفوعات
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tasks.filter(t => t.status === 'completed').map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{t.title}</p>
                    <p className="text-xs text-zinc-500">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className="text-secondary-400 font-bold text-sm mr-3">
                    {t.price_final || t.price_suggested || '—'} ر
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs text-zinc-500">الإجمالي</span>
              <span className="text-secondary-400 font-black">{totalSpent.toLocaleString()} ريال</span>
            </div>
          </div>
        )}

        {/* Active task highlight */}
        {activeCount > 0 && (
          <div className="mb-5">
            {tasks.filter(t => t.status === 'in_progress').slice(0, 1).map(task => (
              <button key={task.id} onClick={() => openTask(task)}
                className="w-full bg-gradient-to-r from-blue-950/40 to-[#0d0d0d] border border-blue-500/20 rounded-2xl p-5 text-right hover:border-blue-500/40 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-xs font-bold text-blue-400">طلب جاري الآن</span>
                  <ChevronRight size={14} className="text-zinc-600 mr-auto" />
                </div>
                <h3 className="font-bold text-white mb-1">{task.title}</h3>
                <p className="text-xs text-zinc-500">اضغط للمحادثة مع العامل وتتبع التقدم</p>
              </button>
            ))}
          </div>
        )}

        {/* Spent summary */}
        {completedCount > 0 && (
          <div className="flex items-center gap-3 bg-secondary-500/5 border border-secondary-500/15 rounded-2xl px-5 py-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign size={18} className="text-secondary-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">إجمالي ما دفعته</p>
              <p className="text-xl font-black text-secondary-400">{totalSpent.toLocaleString()} ريال</p>
            </div>
            <button onClick={() => navigate('referral')} className="mr-auto text-xs text-primary-400 border border-primary-500/20 px-3 py-1.5 rounded-full hover:bg-primary-500/10 transition-colors">
              🎁 اكسب من الإحالة
            </button>
          </div>
        )}

        {/* Search + Filter */}
        {tasks.length > 0 && (
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في طلباتك..."
                className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none focus:border-primary-500/40 transition-colors placeholder-zinc-600" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter size={12} className="text-zinc-600 flex-shrink-0" />
              {[
                { v: 'all', l: `الكل (${tasks.length})` },
                { v: 'open', l: `⏳ بانتظار (${openCount})` },
                { v: 'in_progress', l: `🔵 جاري (${activeCount})` },
                { v: 'completed', l: `✅ مكتمل (${completedCount})` },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setFilter(v as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${filter === v ? 'bg-primary-500 text-white' : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks list */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles size={32} className="text-primary-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">{search ? 'ما في نتائج' : 'ما عندك طلبات بعد'}</h3>
            <p className="text-zinc-500 text-sm mb-8 max-w-xs mx-auto">
              {search ? 'جرب كلمة بحث ثانية' : 'اكتب أي شيء تحتاجه وعامل يقبله في ثواني'}
            </p>
            {!search && (
              <button onClick={() => setShowNew(true)}
                className="bg-primary-500 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-primary-400 transition-colors shadow-lg shadow-primary-500/20">
                اطلب الحين
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map(task => (
              <button key={task.id} onClick={() => openTask(task)}
                className="w-full bg-[#0d0d0d] border border-zinc-800/60 hover:border-zinc-700 rounded-2xl p-5 text-right transition-all hover:shadow-lg hover:shadow-black/30 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                      {task.use_ai && <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1"><Bot size={9} /> AI</span>}
                    </div>
                    <h3 className="font-bold mb-1.5 text-white leading-snug group-hover:text-primary-50 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {task.city}</span>
                      {task.category && <span className="bg-zinc-800 px-2 py-0.5 rounded-full">{task.category}</span>}
                      {(task.price_final || task.price_suggested) && <span className="text-primary-400 font-medium">💰 {task.price_final || task.price_suggested} ريال</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-center gap-2 mt-1">
                    {task.status === 'in_progress' && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />}
                    {task.status === 'open' && <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />}
                    {task.status === 'completed' && <CheckCircle size={16} className="text-secondary-500" />}
                    <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* تاريخ المدفوعات */}
        {tasks.filter(t => t.status === 'completed' && (t.price_final || t.price_suggested)).length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-secondary-500" /> تاريخ المدفوعات
            </h3>
            <div className="space-y-2">
              {tasks.filter(t => t.status === 'completed' && (t.price_final || t.price_suggested)).map(t => (
                <div key={t.id} className="flex items-center justify-between bg-[#0d0d0d] border border-zinc-800/50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm text-white truncate max-w-[200px]">{t.title}</p>
                    <p className="text-xs text-zinc-500">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className="text-secondary-400 font-bold text-sm">{t.price_final || t.price_suggested} ريال</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-zinc-500">الإجمالي</span>
                <span className="text-secondary-400 font-black">{totalSpent.toLocaleString()} ريال</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTAs */}
        <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-zinc-900">
          <button onClick={() => navigate('browse')}
            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 py-3 rounded-xl text-sm text-zinc-400 hover:text-white transition-all">
            👥 تصفح العمال
          </button>
          <button onClick={() => navigate('bounties')}
            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 py-3 rounded-xl text-sm text-zinc-400 hover:text-white transition-all">
            ⚡ الطلبات المتاحة
          </button>
        </div>
      </div>
    </div>
  )
}
