import { useState, useEffect } from 'react'
import { Star, Clock, CheckCircle, Zap, Loader2, MessageSquare, Upload, DollarSign, Home, List, Calendar, User, LogOut, MapPin, Copy, Wifi, WifiOff, BarChart2, Briefcase, TrendingUp, Plus, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { requestNotificationPermission, sendLocalNotification, registerServiceWorker } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { Task, WorkerProfile } from '../types'
import { Chat } from '../components/chat/Chat'
import { useToast } from '../components/Toast'

const STATUS_LABEL: Record<string, string> = { open: 'مفتوح', in_progress: 'جاري', pending_confirmation: 'بانتظار تأكيد العميل', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع' }
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-50 text-blue-600 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
  pending_confirmation: 'bg-purple-50 text-purple-600 border-purple-200',
  completed: 'bg-green-50 text-green-600 border-green-200',
  cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
  disputed: 'bg-red-50 text-red-600 border-red-200',
}

export function WorkerDashboard() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState<'overview' | 'feed' | 'my-tasks' | 'chat' | 'profile'>('overview')
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [feedTasks, setFeedTasks] = useState<Task[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [pendingTask, setPendingTask] = useState<Task | null>(null)
  const [showCommission, setShowCommission] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [priceOffer, setPriceOffer] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [cityFilter, setCityFilter] = useState('smart')

  useEffect(() => {
    if (user) {
      fetchAll()
      registerServiceWorker()
      setTimeout(() => requestNotificationPermission(), 2000)
    }
  }, [user?.id])

  const fetchAll = async () => {
    setLoading(true)
    await fetchWorkerProfile()
    await Promise.all([fetchFeedTasks(), fetchMyTasks()])
    setLoading(false)
  }

  const fetchWorkerProfile = async () => {
    const { data } = await supabase.from('worker_profiles').select('*').eq('user_id', user!.id).maybeSingle()
    if (data) setWorkerProfile(data)
  }

  const fetchFeedTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(50)
    setFeedTasks(data || [])
  }

  const fetchMyTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('worker_id', user!.id).order('created_at', { ascending: false })
    setMyTasks(data || [])
  }

  useEffect(() => {
    if (!user || !workerProfile?.is_approved) return
    const ch = supabase.channel('new-tasks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: 'status=eq.open' },
        (payload: any) => { sendLocalNotification('أمرني ⚡', payload.new?.title || 'طلب جديد'); fetchFeedTasks() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id, workerProfile?.is_approved])

  const acceptTask = (task: Task) => { setPendingTask(task); setShowCommission(true) }

  const confirmAcceptTask = async () => {
    if (!pendingTask) return
    setAccepting(pendingTask.id); setShowCommission(false)
    const { error } = await supabase.rpc('accept_task', {
      p_task_id: pendingTask.id,
      p_worker_price: (pendingTask as any).price_suggested || null,
    })
    if (error) { toast('خطأ في قبول الطلب: ' + error.message, 'error'); setAccepting(null); setPendingTask(null); return }
    await fetchFeedTasks(); await fetchMyTasks()
    setAccepting(null); setPendingTask(null); setTab('my-tasks')
  }

  const submitCompletion = async () => {
    if (!completingTask) return
    if (!priceOffer || Number(priceOffer) <= 0) { toast('أضف السعر أولاً', 'warning'); return }
    setUploadingProof(true)

    const { error } = await supabase.rpc('submit_task_completion', {
      p_task_id: completingTask.id,
      p_completion_note: proofNote || 'تم الإنجاز',
      p_completion_proof: proofUrl || null,
    })
    if (error) { toast('خطأ: ' + error.message, 'error'); setUploadingProof(false); return }

    // اقتراح السعر
    await supabase.rpc('propose_price', {
      p_task_id: completingTask.id,
      p_price: Number(priceOffer),
      p_note: proofNote || null,
    })

    await fetchMyTasks()
    setUploadingProof(false)
    setCompletingTask(null)
    setProofUrl('')
    setProofNote('')
    setPriceOffer('')
  }

  const toggleOnline = async () => {
    if (!workerProfile) return
    setToggling(true)
    const newStatus = !workerProfile.is_online
    await supabase.from('worker_profiles').update({ is_online: newStatus, availability_status: newStatus ? 'online' : 'offline' }).eq('user_id', user!.id)
    setWorkerProfile(p => p ? { ...p, is_online: newStatus } : null)
    setToggling(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-primary-500" size={32} />
    </div>
  )

  if (!workerProfile?.is_approved) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
        <Clock size={40} className="text-primary-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-3">طلبك قيد المراجعة</h2>
        <p className="text-slate-500 text-sm leading-relaxed">فريق آمرني سيراجع بياناتك ويوافق عليك قريباً.</p>
      </div>
    </div>
  )

  const completedTasks = myTasks.filter(t => t.status === 'completed')
  const activeTasks = myTasks.filter(t => ['in_progress', 'pending_confirmation'].includes(t.status))
  const totalEarnings = completedTasks.reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)
  const thisMonth = completedTasks.filter(t => new Date(t.created_at).getMonth() === new Date().getMonth()).length

  const filteredFeed = feedTasks.filter(t => {
    if (cityFilter === 'all') return true
    if (cityFilter === 'smart') return t.city === workerProfile?.city || workerProfile?.skills?.some((s: string) => s.trim() === t.category?.trim())
    return t.city === workerProfile?.city
  })

  // Commission Modal
  if (showCommission && pendingTask) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="p-5 pb-3 flex-shrink-0 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 text-center mb-1">شروط قبول الطلب</h2>
          <p className="text-slate-400 text-xs text-center">يرجى الموافقة قبل القبول</p>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
            <p className="text-sm text-slate-900 font-bold">الطلب: {pendingTask.title}</p>
            {(pendingTask as any).price_suggested && <p className="text-sm text-primary-500 mt-1">القيمة: {(pendingTask as any).price_suggested} ريال</p>}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-loose">
            أتعهد بتحويل عمولة <span className="font-bold text-primary-500">2%</span> من قيمة الطلب إلى حساب المنصة خلال <span className="font-bold">٧٢ ساعة</span> من الإتمام.
            <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
              {[['البنك','بنك البلاد'],['المستفيد','مؤسسة حلول الغد'],['الآيبان','SA54150009001465965400007']].map(([k,v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-slate-700 font-medium">{v}</span>
                </div>
              ))}
            </div>
            {(pendingTask as any).price_suggested && (
              <div className="mt-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-slate-500">العمولة المستحقة</span>
                <span className="text-primary-500 font-black">{((pendingTask as any).price_suggested * 0.02).toFixed(2)} ريال</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-3 border-t border-slate-100 flex-shrink-0">
          <button onClick={() => { setShowCommission(false); setPendingTask(null) }}
            className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">إلغاء</button>
          <button onClick={confirmAcceptTask}
            className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-primary-700 transition-colors">أوافق وأقبل</button>
        </div>
      </div>
    </div>
  )

  // Completion Modal
  if (completingTask) return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 mb-1">إنهاء الطلب وتسليمه</h3>
        <p className="text-slate-500 text-sm mb-4">أضف السعر وملاحظة وارفع إثبات الإنجاز</p>

        {/* السعر - إلزامي */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            💰 السعر المقترح <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-primary-500 transition-colors">
            <input
              type="number" min="1"
              value={priceOffer} onChange={e => setPriceOffer(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-sm outline-none font-bold text-slate-900"
            />
            <span className="text-slate-400 text-sm">ريال</span>
          </div>
          {completingTask.price_suggested && (
            <p className="text-xs text-slate-400 mt-1">سعر العميل المقترح: {completingTask.price_suggested} ريال</p>
          )}
        </div>

        <textarea value={proofNote} onChange={e => setProofNote(e.target.value)}
          placeholder="ملاحظة للعميل — صف ما أنجزته..." rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none mb-3 focus:border-primary-500 transition-colors" />

        {/* File/Image upload */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-2">إرفاق صورة أو ملف (اختياري)</label>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-primary-500 rounded-xl py-3 cursor-pointer transition-colors">
              <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const ext = file.name.split('.').pop()
                  const path = `completions/${completingTask.id}/${Date.now()}.${ext}`
                  const { error } = await supabase.storage.from('chat-media').upload(path, file)
                  if (!error) {
                    const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
                    setProofUrl(data.publicUrl)
                  }
                }} />
              {proofUrl ? (
                <span className="text-green-600 text-sm font-bold">✅ تم رفع الملف</span>
              ) : (
                <>
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-slate-400 text-sm">صورة أو PDF أو Word</span>
                </>
              )}
            </label>
            {proofUrl && (
              <button onClick={() => setProofUrl('')} className="px-3 py-2 text-red-400 border border-red-200 rounded-xl hover:bg-red-50 text-xs">
                حذف
              </button>
            )}
          </div>
          {proofUrl && proofUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) && (
            <img src={proofUrl} alt="إثبات الإنجاز" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-200" />
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setCompletingTask(null); setProofUrl(''); setProofNote(''); setPriceOffer('') }}
            className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm hover:bg-slate-50">إلغاء</button>
          <button onClick={submitCompletion} disabled={uploadingProof || !priceOffer || Number(priceOffer) <= 0}
            className="flex-1 bg-secondary-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-secondary-600">
            {uploadingProof ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            أرسل للعميل
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" dir="rtl">

      {/* Sidebar - Desktop - LEFT side like design */}
      <aside className="hidden md:flex flex-col h-screen fixed left-0 top-0 bg-white border-r border-slate-200 w-64 z-50 shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <button onClick={() => navigate('landing')} className="text-xl font-black text-primary-500 hover:opacity-80 transition-opacity">آمرني</button>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 font-black text-lg flex-shrink-0">
            {profile?.full_name?.[0] || '؟'}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{profile?.full_name}</p>
            <div className="flex items-center gap-1">
              <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">محترف موثق</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: 'overview', icon: BarChart2, label: 'نظرة عامة' },
            { id: 'feed', icon: Zap, label: 'الطلبات المتاحة', badge: filteredFeed.length },
            { id: 'my-tasks', icon: Briefcase, label: 'طلباتي', badge: activeTasks.length },
            { id: 'chat', icon: MessageSquare, label: 'المحادثات' },
            { id: 'profile', icon: User, label: 'ملفي الشخصي' },
          ].map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                tab === id ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              <Icon size={16} />
              <span className="flex-1 text-right">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${tab === id ? 'bg-white text-primary-500' : 'bg-primary-500 text-white'}`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <button onClick={toggleOnline} disabled={toggling}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              workerProfile?.is_online ? 'bg-secondary-500 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
            {toggling ? <Loader2 size={14} className="animate-spin" /> : workerProfile?.is_online ? <><Wifi size={14} /> متاح الآن</> : <><WifiOff size={14} /> غير متاح</>}
          </button>
          <div className="flex gap-2 text-xs text-slate-400 justify-center">
            <button className="hover:text-slate-600">مركز المساعدة</button>
            <span>•</span>
            <button className="hover:text-slate-600">تسجيل الخروج</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:mr-0 md:ml-64 min-h-screen pb-20 md:pb-0">

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('landing')} className="md:hidden text-lg font-black text-primary-500 hover:opacity-80 transition-opacity">آمرني</button>
            <div className="hidden md:block">
              <h2 className="text-2xl font-black text-slate-900">لوحة تحكم مقدم الخدمة</h2>
              <p className="text-slate-600 text-sm font-medium mt-0.5">
                مرحباً <span className="text-primary-500 font-bold">{profile?.full_name?.split(' ')[0]}</span> 👋 — إليك أداءك اليوم
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-full border border-slate-200">
            <span className="text-sm text-slate-600 font-medium">
              الحالة: <span className={`font-bold ${workerProfile?.is_online ? 'text-secondary-500' : 'text-red-400'}`}>
                {workerProfile?.is_online ? 'متاح' : 'غير متاح'}
              </span>
            </span>
            <button onClick={toggleOnline} disabled={toggling}
              className={`relative w-11 h-6 rounded-full transition-all ${workerProfile?.is_online ? 'bg-secondary-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${workerProfile?.is_online ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6">

          {/* Mobile Welcome */}
          <div className="md:hidden bg-primary-50 border border-primary-100 rounded-2xl px-5 py-4">
            <p className="text-slate-500 text-xs mb-0.5">مرحباً 👋</p>
            <h2 className="text-xl font-black text-slate-900">{profile?.full_name?.split(' ')[0]}</h2>
            <p className="text-slate-500 text-xs mt-0.5">إليك أداءك اليوم</p>
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    icon: DollarSign, label: 'إجمالي الأرباح', value: `${totalEarnings.toLocaleString()} ر.س`,
                    badge: '+12% مقارنة بالأسبوع الماضي', badgeColor: 'bg-green-100 text-green-600',
                    iconBg: 'bg-primary-50', iconColor: 'text-primary-500',
                  },
                  {
                    icon: Star, label: 'متوسط التقييم', value: workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—',
                    badge: 'الأفضل في المنطقة', badgeColor: 'bg-slate-100 text-slate-500',
                    iconBg: 'bg-amber-50', iconColor: 'text-amber-500',
                    extra: workerProfile?.rating ? (
                      <div className="flex gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= Math.round(workerProfile.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />)}
                      </div>
                    ) : null
                  },
                  {
                    icon: CheckCircle, label: 'طلبات مكتملة', value: completedTasks.length.toString(),
                    badge: `${thisMonth} هذا الشهر`, badgeColor: 'bg-blue-50 text-blue-600',
                    iconBg: 'bg-green-50', iconColor: 'text-green-500',
                  },
                ].map(({ icon: Icon, label, value, badge, badgeColor, iconBg, iconColor, extra }: any) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${iconBg}`}>
                        <Icon size={20} className={iconColor} />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>
                    </div>
                    <p className="text-slate-500 text-sm">{label}</p>
                    <p className="text-3xl font-black text-primary-500 mt-1">{value}</p>
                    {extra}
                  </div>
                ))}
              </div>

              {/* Upcoming + Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Upcoming Bookings */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-lg">الطلبات القادمة</h3>
                    <button onClick={() => setTab('my-tasks')} className="text-primary-500 text-sm font-semibold hover:underline">عرض الكل</button>
                  </div>

                  {activeTasks.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                      <Zap size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm mb-4">ما في طلبات نشطة</p>
                      <button onClick={() => setTab('feed')} className="bg-primary-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary-700 transition-colors">
                        شوف الطلبات المتاحة
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                              📋
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${STATUS_COLOR[task.status]}`}>
                                  {STATUS_LABEL[task.status]}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                {task.city && <span className="flex items-center gap-1"><MapPin size={10} /> {task.city}</span>}
                                {task.price_suggested && <span className="text-primary-500 font-bold">{task.price_suggested} ر.س</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => { setSelectedTask(task); setTab('chat') }}
                              className="flex items-center gap-1 px-4 py-2 text-primary-500 border border-primary-200 rounded-xl text-sm font-medium hover:bg-primary-50 transition-colors">
                              <MessageSquare size={13} /> محادثة
                            </button>
                            {task.status === 'in_progress' && (
                              <button onClick={() => setCompletingTask(task)}
                                className="flex items-center gap-1 px-4 py-2 bg-secondary-500 text-white rounded-xl text-sm font-bold hover:bg-secondary-600 transition-colors">
                                <CheckCircle size={13} /> أنهيت الطلب
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service Insights */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Service Insights</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <p className="font-bold text-primary-500 text-sm mb-4">آخر تقييم</p>
                    <div className="flex gap-0.5 mb-3">
                      {[1,2,3,4,5].map(s => <Star key={s} size={16} className="text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-slate-700 text-sm italic leading-relaxed mb-3">
                      "وصل في الوقت المحدد وأدى عملاً رائعاً. محترف جداً وأنظف. أوصي به بشدة!"
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-bold text-slate-600">— أحمد ر.</span>
                      <span>• منذ يومين</span>
                    </div>

                    <div className="mt-5 p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="font-bold text-green-700 text-sm mb-1">فرصة أرباح 🚀</p>
                      <p className="text-green-600 text-xs leading-relaxed">
                        الطلبات في منطقتك مرتفعة الآن. حدّث حالتك إلى "متاح" لاستقبال المزيد من الطلبات.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Feed Tab */}
          {tab === 'feed' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-lg">الطلبات المتاحة</h3>
                <div className="flex gap-2">
                  {[['all','الكل'],['smart','مناسبة لي'],['city','منطقتي']].map(([v,l]) => (
                    <button key={v} onClick={() => setCityFilter(v)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${cityFilter === v ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {filteredFeed.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                  <Zap size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400">ما في طلبات متاحة الحين</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFeed.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">{task.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            {task.category && <span className="bg-slate-100 px-2 py-1 rounded-full">{task.category}</span>}
                            {task.city && <span className="flex items-center gap-1"><MapPin size={10} /> {task.city}</span>}
                            {task.price_suggested && <span className="text-primary-500 font-bold">{task.price_suggested} ر.س</span>}
                          </div>
                        </div>
                        <button onClick={() => acceptTask(task)} disabled={!!accepting}
                          className="bg-primary-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary-700 transition-colors flex-shrink-0 flex items-center gap-1.5 disabled:opacity-50">
                          {accepting === task.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          قبول الطلب
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Tasks Tab */}
          {tab === 'my-tasks' && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-4">طلباتي</h3>
              {myTasks.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                  <Briefcase size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400">ما قبلت أي طلب بعد</p>
                  <button onClick={() => setTab('feed')} className="mt-4 bg-primary-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-primary-700">
                    تصفح الطلبات المتاحة ←
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900">{task.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            {task.city && <span className="flex items-center gap-1"><MapPin size={10} /> {task.city}</span>}
                            {task.price_final && <span className="text-primary-500 font-bold">{task.price_final} ر.س</span>}
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-bold flex-shrink-0 ${STATUS_COLOR[task.status]}`}>
                          {STATUS_LABEL[task.status]}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {['in_progress'].includes(task.status) && (
                          <>
                            <button onClick={() => { setSelectedTask(task); setTab('chat') }}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2.5 rounded-xl transition-colors font-medium">
                              <MessageSquare size={14} /> محادثة
                            </button>
                            <button onClick={() => setCompletingTask(task)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-secondary-500 hover:bg-secondary-600 text-white text-sm py-2.5 rounded-xl transition-colors font-bold">
                              <Upload size={14} /> أنهيت الطلب
                            </button>
                          </>
                        )}
                        {task.status === 'pending_confirmation' && (
                          <div className="flex-1 text-center py-2 text-purple-500 text-sm font-bold bg-purple-50 rounded-xl border border-purple-200">
                            ⏳ بانتظار تأكيد العميل
                          </div>
                        )}
                        {task.status === 'completed' && (
                          <button onClick={() => { setSelectedTask(task); setTab('chat') }}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 text-sm py-2.5 rounded-xl">
                            <MessageSquare size={14} /> عرض المحادثة
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {tab === 'chat' && (
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-4">المحادثات</h3>
              {selectedTask ? (
                <div>
                  <button onClick={() => setSelectedTask(null)} className="text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors">← رجوع للمحادثات</button>
                  <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.filter(t => ['in_progress', 'pending_confirmation'].includes(t.status)).length === 0 ? (
                    <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                      <MessageSquare size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400">ما في محادثات نشطة</p>
                    </div>
                  ) : (
                    myTasks.filter(t => ['in_progress', 'pending_confirmation'].includes(t.status)).map(task => (
                      <button key={task.id} onClick={() => setSelectedTask(task)}
                        className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-primary-500/30 hover:shadow-md transition-all text-right flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{task.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{STATUS_LABEL[task.status]}</p>
                        </div>
                        <MessageSquare size={18} className="text-primary-500" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="max-w-lg">
              <h3 className="font-bold text-slate-900 text-lg mb-5">ملفي الشخصي</h3>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 font-black text-2xl">
                    {profile?.full_name?.[0] || '؟'}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg">{profile?.full_name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-700">{workerProfile?.rating?.toFixed(1) || '—'}</span>
                      <span className="text-xs text-slate-400 mr-2">{workerProfile?.city}</span>
                    </div>
                  </div>
                </div>
                {[
                  ['إجمالي الأرباح', `${totalEarnings.toLocaleString()} ر.س`],
                  ['الطلبات المكتملة', completedTasks.length.toString()],
                  ['طلبات هذا الشهر', thisMonth.toString()],
                  ['الحالة', workerProfile?.is_online ? 'متاح' : 'غير متاح'],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <span className="text-slate-900 font-medium text-sm">{v}</span>
                    <span className="text-slate-400 text-sm">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-16 bg-white border-t border-slate-200 z-50 shadow-lg">
        {[
          { id: 'overview', icon: Home, label: 'الرئيسية' },
          { id: 'feed', icon: Zap, label: 'متاحة' },
          { id: 'my-tasks', icon: Briefcase, label: 'طلباتي' },
          { id: 'chat', icon: MessageSquare, label: 'المحادثات' },
          { id: 'profile', icon: User, label: 'حسابي' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex flex-col items-center gap-1 px-2 transition-all ${tab === id ? 'text-primary-500' : 'text-slate-400'}`}>
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
