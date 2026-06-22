import { useState, useEffect, useRef } from 'react'
import { Plus, Sparkles, Clock, CheckCircle, Loader2, Bot, MessageSquare, Star, Send, Shield, Unlock, TrendingUp, DollarSign, AlertCircle, ChevronRight, Filter, Zap, MapPin, Search, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Task } from '../types'
import { NewTaskPage } from './NewTaskPage'
import { Chat } from '../components/chat/Chat'

const STATUS_LABEL: Record<string, string> = {
  open: 'بانتظار عامل', in_progress: 'جاري التنفيذ', pending_confirmation: 'بانتظار تأكيدك', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع'
}
const STATUS_COLOR: Record<string, string> = {
  open: 'text-primary-500 bg-primary-500/10 border-primary-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-secondary-400 bg-secondary-500/10 border-secondary-500/20',
  cancelled: 'text-slate-400 bg-slate-100 border-slate-300',
  pending_confirmation: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  disputed: 'text-red-400 bg-red-500/10 border-red-500/20',
}
const TRACK_STEPS = ['تم النشر', 'عامل قبل', 'جاري', 'اكتمل']
const TASK_STATUS_STEP: Record<string, number> = { open: 1, in_progress: 2, pending_confirmation: 3, completed: 4, cancelled: 0, disputed: 1 }
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

  const [workerName, setWorkerName] = useState<string>('')
  const channelRef = useRef<any>(null)

  const openTask = async (task: Task) => {
    setSelectedTask(task); setRatingDone(false); setRating(0); setMsgs([]); setWorkerName('')

    // جيب الرسائل
    const { data: msgData } = await supabase
      .from('task_messages')
      .select('id, sender_id, content, is_system_message, is_filtered, created_at')
      .eq('task_id', task.id)
      .order('created_at')
    setMsgs(msgData || [])

    // جيب اسم العامل
    if (task.worker_id) {
      const { data: wp } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', task.worker_id)
        .maybeSingle()
      if (wp?.full_name) setWorkerName(wp.full_name)
    }

    // أغلق الـ channel القديم
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    // اشترك في التحديثات
    const ch = supabase.channel(`task-${task.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'task_messages',
        filter: `task_id=eq.${task.id}`
      }, () => supabase.from('task_messages')
          .select('id, sender_id, content, is_system_message, is_filtered, created_at')
          .eq('task_id', task.id).order('created_at')
          .then(({ data }) => setMsgs(data || [])))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tasks',
        filter: `id=eq.${task.id}`
      }, ({ new: u }) => setSelectedTask(u as Task))
      .subscribe()
    channelRef.current = ch
  }

  const sendMsg = async () => {
    const text = msg.trim()
    if (!text || !user || !selectedTask) return
    if (BLOCKED.some(p => p.test(text))) { setBlockedWarn('⛔ لا يمكن مشاركة بيانات تواصل'); setTimeout(() => setBlockedWarn(''), 4000); return }
    setSending(true)
    await supabase.from('task_messages').insert({
      task_id: selectedTask.id,
      sender_id: user.id,
      content: text,
      is_system_message: false,
    })
    setMsg(''); setSending(false)
  }

  const confirmPayment = async () => {
    if (!selectedTask || !user) return
    setConfirmingPayment(true)
    // المنطق كله في الباك اند — لا أسعار ولا عمولات في الفرونت
    const { error } = await supabase.rpc('confirm_task_completion', {
      p_task_id: selectedTask.id
    })
    if (error) {
      console.error('confirm error:', error)
      setConfirmingPayment(false)
      return
    }
    setSelectedTask(p => p ? { ...p, status: 'completed' } : null)
    setConfirmingPayment(false)
  }

  const submitRating = async () => {
    if (!rating || !selectedTask?.worker_id) return
    // التقييم وتحديث المتوسط وإشعار العامل — كلها في الباك اند
    const { error } = await supabase.rpc('rate_worker', {
      p_task_id: selectedTask.id,
      p_stars: rating
    })
    if (!error) setRatingDone(true)
  }

  const totalSpent = tasks.filter(t => t.status === 'completed').reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)
  const activeCount = tasks.filter(t => ['in_progress', 'pending_confirmation'].includes(t.status)).length
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const openCount = tasks.filter(t => t.status === 'open').length

  const filteredTasks = tasks.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter
    const matchSearch = !search || t.title.includes(search) || t.category?.includes(search)
    return matchFilter && matchSearch
  })

  if (showNew) return <NewTaskPage onClose={() => { setShowNew(false); fetchTasks() }} />

  if (loading) return (
    <div className="min-h-screen bg-slate-50 pt-14 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )

  // Task detail
  if (selectedTask) return (
    <div className="min-h-screen bg-slate-50 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => { setSelectedTask(null); fetchTasks() }}
          className="text-sm text-slate-500 hover:text-slate-900 mb-6 flex items-center gap-1.5 transition-colors">
          ← رجوع
        </button>

        {/* Task card */}
        <div className="bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-slate-200 rounded-2xl p-6 mb-4">
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
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${done || active ? 'bg-primary-500 border-primary-500' : 'bg-white border-slate-300'}`}>
                      {done ? <CheckCircle size={13} className="text-slate-900" /> : <div className={`w-2 h-2 rounded-full ${active ? 'bg-black' : 'bg-zinc-600'}`} />}
                    </div>
                    <span className={`text-[10px] text-center font-medium ${done || active ? 'text-primary-500' : 'text-slate-400'}`}>{s}</span>
                  </div>
                )
              })}
            </div>
            <div className="relative h-1.5 bg-slate-100 rounded-full">
              <div className="absolute top-0 right-0 h-1.5 bg-gradient-to-l from-primary-400 to-primary-600 rounded-full transition-all duration-700"
                style={{ width: `${((TASK_STATUS_STEP[selectedTask.status] || 0) / TRACK_STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-slate-100/80 text-slate-700 px-3 py-1.5 rounded-full font-medium">{selectedTask.category}</span>
            <span className="bg-slate-100/80 text-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1"><MapPin size={10} /> {selectedTask.city}</span>
            {selectedTask.price_suggested && <span className="bg-primary-500/10 text-primary-500 border border-primary-500/20 px-3 py-1.5 rounded-full font-medium">💰 {selectedTask.price_suggested} ريال</span>}
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
              <p className="text-xs text-slate-400 mt-0.5">فريق أمرني راح يراجع الطلب ويتواصل معك</p>
            </div>
          </div>
        )}

        {/* Waiting */}
        {selectedTask.status === 'open' && (
          <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-primary-500 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-primary-300">جاري البحث عن عامل مناسب</p>
                <p className="text-xs text-slate-400 mt-0.5">عادةً خلال 5–15 دقيقة — سنشعرك فور القبول</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['⚡','طلبك وصل للعمال'],['🔔','ستجيك إشعار فور القبول'],['💬','محادثة تفتح تلقائياً']].map(([e,t]) => (
                <div key={t} className="bg-primary-500/5 rounded-xl p-2.5">
                  <div className="text-lg mb-1">{e}</div>
                  <p className="text-xs text-slate-400 leading-tight">{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worker accepted - in_progress */}
        {selectedTask.status === 'in_progress' && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-lg font-bold text-blue-300">
                {workerName ? workerName[0] : '👷'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-300">
                  {workerName || 'العامل'} يعمل على طلبك
                </p>
                <p className="text-xs text-slate-400 mt-0.5">تواصل معه عبر المحادثة أدناه</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-yellow-400 font-bold">⭐ موثّق</div>
                <div className="text-xs text-slate-400 mt-0.5">هوية سعودية</div>
              </div>
            </div>
          </div>
        )}

        {/* Dispute button */}
        {selectedTask.status === 'in_progress' && (
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2">⚠️ في حال وجود مشكلة مع العامل</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400 leading-relaxed">إذا لم يُنجز العامل الطلب أو حدث خلاف، يمكنك رفع نزاع — فريق أمرني سيراجع المحادثة ويتواصل معك خلال 24 ساعة.</p>
              <button onClick={async () => {
                if (confirm('هل تريد رفع نزاع؟ سيراجع فريق أمرني المحادثة ويتواصل معك خلال 24 ساعة.')) {
                  await supabase.rpc('raise_dispute', { p_task_id: selectedTask.id })
                  setSelectedTask(p => p ? { ...p, status: 'disputed' } : null)
                }
              }} className="flex-shrink-0 text-xs text-red-400 border border-red-900/50 px-3 py-2 rounded-lg hover:bg-red-950/30 transition-colors whitespace-nowrap">
                رفع نزاع
              </button>
            </div>
          </div>
        )}

        {/* Confirm payment - triggered when worker marks pending_confirmation */}
        {selectedTask.status === 'pending_confirmation' && (
          <div className="bg-gradient-to-br from-secondary-950/30 to-[#0d0d0d] border border-secondary-500/30 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-secondary-500/20 flex items-center justify-center"><CheckCircle size={15} className="text-secondary-400" /></div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">🏁 العامل أنهى الطلب — راجع وأكد</h3>
                <p className="text-xs text-slate-400">تحقق من الإنجاز ثم أكد الاستلام</p>
              </div>
            </div>
            {(selectedTask as any).completion_proof && (
              <div className="mb-3">
                <p className="text-xs text-slate-400 mb-2">صورة الإنجاز:</p>
                <img src={(selectedTask as any).completion_proof} alt="إنجاز" className="w-full rounded-xl border border-slate-300 max-h-48 object-cover" />
              </div>
            )}
            {(selectedTask as any).completion_note && (
              <div className="bg-white rounded-xl px-4 py-3 mb-3 text-sm text-slate-700 border border-slate-200">
                <p className="text-xs text-slate-400 mb-1">ملاحظة العامل:</p>
                {(selectedTask as any).completion_note}
              </div>
            )}
            <button onClick={confirmPayment} disabled={confirmingPayment}
              className="w-full bg-secondary-500 hover:bg-secondary-600 disabled:opacity-50 text-slate-900 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {confirmingPayment ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              ✅ استلمت الخدمة وأؤكد الإنجاز
            </button>
          </div>
        )}

        {/* Mutual rating — client rates worker */}
        {selectedTask.status === 'completed' && selectedTask.worker_id && !ratingDone && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Star size={16} className="text-primary-500" /> قيّم تجربتك</h3>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                  <Star size={30} className={s <= rating ? 'text-primary-500 fill-primary-400' : 'text-slate-300 hover:text-slate-400'} />
                </button>
              ))}
            </div>
            <button onClick={submitRating} disabled={!rating}
              className="bg-primary-500 hover:bg-primary-700 text-slate-900 font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-colors">
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
        {['in_progress', 'pending_confirmation', 'completed'].includes(selectedTask.status) && (
          <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
        )}
        {selectedTask.status === 'open' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
            <MessageSquare size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">المحادثة تبدأ بعد قبول مقدم الخدمة</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-14">
      {/* Hero header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">مرحباً بك</p>
              <h1 className="text-2xl font-black text-slate-900 mb-1">
                {profile?.full_name || 'عميل آمرني المميز'}
              </h1>
              <p className="text-slate-500 text-sm">ملخص نشاطك — تتبع طلباتك الحالية، ورصيد محفظتك، واكتشف الخدمات الأكثر طلباً اليوم.</p>
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-primary-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all shadow-sm">
              <Plus size={16} /> طلب خدمة جديدة
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'إجمالي الطلبات', value: tasks.length, color: 'text-slate-900' },
              { label: 'بانتظار مقدم', value: openCount, color: 'text-primary-500' },
              { label: 'الطلبات النشطة', value: activeCount, color: 'text-blue-500' },
              { label: 'مكتملة', value: completedCount, color: 'text-secondary-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                <div className={`text-2xl font-black ${color}`}>{value}</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Payment history */}
        {completedCount > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-secondary-500" /> الطلبات السابقة
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tasks.filter(t => t.status === 'completed').map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className="text-secondary-400 font-bold text-sm mr-3">
                    {t.price_final || t.price_suggested || '—'} ر
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-400">الإجمالي</span>
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
                  <ChevronRight size={14} className="text-slate-400 mr-auto" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{task.title}</h3>
                <p className="text-xs text-slate-400">اضغط للمحادثة مع العامل وتتبع التقدم</p>
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
              <p className="text-xs text-slate-400">إجمالي ما دفعته</p>
              <p className="text-xl font-black text-secondary-400">{totalSpent.toLocaleString()} ريال</p>
            </div>
            <button onClick={() => navigate('referral')} className="mr-auto text-xs text-primary-500 border border-primary-500/20 px-3 py-1.5 rounded-full hover:bg-primary-500/10 transition-colors">
              🎁 اكسب من الإحالة
            </button>
          </div>
        )}

        {/* Search + Filter */}
        {tasks.length > 0 && (
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في طلباتك..."
                className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-sm outline-none focus:border-primary-500/40 transition-colors placeholder-slate-400" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter size={12} className="text-slate-400 flex-shrink-0" />
              {[
                { v: 'all', l: `الكل (${tasks.length})` },
                { v: 'open', l: `⏳ بانتظار (${openCount})` },
                { v: 'in_progress', l: `🔵 جاري (${activeCount})` },
                { v: 'completed', l: `✅ مكتمل (${completedCount})` },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setFilter(v as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${filter === v ? 'bg-primary-500 text-slate-900' : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks list */}
        {filteredTasks.length === 0 ? (
          <div className="py-10">
            {!search ? (
              <div className="space-y-4">
                {/* Welcome card */}
                <div className="bg-gradient-to-br from-primary-500/10 to-transparent border border-primary-500/20 rounded-2xl p-6 text-center mb-6">
                  <div className="text-4xl mb-3">👋</div>
                  <h3 className="text-xl font-bold mb-2">أهلاً — اطلب أي شيء</h3>
                  <p className="text-slate-500 text-sm mb-5 max-w-xs mx-auto leading-relaxed">
                    عامل موثّق بهويته السعودية سيقبل طلبك في دقائق
                  </p>
                  <button onClick={() => setShowNew(true)}
                    className="bg-primary-500 text-slate-900 font-bold px-8 py-3.5 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
                    اطلب الحين
                  </button>
                </div>

                {/* How it works steps */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { e: '✍️', t: 'اكتب طلبك', d: 'أي شيء تحتاجه' },
                    { e: '⚡', t: 'عامل يقبل', d: 'عادةً خلال 5-15 دقيقة' },
                    { e: '✅', t: 'أكّد الإنجاز', d: 'لما ينتهي تأكّد' },
                  ].map(({ e, t, d }) => (
                    <div key={t} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-2">{e}</div>
                      <p className="text-sm font-semibold text-slate-900">{t}</p>
                      <p className="text-xs text-slate-400 mt-1">{d}</p>
                    </div>
                  ))}
                </div>

                {/* Trust badges */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-3 text-center">لماذا أمرني آمنة؟</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['🆔','كل عامل موثّق بهوية وطنية'],
                      ['🔒','تواصلك داخل المنصة فقط'],
                      ['⭐','تقييمات حقيقية من عملاء'],
                      ['🛡️','دعم مباشر عند أي مشكلة'],
                    ].map(([e, t]) => (
                      <div key={t as string} className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{e}</span><span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-slate-400">ما في نتائج — جرّب كلمة بحث ثانية</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map(task => (
              <button key={task.id} onClick={() => openTask(task)}
                className="w-full bg-white border border-slate-200/60 hover:border-slate-300 rounded-2xl p-5 text-right transition-all hover:shadow-lg hover:shadow-black/30 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                      {task.use_ai && <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1"><Bot size={9} /> AI</span>}
                    </div>
                    <h3 className="font-bold mb-1.5 text-slate-900 leading-snug group-hover:text-primary-50 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                      <span className="flex items-center gap-1"><MapPin size={10} /> {task.city}</span>
                      {task.category && <span className="bg-slate-100 px-2 py-0.5 rounded-full">{task.category}</span>}
                      {(task.price_final || task.price_suggested) && <span className="text-primary-500 font-medium">💰 {task.price_final || task.price_suggested} ريال</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-center gap-2 mt-1">
                    {task.status === 'in_progress' && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />}
                    {task.status === 'open' && <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse" />}
                    {task.status === 'completed' && <CheckCircle size={16} className="text-secondary-500" />}
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* تاريخ المدفوعات */}
        {tasks.filter(t => t.status === 'completed' && (t.price_final || t.price_suggested)).length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <DollarSign size={14} className="text-secondary-500" /> تاريخ المدفوعات
            </h3>
            <div className="space-y-2">
              {tasks.filter(t => t.status === 'completed' && (t.price_final || t.price_suggested)).map(t => (
                <div key={t.id} className="flex items-center justify-between bg-white border border-slate-200/50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm text-slate-900 truncate max-w-[200px]">{t.title}</p>
                    <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className="text-secondary-400 font-bold text-sm">{t.price_final || t.price_suggested} ريال</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-slate-400">الإجمالي</span>
                <span className="text-secondary-400 font-black">{totalSpent.toLocaleString()} ريال</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTAs */}
        <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-slate-200">
          <button onClick={() => navigate('browse')}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 py-3 rounded-xl text-sm text-slate-500 hover:text-slate-900 transition-all">
            👥 تصفح العمال
          </button>
          <button onClick={() => navigate('bounties')}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 py-3 rounded-xl text-sm text-slate-500 hover:text-slate-900 transition-all">
            ⚡ الطلبات المتاحة
          </button>
        </div>
      </div>
    </div>
  )
}
