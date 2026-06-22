import { useState, useEffect } from 'react'
import { Briefcase, TrendingUp, Star, Wifi, WifiOff, Clock, CheckCircle, Zap, Loader2, Calendar, User, MessageSquare, Upload, ArrowRight, DollarSign, BarChart2, Share2, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { requestNotificationPermission, sendLocalNotification, registerServiceWorker } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { Task, WorkerProfile } from '../types'
import { Chat } from '../components/chat/Chat'
import { getAvatar } from '../lib/supabase'

type Tab = 'overview' | 'feed' | 'my-tasks' | 'chat' | 'schedule' | 'profile'

const STATUS_LABEL: Record<string, string> = { open: 'مفتوح', in_progress: 'جاري', pending_confirmation: 'بانتظار تأكيد العميل', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع' }
const STATUS_COLOR: Record<string, string> = {
  open: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-secondary-400 bg-secondary-500/10 border-secondary-500/20',
  cancelled: 'text-zinc-500 bg-zinc-800 border-zinc-700',
  pending_confirmation: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  disputed: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export function WorkerDashboard() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [feedTasks, setFeedTasks] = useState<Task[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState<string>('smart')
  const [searchQ, setSearchQ] = useState('')
  const [toggling, setToggling] = useState(false)
  const [pendingTask, setPendingTask] = useState<Task | null>(null)
  const [showCommission, setShowCommission] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [paymentReminderTask, setPaymentReminderTask] = useState<Task | null>(null)

  useEffect(() => {
    if (user) {
      fetchAll()
      registerServiceWorker()
      // اطلب إذن الإشعارات بعد ثانيتين
      setTimeout(() => requestNotificationPermission(), 2000)
    }
  }, [user?.id])

  const fetchAll = async () => {
    setLoading(true)
    // نجيب الـ profile أولاً عشان الفلتر يشتغل صح
    await fetchWorkerProfile()
    await Promise.all([fetchFeedTasks(), fetchMyTasks()])
    setLoading(false)
  }

  const fetchWorkerProfile = async () => {
    const { data } = await supabase.from('worker_profiles').select('*').eq('user_id', user!.id).maybeSingle()
    if (data) setWorkerProfile(data)
  }

  const fetchFeedTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) console.error('fetchFeedTasks error:', error)
    const newTasks = data || []
    if (feedTasks.length > 0 && newTasks.length > feedTasks.length) {
      sendLocalNotification('أمرني ⚡ طلب جديد!', newTasks[0]?.title || 'جاك طلب جديد يناسب مهاراتك')
    }
    setFeedTasks(newTasks)
  }

  useEffect(() => {
    if (!user || !workerProfile?.is_approved) return
    // Subscribe to new open tasks realtime
    const ch = supabase.channel('new-tasks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: 'status=eq.open' },
        (payload: any) => {
          sendLocalNotification('أمرني ⚡ طلب جديد!', payload.new?.title || 'جاك طلب جديد')
          fetchFeedTasks()
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id, workerProfile?.is_approved])

  const fetchMyTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('worker_id', user!.id)
      .order('created_at', { ascending: false })
    if (error) console.error('fetchMyTasks error:', error)
    setMyTasks(data || [])
  }

  const acceptTask = async (task: Task) => {
    setPendingTask(task)
    setShowCommission(true)
  }

  const confirmAcceptTask = async () => {
    if (!pendingTask) return
    setAccepting(pendingTask.id)
    setShowCommission(false)
    const price = (pendingTask as any).price_suggested || (pendingTask as any).client_price || 0
    const { error } = await supabase.rpc('accept_task', {
      p_task_id: pendingTask.id,
      p_worker_price: price || null,
    })

    if (error) {
      console.error('accept_task error:', error)
      alert('حدث خطأ أثناء قبول الطلب: ' + error.message)
      setAccepting(null)
      setPendingTask(null)
      return
    }

    await fetchFeedTasks()
    await fetchMyTasks()
    setAccepting(null)
    setPendingTask(null)
    setTab('my-tasks')
  }

  const completeTask = async (taskId: string) => {
    // submit_task_completion في الباك اند تتولى كل شي
    await fetchMyTasks()
    await fetchWorkerProfile()
  }

  const submitCompletion = async () => {
    if (!completingTask || !user) return
    setUploadingProof(true)
    const price = completingTask.price_final || completingTask.price_suggested || 0
    // استخدام الدالة الآمنة (security definer) بدل التحديث المباشر —
    // تتحقق من أن العامل فعلاً صاحب المهمة وأن حالتها صحيحة قبل التعديل
    const { data, error } = await supabase.rpc('submit_task_completion', {
      p_task_id: completingTask.id,
      p_price: price,
      p_note: proofNote,
      p_proof_url: proofUrl || null,
    })
    if (error || data !== 'ok') {
      console.error('submit_task_completion failed:', error || data)
    }
    await fetchMyTasks()
    setUploadingProof(false)
    setCompletingTask(null)
    setProofUrl('')
    setProofNote('')
  }

  const toggleOnline = async () => {
    if (!workerProfile) return
    setToggling(true)
    const newStatus = workerProfile.is_online ? 'offline' : 'online'
    await supabase.from('worker_profiles').update({ is_online: !workerProfile.is_online, availability_status: newStatus }).eq('user_id', user!.id)
    setWorkerProfile(p => p ? { ...p, is_online: !p.is_online, availability_status: newStatus } : null)
    setToggling(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <Loader2 className="animate-spin text-primary-400" size={32} />
    </div>
  )

  if (!workerProfile?.is_approved) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center px-4">
      <div className="max-w-sm text-center bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-10">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-5">
          <Clock size={28} className="text-primary-500" />
        </div>
        <h2 className="text-xl font-bold mb-3">طلبك قيد المراجعة</h2>
        <p className="text-zinc-500 text-sm leading-relaxed">فريق أمرني راح يراجع بياناتك ويوافق عليك قريباً. راح تجي لك إشعار فور الموافقة.</p>
      </div>
    </div>
  )

  // Stats
  const completedTasks = myTasks.filter(t => t.status === 'completed')
  const activeTasks = myTasks.filter(t => ['in_progress', 'accepted', 'pending_confirmation'].includes(t.status))
  const totalEarnings = completedTasks.reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)
  const thisMonth = completedTasks.filter(t => new Date(t.created_at).getMonth() === new Date().getMonth()).length

  // Commission modal
  if (showCommission && pendingTask) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-sm bg-[#111] border border-zinc-800 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        {/* Header ثابت */}
        <div className="p-5 pb-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">📋</span>
          </div>
          <h2 className="text-base font-bold text-center mb-1">شروط قبول الطلب</h2>
          <p className="text-zinc-400 text-xs text-center">قبل ما تقبل الطلب، يرجى الموافقة على الشروط التالية:</p>
        </div>

        {/* المحتوى scrollable */}
        <div className="overflow-y-auto flex-1 px-5 pb-3 space-y-3">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 space-y-1">
            <p className="text-sm text-white font-semibold">الطلب: {pendingTask.title}</p>
            {pendingTask.price_suggested && (
              <p className="text-sm text-primary-400">القيمة المتوقعة: {pendingTask.price_suggested} ريال</p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">إقرار وتعهد</p>
            <p className="text-sm text-zinc-300 leading-loose">
              أتعهد أنا العامل المسجل في منصة <span className="text-primary-400 font-bold">أمرني</span> بأنني عند إتمام هذا الطلب بنجاح، سأقوم بتحويل عمولة خدمة بنسبة <span className="text-primary-400 font-bold">2%</span> من إجمالي قيمة العمل المتفق عليه إلى حساب المنصة التالي، وذلك خلال مدة أقصاها <span className="text-white font-medium">٧٢ ساعة</span> من إتمام الطلب.
            </p>
            <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-3 space-y-2 text-sm">
              <p className="text-xs text-zinc-500 font-medium">معلومات الحساب البنكي</p>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">البنك</span>
                <span className="text-white font-medium">بنك البلاد</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">اسم المستفيد</span>
                <span className="text-white font-medium text-xs">مؤسسة حلول الغد للخدمات الإلكترونية</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">رقم الآيبان</span>
                <span className="text-primary-400 font-mono text-xs">SA54150009001465965400007</span>
              </div>
            </div>
            {pendingTask.price_suggested && (
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">العمولة المستحقة</span>
                <span className="text-primary-400 font-bold">{(pendingTask.price_suggested * 0.02).toFixed(2)} ريال</span>
              </div>
            )}
            <p className="text-xs text-zinc-600 leading-relaxed">
              بالضغط على "أوافق وأقبل الطلب" أقر بقراءة هذا التعهد والموافقة عليه، ويُعدّ هذا الإقرار ملزماً قانونياً وفق أنظمة المملكة العربية السعودية.
            </p>
          </div>
        </div>

        {/* الأزرار ثابتة في الأسفل */}
        <div className="flex gap-3 p-5 pt-3 flex-shrink-0 border-t border-zinc-800">
          <button onClick={() => { setShowCommission(false); setPendingTask(null) }}
            className="flex-1 border border-zinc-700 text-zinc-300 py-3 rounded-xl text-sm hover:border-zinc-600 transition-colors">
            إلغاء
          </button>
          <button onClick={confirmAcceptTask}
            className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-primary-400 transition-colors">
            أوافق وأقبل الطلب
          </button>
        </div>
      </div>
    </div>
  )

  const TABS = [
    { id: 'overview', icon: BarChart2, label: 'نظرة عامة' },
    { id: 'feed', icon: Zap, label: 'متاحة', badge: feedTasks.length },
    { id: 'my-tasks', icon: Briefcase, label: 'طلباتي', badge: activeTasks.length },
    { id: 'chat', icon: MessageSquare, label: 'محادثات' },
    { id: 'schedule', icon: Calendar, label: 'جدولي' },
    { id: 'profile', icon: User, label: 'بروفايلي' },
  ]

  return (
    <div className="min-h-screen bg-[#080808] pt-14">

      {/* Payment Reminder Modal - shown after task completed */}
      {paymentReminderTask && (() => {
        const price = (paymentReminderTask as any).price_final || (paymentReminderTask as any).price_suggested || 0
        const commission = (price * 0.02).toFixed(2)
        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-6">
              <div className="w-12 h-12 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-bold text-center mb-1">تذكير تحويل العمولة</h3>
              <p className="text-zinc-400 text-sm text-center mb-5">الطلب اكتمل — يرجى تحويل عمولة المنصة</p>

              {/* Task info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">الطلب</span>
                  <span className="text-white font-medium">{(paymentReminderTask as any).title}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-zinc-800 pt-2">
                  <span className="text-zinc-400">قيمة الطلب</span>
                  <span className="text-white font-bold">{price} ريال</span>
                </div>
                <div className="flex justify-between text-sm border-t border-zinc-800 pt-2">
                  <span className="text-zinc-400">نسبة العمولة</span>
                  <span className="text-primary-400 font-bold">2%</span>
                </div>
                <div className="flex justify-between text-sm border-t border-zinc-800 pt-2 bg-primary-500/10 rounded-lg px-3 py-2 -mx-1">
                  <span className="text-zinc-300 font-medium">المبلغ المستحق تحويله</span>
                  <span className="text-primary-400 font-black text-base">{commission} ريال</span>
                </div>
              </div>

              {/* IBAN info */}
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-5 space-y-3">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">معلومات الحساب البنكي</p>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-zinc-400 text-sm">البنك</span>
                  <span className="text-white font-medium text-sm">بنك البلاد</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-zinc-400 text-sm">اسم المستفيد</span>
                  <span className="text-white font-medium text-xs text-left max-w-[55%]">مؤسسة حلول الغد للخدمات الإلكترونية</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">رقم الآيبان</span>
                  <button onClick={() => navigator.clipboard.writeText('SA54150009001465965400007')}
                    className="text-primary-400 font-mono text-xs hover:text-primary-300 transition-colors flex items-center gap-1">
                    SA54150009001465965400007
                    <Copy size={11} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-600 text-center mb-4">يجب التحويل خلال ٧٢ ساعة من إتمام الطلب وفق الاتفاقية</p>

              <button onClick={() => setPaymentReminderTask(null)}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm transition-colors">
                فهمت — سأقوم بالتحويل
              </button>
            </div>
          </div>
        )
      })()}

      {/* Completion Modal */}
      {completingTask && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-5">
            <h3 className="text-lg font-bold mb-1">إنهاء الطلب</h3>
            <p className="text-zinc-400 text-sm mb-4">أضف ملاحظة أو صورة كدليل على الإنجاز — سيراها العميل قبل التأكيد</p>

            <textarea
              value={proofNote}
              onChange={e => setProofNote(e.target.value)}
              placeholder="ملاحظة للعميل (اختياري): مثال — انتهيت من التوصيل، الطرد موضوع عند الباب"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder-zinc-600 focus:border-primary-500/40 mb-3"
            />

            <input
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="رابط صورة الإنجاز (اختياري) — ارفع الصورة على imgur.com وأرسل الرابط"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none placeholder-zinc-600 focus:border-primary-500/40 mb-4"
            />

            {proofUrl && (
              <img src={proofUrl} alt="دليل الإنجاز" className="w-full h-40 object-cover rounded-xl mb-4 border border-zinc-700" onError={e => (e.currentTarget.style.display='none')} />
            )}

            <div className="flex gap-2">
              <button onClick={() => { setCompletingTask(null); setProofUrl(''); setProofNote('') }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                إلغاء
              </button>
              <button onClick={submitCompletion} disabled={uploadingProof}
                className="flex-1 py-2.5 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {uploadingProof ? <><span className="animate-spin">⏳</span> جاري...</> : '✅ أرسل للعميل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top header */}
      <div className="bg-[#0d0d0d] border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={getAvatar(profile?.full_name || '')} className="w-9 h-9 rounded-xl" alt="" />
            <div>
              <p className="font-semibold text-sm">{profile?.full_name}</p>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Star size={10} className="text-primary-400" />
                {workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—'}
                <span className="mx-1">·</span>
                {workerProfile?.city}
              </div>
            </div>
          </div>
          <button onClick={toggleOnline} disabled={toggling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
              workerProfile?.is_online
                ? 'bg-secondary-500/10 border-secondary-500/30 text-secondary-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}>
            {toggling ? <Loader2 size={14} className="animate-spin" /> : workerProfile?.is_online ? <><Wifi size={14} /> متاح</> : <><WifiOff size={14} /> أوفلاين</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#0d0d0d] border-b border-zinc-800 sticky top-14 z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-0.5 overflow-x-auto">
          {TABS.map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-primary-500 text-primary-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              <Icon size={13} /> {label}
              {badge !== undefined && badge > 0 && (
                <span className="bg-primary-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{badge > 9 ? '9+' : badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'إجمالي المكاسب', value: `${totalEarnings.toLocaleString()} ر`, icon: DollarSign, color: 'text-secondary-400', bg: 'bg-secondary-500/10 border-secondary-500/20' },
                { label: 'طلبات مكتملة', value: completedTasks.length, icon: CheckCircle, color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20' },
                { label: 'جارية الآن', value: activeTasks.length, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'هذا الشهر', value: thisMonth, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`bg-[#0d0d0d] border ${bg.split(' ')[1]} rounded-2xl p-5`}>
                  <div className={`w-9 h-9 rounded-xl ${bg} border flex items-center justify-center mb-3`}>
                    <Icon size={17} className={color} />
                  </div>
                  <div className={`text-2xl font-black mb-1 ${color}`}>{value}</div>
                  <div className="text-xs text-zinc-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Rating card */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">تقييمك</h3>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={16} className={s <= Math.round(workerProfile?.rating || 0) ? 'text-primary-400 fill-primary-400' : 'text-zinc-700'} />
                  ))}
                  <span className="text-primary-400 font-bold text-sm mr-1">{workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—'}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-900 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{completedTasks.length}</div>
                  <div className="text-xs text-zinc-500">مكتمل</div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{activeTasks.length}</div>
                  <div className="text-xs text-zinc-500">جاري</div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{myTasks.filter(t => t.status === 'cancelled').length}</div>
                  <div className="text-xs text-zinc-500">ملغي</div>
                </div>
              </div>
            </div>

            {/* Recent tasks */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">آخر الطلبات</h3>
                <button onClick={() => setTab('my-tasks')} className="text-xs text-primary-400 flex items-center gap-1">الكل <ArrowRight size={12} /></button>
              </div>
              {myTasks.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-6">ما قبلت أي طلب بعد</p>
              ) : myTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-zinc-500">{new Date(task.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <div className="flex items-center gap-2 mr-3">
                    {(task.price_final || task.price_suggested) ? (
                      <span className="text-sm font-bold text-primary-400">{task.price_final || task.price_suggested} ر</span>
                    ) : null}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[task.status]}`}>{STATUS_LABEL[task.status]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">مهاراتي</h3>
              <div className="flex flex-wrap gap-2">
                {(workerProfile?.skills || []).map(s => (
                  <span key={s} className="bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        {tab === 'feed' && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative mb-1">
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="🔍 ابحث في الطلبات..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500/50" />
              {searchQ && <button onClick={() => setSearchQ('')} className="absolute left-3 top-2.5 text-zinc-500 hover:text-white">✕</button>}
            </div>
            {/* Smart filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'smart', label: '⭐ مناسبة لي' },
                { id: 'city', label: `📍 ${workerProfile?.city || 'مدينتي'}` },
                { id: 'all', label: '🌐 كل الطلبات' },
              ].map(f => (
                <button key={f.id} onClick={() => setCityFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${cityFilter === f.id ? 'bg-primary-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {!workerProfile?.is_online && (
              <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-500 mb-2">
                <WifiOff size={15} /> فعّل الأنلاين من الأعلى عشان تظهر للعملاء
              </div>
            )}
            {feedTasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <Zap size={32} className="mx-auto mb-3 opacity-30" />
                <p>ما في طلبات متاحة الحين</p>
              </div>
            ) : feedTasks.filter(t => {
                if (cityFilter === 'all') return true
                if (cityFilter === 'city') return t.city === workerProfile?.city
                if (cityFilter === 'smart') {
                  const cityMatch = !t.city || t.city === workerProfile?.city
                  const skillMatch = !workerProfile?.skills?.length ||
                    workerProfile.skills.some((s: string) =>
                      s.trim() === t.category?.trim()
                    )
                  return cityMatch && skillMatch
                }
                return true
              }).map(task => (
              <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-full px-2 py-0.5">جديد</span>
                      <span className="text-xs text-zinc-500">{task.category}</span>
                      <span className="text-xs text-zinc-500">{task.city}</span>
                      {task.use_ai && <span className="text-xs text-purple-400">AI</span>}
                    </div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                  </div>
                  {task.price_suggested && (
                    <span className="text-primary-400 font-bold text-sm flex-shrink-0">{task.price_suggested} ر</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                  <button onClick={() => acceptTask(task)} disabled={accepting === task.id}
                    className="bg-primary-500 text-white text-sm font-bold px-5 py-1.5 rounded-lg hover:bg-primary-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                    {accepting === task.id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                    اقبل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Tasks */}
        {tab === 'my-tasks' && (
          <div className="space-y-3">
            {myTasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                <p>ما قبلت أي طلب بعد</p>
                <button onClick={() => setTab('feed')} className="text-primary-400 text-sm mt-2">تصفح الطلبات المتاحة ←</button>
              </div>
            ) : myTasks.map(task => (
              <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[task.status]}`}>{STATUS_LABEL[task.status]}</span>
                    </div>
                    <h3 className="font-semibold truncate">{task.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{(task as any).profiles?.full_name} · {new Date(task.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className="text-primary-400 font-bold flex-shrink-0">{task.price_final || task.price_suggested || '—'} ر</span>
                </div>
                <div className="flex gap-2">
                  {['accepted', 'in_progress'].includes(task.status) && (
                    <>
                      <button onClick={() => { setSelectedTask(task); setTab('chat') }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm py-2 rounded-lg transition-colors">
                        <MessageSquare size={14} /> محادثة
                      </button>
                      <button onClick={() => setCompletingTask(task)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-secondary-500/15 hover:bg-secondary-500/25 text-secondary-400 text-sm py-2 rounded-lg border border-secondary-500/20 transition-colors">
                        <Upload size={14} /> أنهيت الطلب
                      </button>
                    </>
                  )}
                  {task.status === 'pending_confirmation' && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500/10 text-yellow-400 text-sm py-2 rounded-lg border border-yellow-500/20">
                      <Clock size={14} /> بانتظار تأكيد العميل
                    </div>
                  )}
                  {task.status === 'completed' && (
                    <button onClick={() => setPaymentReminderTask(task)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-secondary-500/10 text-secondary-400 text-sm py-2 rounded-lg border border-secondary-500/20 hover:bg-secondary-500/20 transition-colors">
                      <CheckCircle size={14} /> مكتمل — عرض تفاصيل العمولة
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        {tab === 'chat' && (
          <div>
            {selectedTask ? (
              <div>
                <button onClick={() => setSelectedTask(null)} className="text-sm text-zinc-400 hover:text-white mb-4 flex items-center gap-1">← رجوع</button>
                <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-500 text-sm mb-4">اختر طلب عشان تفتح المحادثة</p>
                {myTasks.filter(t => ['accepted', 'in_progress'].includes(t.status)).length === 0 ? (
                  <div className="text-center py-16 text-zinc-600">
                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                    <p>ما في محادثات نشطة</p>
                  </div>
                ) : myTasks.filter(t => ['accepted', 'in_progress'].includes(t.status)).map(task => (
                  <button key={task.id} onClick={() => setSelectedTask(task)}
                    className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-xl p-4 text-right hover:border-zinc-700 transition-all">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{(task as any).profiles?.full_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        {tab === 'schedule' && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
            <h2 className="font-bold mb-4">جدول توفرك</h2>
            {workerProfile?.schedule && Object.keys(workerProfile.schedule).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(workerProfile.schedule).map(([day, s]: [string, any]) => (
                  <div key={day} className={`flex items-center justify-between rounded-xl px-4 py-3 ${s.active ? 'bg-primary-500/5 border border-primary-500/20' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                    <span className={`text-sm font-medium ${s.active ? 'text-white' : 'text-zinc-500'}`}>{day}</span>
                    {s.active ? <span className="text-xs text-primary-400">{s.from} — {s.to}</span> : <span className="text-xs text-zinc-600">غير متاح</span>}
                  </div>
                ))}
              </div>
            ) : <p className="text-zinc-500 text-sm">ما في جدول محدد</p>}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-5">
                <img src={getAvatar(profile?.full_name || '')} className="w-16 h-16 rounded-2xl" alt="" />
                <div>
                  <h2 className="text-xl font-bold">{profile?.full_name}</h2>
                  <p className="text-zinc-500 text-sm">{workerProfile?.city} · {workerProfile?.nationality}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={13} className="text-primary-400 fill-primary-400" />
                    <span className="text-sm font-medium">{workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—'}</span>
                    <span className="text-xs text-zinc-600">({completedTasks.length} طلب)</span>
                  </div>
                </div>
              </div>
              {workerProfile?.bio && <p className="text-sm text-zinc-400 leading-relaxed border-t border-zinc-800 pt-4">{workerProfile.bio}</p>}
            </div>

            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">بياناتي</h3>
              <div className="space-y-2.5">
                {[
                  ['الجوال', workerProfile?.phone],
                  ['رقم الهوية', workerProfile?.id_number ? `••••${workerProfile.id_number.slice(-4)}` : '—'],
                  ['التحقق', workerProfile?.id_verified ? '✓ موثق' : '✗ غير موثق'],
                  ['الحالة', workerProfile?.is_approved ? '✓ موافق عليه' : '⏳ قيد المراجعة'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center border-b border-zinc-800/50 pb-2 last:border-0">
                    <span className="text-zinc-500 text-sm">{k}</span>
                    <span className="text-sm font-medium">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-semibold mb-3">مهاراتي</h3>
              <div className="flex flex-wrap gap-2">
                {(workerProfile?.skills || []).map(s => (
                  <span key={s} className="bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
