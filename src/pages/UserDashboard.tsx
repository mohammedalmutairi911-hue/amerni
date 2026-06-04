import { useState, useEffect } from 'react'
import { Plus, Sparkles, Clock, CheckCircle, X, Loader2, Bot, MessageSquare, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task } from '../types'
import { Chat } from '../components/chat/Chat'

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

export function UserDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', category: CATEGORIES[0], city: 'الرياض', use_ai: false, budget: ''
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (user) fetchTasks()
  }, [user?.id])

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(full_name)')
      .eq('client_id', user!.id)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const submitTask = async () => {
    if (!form.title.trim()) return
    setSubmitting(true)
    const { data } = await supabase.from('tasks').insert({
      client_id: user!.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      city: form.city,
      use_ai: form.use_ai,
      status: 'open',
      price_suggested: form.budget ? Number(form.budget) : null
    }).select().single()

    if (data) {
      setTasks(p => [data, ...p])
      setForm({ title: '', description: '', category: CATEGORIES[0], city: 'الرياض', use_ai: false, budget: '' })
      setShowNew(false)
    }
    setSubmitting(false)
  }

  const submitRating = async (taskId: string, workerId: string) => {
    if (!rating) return
    await supabase.from('ratings').insert({
      task_id: taskId, worker_id: workerId, rater_id: user!.id, stars: rating
    })
    // Update worker rating
    const { data } = await supabase.from('ratings').select('stars').eq('worker_id', workerId)
    if (data && data.length > 0) {
      const avg = data.reduce((a, b) => a + b.stars, 0) / data.length
      await supabase.from('worker_profiles').update({ rating: avg }).eq('user_id', workerId)
    }
    setRatingDone(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  // Task detail view
  if (selectedTask) return (
    <div className="min-h-screen bg-[#080808] pt-14 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => { setSelectedTask(null); setRating(0); setRatingDone(false) }}
          className="text-sm text-zinc-400 hover:text-white mb-5 flex items-center gap-1">
          ← رجوع للطلبات
        </button>

        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-2">
            <h2 className="font-bold text-lg">{selectedTask.title}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLOR[selectedTask.status]}`}>
              {STATUS_LABEL[selectedTask.status]}
            </span>
          </div>
          <p className="text-zinc-400 text-sm mb-3">{selectedTask.description}</p>
          <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
            <span className="bg-zinc-800 px-2 py-0.5 rounded">{selectedTask.category}</span>
            <span>{selectedTask.city}</span>
            {selectedTask.use_ai && <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">AI</span>}
            {selectedTask.price_suggested && <span className="text-amber-400">ميزانية: {selectedTask.price_suggested} ريال</span>}
          </div>
        </div>

        {/* Rating for completed tasks */}
        {selectedTask.status === 'completed' && selectedTask.worker_id && !ratingDone && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold mb-3">قيّم العامل</h3>
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={24} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
                </button>
              ))}
            </div>
            <button onClick={() => submitRating(selectedTask.id, selectedTask.worker_id!)} disabled={!rating}
              className="bg-amber-500 text-black font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-40">
              إرسال التقييم
            </button>
          </div>
        )}
        {ratingDone && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4 flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle size={16} /> شكراً على تقييمك!
          </div>
        )}

        {/* Chat */}
        {selectedTask.status === 'in_progress' && (
          <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080808] pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">طلباتي</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{tasks.length} طلب</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-amber-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-400 transition-colors">
            <Plus size={16} /> طلب جديد
          </button>
        </div>

        {/* New task modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#111] border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">طلب جديد</h3>
                <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">وش تبي؟ *</label>
                  <input value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="اكتب طلبك بأي كلام..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">تفاصيل إضافية</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="أي تفاصيل تساعد العامل..." rows={2}
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
                      placeholder="مثال: 80"
                      className="flex-1 bg-transparent text-sm outline-none" />
                    <span className="text-zinc-500 text-sm">ريال</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl cursor-pointer" onClick={() => set('use_ai', !form.use_ai)}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.use_ai ? 'bg-purple-500 border-purple-500' : 'border-zinc-600'}`}>
                    {form.use_ai && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1"><Bot size={13} className="text-purple-400" /> أريد حل بالذكاء الاصطناعي</p>
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

        {/* Tasks list */}
        {tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles size={28} className="text-amber-500" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">ما عندك طلبات بعد</h3>
            <p className="text-zinc-500 text-sm mb-6">اكتب أي شيء تحتاجه وابدأ</p>
            <button onClick={() => setShowNew(true)}
              className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors">
              اطلب الحين
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <button key={task.id} onClick={() => setSelectedTask(task)}
                className="w-full bg-[#0d0d0d] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 text-right transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                      {task.use_ai && <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1"><Bot size={10} /> AI</span>}
                    </div>
                    <h3 className="font-semibold mb-1 truncate">{task.title}</h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                      <span>{task.category}</span>
                      {task.price_suggested && <span className="text-amber-400">{task.price_suggested} ريال</span>}
                    </p>
                  </div>
                  {task.status === 'in_progress' && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse mt-2" />
                    </div>
                  )}
                  {task.status === 'in_progress' && (
                    <MessageSquare size={16} className="text-zinc-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
