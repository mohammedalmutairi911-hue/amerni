import { useState, useEffect } from 'react'
import { Zap, MapPin, Clock, ChevronLeft, Plus, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Task } from '../types'

const STATUS_COLOR: Record<string, string> = {
  open: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-secondary-400 bg-secondary-500/10 border-secondary-500/20',
}

export function BountiesPage() {
  const { user } = useAuth()
  const { navigate } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*')
      .eq('status', 'open').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const applyTask = async (task: Task) => {
    if (!user) { navigate('landing'); return }
    setApplying(task.id)
    // استخدام الدالة الآمنة بدل التحديث المباشر — تمنع تعارض قبول نفس الطلب
    // من أكثر من عامل بنفس اللحظة (race condition) وتتحقق من حالة الطلب فعلياً
    const { data, error } = await supabase.rpc('accept_task', {
      p_task_id: task.id,
      p_worker_id: user.id,
      p_worker_price: (task as any).price_suggested || (task as any).client_price || 0,
    })
    if (!error && data === 'ok') {
      setApplied(p => new Set([...p, task.id]))
      setTasks(p => p.filter(t => t.id !== task.id))
    } else {
      // الطلب اتقبل من عامل ثاني قبلك بثوانٍ — حدّث القائمة
      setTasks(p => p.filter(t => t.id !== task.id))
    }
    setApplying(null)
  }

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `منذ ${mins} دقيقة`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `منذ ${hrs} ساعة`
    return `منذ ${Math.floor(hrs/24)} يوم`
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black mb-2">الطلبات المتاحة</h1>
            <p className="text-slate-400">طلبات حية من عملاء ينتظرون — اقبل وابدأ</p>
          </div>
          <button onClick={() => navigate('dashboard')}
            className="flex items-center gap-2 bg-primary-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-400 transition-colors">
            <Plus size={15} /> أضف طلب
          </button>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
          <span className="text-sm text-secondary-400 font-medium">{tasks.length} طلب متاح الآن</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <Zap size={32} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400">ما في طلبات متاحة الآن</p>
            <p className="text-xs text-slate-400 mt-2">اشترك عشان توصلك إشعارات بالطلبات الجديدة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs bg-secondary-500/10 border border-secondary-500/20 text-secondary-400 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-pulse" /> جديد
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{task.category}</span>
                      {task.use_ai && <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5">AI</span>}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2 leading-snug">{task.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {task.city}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(task.created_at)}</span>
                      {task.price_suggested && <span className="text-primary-400 font-medium">💰 {task.price_suggested} ريال</span>}
                    </div>
                  </div>
                  <button onClick={() => applyTask(task)} disabled={applying === task.id || applied.has(task.id)}
                    className="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0 flex items-center gap-1.5">
                    {applying === task.id ? <Loader2 size={14} className="animate-spin" /> : applied.has(task.id) ? <><CheckCircle size={14} /> قبلت</> : <><Zap size={14} /> اقبل</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
