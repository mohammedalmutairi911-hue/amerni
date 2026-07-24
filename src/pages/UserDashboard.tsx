import { useState, useEffect, useRef } from 'react'
import { Plus, CheckCircle, Clock, Loader2, Star, Home, List, Wallet, LogOut, Zap, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { goHome } from '../lib/homePage'
import { Task } from '../types'
import { NewTaskPage } from './NewTaskPage'
import { Chat } from '../components/chat/Chat'
import { NotificationBell } from '../components/ui/NotificationBell'
import { useToast } from '../components/Toast'

const STATUS_LABEL: Record<string, string> = {
  open: 'بانتظار مقدم خدمة',
  in_progress: 'قيد التنفيذ',
  pending_confirmation: 'بانتظار تأكيدك ⚡',
  completed: 'مكتمل ✅',
  cancelled: 'ملغي',
  disputed: 'نزاع ⚠️',
}
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-50 text-blue-600 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
  pending_confirmation: 'bg-purple-50 text-purple-600 border-purple-200',
  completed: 'bg-green-50 text-green-600 border-green-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  disputed: 'bg-red-50 text-red-600 border-red-200',
}

const QUICK_SERVICES = [
  { icon: '🚗', label: 'توصيل' },
  { icon: '📸', label: 'تصوير' },
  { icon: '🛍️', label: 'تسوق' },
  { icon: '📚', label: 'تعليم' },
  { icon: '⚖️', label: 'استشارات' },
  { icon: '🎉', label: 'تنسيق حفلات' },
  { icon: '🤝', label: 'مساعدة إدارية' },
  { icon: '✨', label: 'أخرى' },
]

export function UserDashboard() {
  const { user, profile, signOut } = useAuth()
  const { navigate } = useApp()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [activeSection, setActiveSection] = useState<'dashboard' | 'orders' | 'wallet'>('dashboard')

  // Task detail states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [workerName, setWorkerName] = useState('')
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false)
  const channelRef = useRef<any>(null)
  // مصدر الحقيقة الوحيد لأرقام لوحة الفرد — نفس الطبقة المركزية المستخدمة في لوحة الإدارة
  const [centralStats, setCentralStats] = useState<Record<string, any> | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const statsChannelRef = useRef<any>(null)

  const fetchStats = async () => {
    setStatsLoading(true)
    const { data, error } = await supabase.rpc('get_client_dashboard_stats')
    if (error) console.error('[UserDashboard] central stats:', error)
    else setCentralStats(data)
    setStatsLoading(false)
  }

  useEffect(() => { if (user) { fetchTasks(); fetchStats() } }, [user?.id])

  // تحديث فوري: أي تغيير على طلبات هذا المستخدم يعيد حساب الأرقام مباشرة
  // بدون Refresh أو إعادة تسجيل دخول
  useEffect(() => {
    if (!user) return
    try {
      const ch = supabase.channel(`client-stats-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchTasks(); fetchStats()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings', filter: `rater_id=eq.${user.id}` }, fetchStats)
        .subscribe()
      statsChannelRef.current = ch
    } catch (e) { console.warn('Stats realtime not available:', e) }
    return () => {
      try { if (statsChannelRef.current) supabase.removeChannel(statsChannelRef.current) } catch {}
      statsChannelRef.current = null
    }
  }, [user?.id])

  // تنظيف قناة الـ realtime عند إزالة المكوّن — بدونها تتسرّب القنوات
  // إذا انتقل المستخدم لصفحة أخرى والطلب مفتوح
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*')
      .or(`client_id.eq.${user!.id},user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const openTask = async (task: Task) => {
    setSelectedTask(task)
    setRatingDone(false)
    setRating(0)
    setWorkerName('')
    setShowReceipt(task.status === 'completed')

    if (task.worker_id) {
      const { data: wp } = await supabase.from('profiles_public').select('full_name').eq('id', task.worker_id).maybeSingle()
      if (wp?.full_name) setWorkerName(wp.full_name)
    }

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel(`task-${task.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${task.id}` },
        ({ new: u }) => setSelectedTask(u as Task))
      .subscribe()
    channelRef.current = ch
  }

  const closeTask = () => {
    setSelectedTask(null)
    setShowReceipt(false)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  const confirmPayment = async (taskId: string) => {
    setConfirmingPayment(true)
    const { error } = await supabase.rpc('confirm_task_completion', { p_task_id: taskId })
    if (error) {
      toast('خطأ: ' + error.message, 'error')
    } else {
      await fetchTasks()
      // لو الطلب مفتوح في التفاصيل — نحدثه ونعرض الفاتورة
      if (selectedTask?.id === taskId) {
        setSelectedTask(p => p ? { ...p, status: 'completed' } : null)
        setShowReceipt(true)
      }
    }
    setConfirmingPayment(false)
  }

  const submitRating = async () => {
    if (!rating || !selectedTask?.worker_id) return
    const { error } = await supabase.rpc('rate_worker', { p_task_id: selectedTask.id, p_stars: rating })
    if (!error) setRatingDone(true)
  }

  // قوائم العرض (البطاقات نفسها) — تُبنى من الطلبات المحمّلة
  const activeTasks = tasks.filter(t => ['in_progress', 'pending_confirmation'].includes(t.status))
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const openTasks = tasks.filter(t => t.status === 'open')
  const allActiveTasks = [...activeTasks, ...openTasks]

  // الأرقام المعروضة — من الطبقة المركزية حصراً (مطابقة تماماً للوحة الإدارة)
  const counts = {
    open: centralStats?.tasks_open ?? openTasks.length,
    inProgress: centralStats?.tasks_active ?? tasks.filter(t => t.status === 'in_progress').length,
    pendingConfirmation: centralStats?.tasks_pending_confirmation ?? tasks.filter(t => t.status === 'pending_confirmation').length,
    completed: centralStats?.tasks_completed ?? completedTasks.length,
    cancelled: centralStats?.tasks_cancelled ?? tasks.filter(t => t.status === 'cancelled').length,
    total: centralStats?.tasks_total ?? tasks.length,
  }
  const totalSpent = centralStats?.spent_total ?? completedTasks.reduce((s, t) => s + (t.price_final || 0), 0)

  if (showNew) return <NewTaskPage onClose={() => { setShowNew(false); fetchTasks() }} />

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )

  // ══════════════════════════════════
  // TASK DETAIL VIEW
  // ══════════════════════════════════
  if (selectedTask) return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
        <button onClick={closeTask} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          ← رجوع
        </button>
        <h2 className="font-bold text-slate-900 text-sm truncate max-w-[60%] text-center">{selectedTask.title}</h2>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${STATUS_COLOR[selectedTask.status]}`}>
          {STATUS_LABEL[selectedTask.status]}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* فاتورة — تظهر لما الطلب مكتمل */}
        {(showReceipt || selectedTask.status === 'completed') && (
          <div className="bg-white border-2 border-green-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-green-500 px-6 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={30} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-white">اكتملت الخدمة! 🎉</h3>
              <p className="text-green-100 text-sm">شكراً لاستخدامك آمرني</p>
            </div>
            <div className="p-5">
              <div className="space-y-2 text-sm mb-4">
                {[
                  ['الخدمة', selectedTask.title],
                  ['مقدم الخدمة', workerName || '—'],
                  ['التصنيف', selectedTask.category || '—'],
                  ['التاريخ', new Date(selectedTask.created_at).toLocaleDateString('ar-SA')],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-900 font-medium">{v}</span>
                    <span className="text-slate-400">{k}</span>
                  </div>
                ))}
                {(selectedTask.price_final || selectedTask.price_suggested) && (
                  <>
                    <div className="flex justify-between py-1.5 border-t-2 border-slate-200 mt-2 pt-3">
                      <span className="font-black text-slate-900 text-base">{selectedTask.price_final || selectedTask.price_suggested} ر.س</span>
                      <span className="text-slate-500">قيمة الخدمة</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{((selectedTask.price_final || selectedTask.price_suggested || 0) * 0.02).toFixed(2)} ر.س</span>
                      <span>عمولة المنصة 2% (على العامل)</span>
                    </div>
                  </>
                )}
              </div>

              {/* تقييم */}
              {!ratingDone ? (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-sm font-bold text-slate-700 mb-2 text-center">قيّم مقدم الخدمة</p>
                  <div className="flex gap-1 mb-3 justify-center">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star size={32} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <button onClick={submitRating} className="w-full bg-amber-400 text-slate-900 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-500 transition-colors">
                      إرسال التقييم
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-3 bg-green-50 rounded-xl">
                  <p className="text-green-600 font-bold">✅ شكراً على تقييمك!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* بانتظار العامل */}
        {selectedTask.status === 'open' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={20} className="text-blue-500 animate-pulse flex-shrink-0" />
              <div>
                <p className="font-bold text-blue-700">جاري البحث عن مقدم خدمة</p>
                <p className="text-xs text-blue-500 mt-0.5">عادةً خلال 5–15 دقيقة</p>
              </div>
            </div>
          </div>
        )}

        {/* جاري التنفيذ */}
        {selectedTask.status === 'in_progress' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-lg flex-shrink-0">
                {workerName ? workerName[0] : '👷'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-700">{workerName || 'المقدم'} يعمل على طلبك</p>
                <p className="text-xs text-amber-500 mt-0.5">تواصل معه عبر المحادثة أدناه</p>
              </div>
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">✓ موثق</span>
            </div>
          </div>
        )}

        {/* التفاوض على السعر + تأكيد الاستلام */}
        {selectedTask.status === 'pending_confirmation' && (
          <div className="space-y-3">
            {/* عرض السعر المقترح */}
            {(selectedTask as any).worker_price_offer && (selectedTask as any).negotiation_status === 'pending' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                <p className="font-bold text-amber-700 mb-1">💰 مقدم الخدمة اقترح سعراً</p>
                <p className="text-4xl font-black text-amber-600 my-3">{(selectedTask as any).worker_price_offer} <span className="text-lg">ريال</span></p>
                {(selectedTask as any).price_offer_note && (
                  <p className="text-sm text-amber-600 mb-4 bg-amber-100 rounded-xl p-3">{(selectedTask as any).price_offer_note}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={async () => {
                    const { error } = await supabase.rpc('reject_price', { p_task_id: selectedTask.id })
                    if (!error) setSelectedTask(p => p ? { ...p, negotiation_status: 'rejected' } as any : null)
                  }} className="flex-1 border-2 border-red-300 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors">
                    ❌ رفض
                  </button>
                  <button onClick={async () => {
                    const { error } = await supabase.rpc('accept_price', { p_task_id: selectedTask.id })
                    if (!error) setSelectedTask(p => p ? { ...p, negotiation_status: 'accepted', price_final: (p as any).worker_price_offer } as any : null)
                  }} className="flex-1 bg-secondary-500 text-white font-bold py-3 rounded-xl hover:bg-secondary-600 transition-colors">
                    ✅ موافق
                  </button>
                </div>
              </div>
            )}

            {/* تأكيد الاستلام */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="font-bold text-purple-700 mb-1">المقدم أكمل الطلب</p>
              <p className="text-sm text-purple-500 mb-4">راجع العمل وأكّد الاستلام</p>
              {selectedTask.completion_proof && (
                <div className="mb-4 p-3 bg-white rounded-xl border border-purple-100">
                  <p className="text-xs text-slate-500 mb-2">إثبات الإنجاز:</p>
                  {selectedTask.completion_proof.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                    <img src={selectedTask.completion_proof} alt="إثبات" loading="lazy" className="w-full rounded-lg max-h-48 object-cover" />
                  ) : (
                    <a href={selectedTask.completion_proof} target="_blank" rel="noreferrer"
                      className="text-primary-500 text-sm underline">📎 عرض الملف المرفق</a>
                  )}
                  {(selectedTask as any).completion_note && (
                    <p className="text-sm text-slate-600 mt-2">{(selectedTask as any).completion_note}</p>
                  )}
                </div>
              )}
              <button onClick={() => confirmPayment(selectedTask.id)} disabled={confirmingPayment}
                className="w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                {confirmingPayment ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                تأكيد استلام الخدمة
              </button>
            </div>
          </div>
        )}

        {/* نزاع */}
        {selectedTask.status === 'in_progress' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 leading-relaxed">مشكلة في الخدمة؟ فريق آمرني يراجع خلال 24 ساعة</p>
              <button onClick={() => setShowDisputeConfirm(true)}
                className="flex-shrink-0 text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 whitespace-nowrap">
                رفع نزاع
              </button>
            </div>
          </div>
        )}

        {/* المحادثة */}
        {['in_progress', 'pending_confirmation', 'completed'].includes(selectedTask.status) && (
          <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
        )}
      </div>

      {/* Dispute Confirmation Modal */}
      {showDisputeConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3 text-2xl">⚠️</div>
              <h3 className="text-lg font-black text-slate-900 mb-1">رفع نزاع؟</h3>
              <p className="text-sm text-slate-500 leading-relaxed">سيراجع فريق أمرني الطلب ويتواصل معك خلال 24 ساعة</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDisputeConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                إلغاء
              </button>
              <button onClick={async () => {
                setShowDisputeConfirm(false)
                await supabase.rpc('raise_dispute', { p_task_id: selectedTask.id })
                setSelectedTask(p => p ? { ...p, status: 'disputed' } : null)
                toast('تم رفع النزاع — سيتواصل معك الفريق قريباً', 'info')
              }} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors">
                نعم، ارفع النزاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════
  // MAIN DASHBOARD
  // ══════════════════════════════════
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" dir="rtl">

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col h-screen fixed right-0 border-l border-slate-200 bg-slate-900 w-64 z-50">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <button onClick={() => goHome(navigate, profile)} className="text-xl font-black text-amber-400 hover:opacity-80 transition-opacity">آمرني</button>
          <NotificationBell />
        </div>

        <div className="px-4 py-5 flex flex-col items-center border-b border-slate-800">
          <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-2xl mb-2 border-2 border-amber-400">
            {profile?.full_name?.[0] || '؟'}
          </div>
          <p className="text-white font-bold text-sm">{profile?.full_name || 'مستخدم'}</p>
          <p className="text-slate-400 text-xs mt-0.5">عميل آمرني</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'dashboard', icon: Home, label: 'لوحة التحكم', badge: 0 },
            { id: 'orders', icon: List, label: 'طلباتي', badge: counts.total },
            { id: 'wallet', icon: Wallet, label: 'المحفظة', badge: 0 },
          ].map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setActiveSection(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                activeSection === id ? 'bg-amber-400 text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon size={17} />
              <span className="flex-1 text-right">{label}</span>
              {badge > 0 && <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${activeSection === id ? 'bg-slate-900 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>{badge > 9 ? '9+' : badge}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setShowNew(true)}
            className="w-full bg-amber-400 text-slate-900 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors text-sm">
            <Plus size={16} /> طلب خدمة جديدة
          </button>
          <button onClick={async () => { await signOut(); navigate('landing') }} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-red-400 transition-colors text-sm">
            <LogOut size={15} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:mr-64 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
          <button onClick={() => goHome(navigate, profile)} className="text-lg font-black text-amber-400">آمرني</button>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 bg-amber-400 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-sm">
              <Plus size={14} /> طلب جديد
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-5xl mx-auto">

          {/* DASHBOARD TAB */}
          {activeSection === 'dashboard' && (
            <>
              {/* Welcome */}
              <div className="mb-6">
                <p className="text-slate-500 text-sm font-medium">مرحباً بك 👋</p>
                <h1 className="text-3xl font-black text-slate-900 mt-0.5">{profile?.full_name?.split(' ')[0] || 'عزيزي العميل'}</h1>
                <p className="text-slate-400 text-sm mt-1">تتبع طلباتك الحالية واكتشف الخدمات المتاحة</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'إجمالي الطلبات', value: counts.total, color: 'text-slate-900', bg: 'bg-white' },
                  { label: 'نشطة', value: counts.open + counts.inProgress + counts.pendingConfirmation, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'بانتظار تأكيدك', value: counts.pendingConfirmation, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'مكتملة', value: counts.completed, color: 'text-green-600', bg: 'bg-green-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} border border-slate-200 rounded-2xl p-4 shadow-sm`}>
                    {statsLoading && !centralStats
                      ? <div className="h-9 w-12 bg-slate-200 rounded-lg animate-pulse" />
                      : <div className={`text-3xl font-black ${color}`}>{value}</div>}
                    <div className="text-xs text-slate-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Pending confirmation alert */}
              {tasks.filter(t => t.status === 'pending_confirmation').length > 0 && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-purple-700">⚡ يوجد طلب بانتظار تأكيدك!</p>
                    <p className="text-xs text-purple-500 mt-0.5">مقدم الخدمة أكمل العمل — راجع وأكّد</p>
                  </div>
                  <button onClick={() => openTask(tasks.find(t => t.status === 'pending_confirmation')!)}
                    className="flex-shrink-0 bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-purple-600 transition-colors">
                    راجع الآن
                  </button>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 space-y-5">
                  {/* Active Tasks */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">الطلبات الحالية</h3>
                      <button onClick={() => setActiveSection('orders')} className="text-primary-500 text-sm font-semibold">عرض الكل ←</button>
                    </div>
                    {allActiveTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <Zap size={28} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm mb-3">ما في طلبات نشطة</p>
                        <button onClick={() => setShowNew(true)} className="bg-primary-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-primary-700">
                          اطلب الآن
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allActiveTasks.slice(0, 3).map(task => (
                          <button key={task.id} onClick={() => openTask(task)}
                            className="w-full flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 hover:border-primary-500/30 transition-all text-right">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                              task.status === 'pending_confirmation' ? 'bg-purple-100' :
                              task.status === 'in_progress' ? 'bg-amber-100' : 'bg-blue-100'
                            }`}>
                              {task.status === 'pending_confirmation' ? '✅' : task.status === 'in_progress' ? '⚡' : '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{task.title}</p>
                              <p className="text-xs text-slate-400">{STATUS_LABEL[task.status]}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Services */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2 font-medium">خدمات سريعة</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {QUICK_SERVICES.map(({ icon, label }) => (
                        <button key={label} onClick={() => setShowNew(true)}
                          className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-primary-500 hover:shadow-md transition-all group">
                          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{icon}</div>
                          <p className="text-xs font-semibold text-slate-700 leading-tight">{label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right - History */}
                <div className="md:col-span-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4">آخر الطلبات</h3>
                    {tasks.slice(0, 5).map((t, i) => (
                      <button key={t.id} onClick={() => openTask(t)}
                        className="w-full flex gap-3 items-start py-3 border-b border-slate-100 last:border-0 text-right hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          t.status === 'completed' ? 'bg-green-400' :
                          t.status === 'pending_confirmation' ? 'bg-purple-400' :
                          t.status === 'in_progress' ? 'bg-amber-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{STATUS_LABEL[t.status]}</p>
                        </div>
                        {(t.price_final || t.price_suggested) && (
                          <p className="text-xs font-bold text-slate-600 flex-shrink-0">{t.price_final || t.price_suggested} ر.س</p>
                        )}
                      </button>
                    ))}
                    {tasks.length === 0 && (
                      <p className="text-slate-400 text-sm text-center py-6">لا توجد طلبات بعد</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Promo */}
              <div className="mt-5 rounded-2xl p-6 bg-gradient-to-l from-slate-900 to-primary-500 flex items-center justify-between gap-4">
                <div>
                  <span className="inline-block bg-amber-400 text-slate-900 font-black text-xs px-2.5 py-0.5 rounded-full mb-2">عرض خاص</span>
                  <h2 className="text-xl font-black text-white mb-1">راحتك هي غايتنا</h2>
                  <p className="text-white/70 text-sm">خصم ٢٠٪ على أول ٣ طلبات — كود: AMERNI20</p>
                </div>
                <button onClick={() => setShowNew(true)} className="flex-shrink-0 bg-white text-slate-900 font-bold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors text-sm">
                  استخدمه
                </button>
              </div>
            </>
          )}

          {/* ORDERS TAB */}
          {activeSection === 'orders' && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-black text-slate-900">طلباتي</h2>
                <button onClick={() => setShowNew(true)} className="bg-primary-500 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-700 flex items-center gap-1.5">
                  <Plus size={14} /> جديد
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
                  <Zap size={40} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">ما سويت أي طلب بعد</p>
                  <button onClick={() => setShowNew(true)} className="bg-primary-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-primary-700">اطلب الآن</button>
                </div>
              ) : (
                <>
                  {/* Pending confirmation first */}
                  {tasks.filter(t => t.status === 'pending_confirmation').length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-purple-600 mb-2">⚡ تحتاج تأكيدك</p>
                      <div className="space-y-2">
                        {tasks.filter(t => t.status === 'pending_confirmation').map(task => (
                          <button key={task.id} onClick={() => openTask(task)}
                            className="w-full bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 text-right hover:bg-purple-100 transition-colors flex items-center gap-3">
                            <div className="text-2xl">✅</div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-900">{task.title}</p>
                              <p className="text-sm text-purple-600 font-medium">المقدم أكمل — اضغط للتأكيد</p>
                            </div>
                            <ChevronRight size={18} className="text-purple-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All tasks grouped */}
                  {['in_progress','open','completed','cancelled','disputed'].map(status => {
                    const filtered = tasks.filter(t => t.status === status)
                    if (filtered.length === 0) return null
                    return (
                      <div key={status} className="mb-5">
                        <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">{STATUS_LABEL[status]?.replace(' ✅','').replace(' ⚡','').replace(' ⚠️','')}</p>
                        <div className="space-y-2">
                          {filtered.map(task => (
                            <button key={task.id} onClick={() => openTask(task)}
                              className="w-full bg-white border border-slate-200 hover:border-primary-500/40 rounded-2xl p-4 text-right hover:shadow-sm transition-all flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${STATUS_COLOR[task.status].split(' ')[0]}`}>
                                {task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '⚡' : task.status === 'cancelled' ? '❌' : task.status === 'disputed' ? '⚠️' : '📦'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 truncate">{task.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {task.category && <span className="text-xs text-slate-400">{task.category}</span>}
                                  {task.city && <span className="text-xs text-slate-400">• {task.city}</span>}
                                  {(task.price_final || task.price_suggested) && <span className="text-xs font-bold text-primary-500">• {task.price_final || task.price_suggested} ر.س</span>}
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">{new Date(task.created_at).toLocaleDateString('ar-SA')}</p>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}

          {/* WALLET TAB */}
          {activeSection === 'wallet' && (
            <>
              <h2 className="text-2xl font-black text-slate-900 mb-5">المحفظة</h2>
              <div className="bg-gradient-to-l from-primary-500 to-primary-700 rounded-2xl p-6 text-white mb-5 shadow-lg">
                <p className="text-blue-100 text-sm mb-1">إجمالي ما صرفته</p>
                <p className="text-4xl font-black">{totalSpent.toLocaleString()} <span className="text-xl">ر.س</span></p>
                <p className="text-blue-100 text-xs mt-2">على {counts.completed} طلب مكتمل</p>
              </div>

              {/* Referral */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
                <h3 className="font-bold text-slate-900 mb-1">🎁 ادعُ أصدقاءك</h3>
                <p className="text-slate-500 text-sm mb-3">شارك رابط الدعوة واكسب مكافأة على كل طلب يكملونه</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-slate-600 font-mono truncate">
                    amerniksa.com?ref={user?.id?.slice(0,8)}
                  </div>
                  <button onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`https://amerniksa.com?ref=${user?.id?.slice(0,8)}`)
                      toast('✅ تم نسخ الرابط!', 'success')
                    } catch {
                      toast('تعذّر النسخ — انسخ الرابط يدوياً', 'error')
                    }
                  }} className="bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-500 transition-colors flex-shrink-0">
                    نسخ
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">سجل المدفوعات</h3>
                {completedTasks.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">لا توجد مدفوعات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {completedTasks.map(t => (
                      <button key={t.id} onClick={() => openTask(t)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-right">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{t.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">{t.price_final || t.price_suggested || '—'} <span className="text-xs font-normal text-slate-400">ر.س</span></p>
                          <p className="text-xs text-green-500">مكتمل</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 right-0 w-full flex justify-around items-center h-16 bg-slate-900 border-t border-slate-800 z-50 mobile-bottom-nav">
        {[
          { id: 'dashboard', icon: Home, label: 'الرئيسية' },
          { id: 'orders', icon: List, label: 'طلباتي', badge: counts.pendingConfirmation },
          { id: 'wallet', icon: Wallet, label: 'المحفظة' },
        ].map(({ id, icon: Icon, label, badge }: any) => (
          <button key={id} onClick={() => setActiveSection(id as any)}
            className={`flex flex-col items-center gap-1 px-4 py-1 relative transition-all ${activeSection === id ? 'text-amber-400' : 'text-slate-500'}`}>
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
            {badge > 0 && <span className="absolute top-0 right-2 w-4 h-4 bg-purple-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">{badge}</span>}
          </button>
        ))}
        <button onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center gap-1 px-4 py-1 text-red-500 transition-all">
          <LogOut size={20} />
          <span className="text-[10px] font-medium">خروج</span>
        </button>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <LogOut size={22} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">تسجيل الخروج؟</h3>
              <p className="text-sm text-slate-500">راح تحتاج تسجّل دخول مرة ثانية</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors">
                إلغاء
              </button>
              <button onClick={async () => { setShowLogoutConfirm(false); await signOut(); navigate('landing') }}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors">
                خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
