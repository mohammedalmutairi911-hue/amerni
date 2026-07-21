import { useState, useEffect } from 'react'
import { COMPANY } from '../lib/constants'
import { Star, Clock, CheckCircle, Zap, Loader2, MessageSquare, Upload, DollarSign, Home, List, Calendar, User, LogOut, MapPin, Copy, Wifi, WifiOff, BarChart2, Briefcase, TrendingUp, Plus, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { requestNotificationPermission, sendLocalNotification, registerServiceWorker } from '../lib/notifications'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
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
  const { user, profile, signOut } = useAuth()
  const { navigate } = useApp()
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
              {[['البنك','بنك البلاد'],['المستفيد','مؤسسة حلول الغد'],['الآيبان',COMPANY.iban]].map(([k,v]) => (
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

  const BADGES = [
    { icon: '🏆', label: 'بطل الشهر', sub: 'أكتوبر 2024', locked: false },
    { icon: '⏰', label: 'ملتزم بالوقت', sub: '15 وردية متتالية', locked: false },
    { icon: '🤝', label: 'المساعد المثالي', sub: 'تبادل ورديات مرن', locked: false },
    { icon: '🔒', label: 'منقذ الموقف', sub: 'قريباً...', locked: true },
  ]
  // LEADERBOARD: يُبنى من بيانات حقيقية (العامل الحالي + إشارة لترتيبه)
  const myRating = workerProfile?.rating || 0
  const myCompleted = completedTasks.length
  const LEADERBOARD = [
    { rank: 1, name: profile?.full_name || 'أنت', dept: workerProfile?.city || 'غير محدد', score: myRating > 0 ? `${myRating.toFixed(1)}⭐` : `${myCompleted} مكتمل`, me: true },
  ]
  // SHIFTS: تُبنى من الطلبات المتاحة الحقيقية
  const SHIFTS = filteredFeed.slice(0, 6).map(t => ({
    name: t.client_name || 'عميل',
    role: t.category || 'خدمة',
    type: t.created_at && new Date(t.created_at).getHours() < 12 ? 'صباحي' : new Date(t.created_at).getHours() < 18 ? 'مسائي' : 'ليلي',
    typeIcon: new Date(t.created_at).getHours() < 12 ? '🌤️' : new Date(t.created_at).getHours() < 18 ? '🌅' : '🌙',
    date: new Date(t.created_at).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: t.time_preference || 'مرن',
    id: t.id,
  }))
  const HEATMAP_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس']
  const HEATMAP_DATA = [
    [1,2,3,4,3,2,1,1,1,1,1,1],
    [2,3,4,4,4,3,2,2,1,1,1,1],
    [1,1,2,3,3,2,1,1,1,1,1,1],
    [1,1,1,2,2,1,1,1,1,1,1,1],
    [2,3,4,4,3,2,1,1,1,1,1,1],
  ]
  const heatColor = (v: number) => ['bg-slate-100','bg-primary-100','bg-primary-300','bg-primary-600','bg-primary-800'][v] || 'bg-slate-100'

  const NAV = [
    { id: 'overview', icon: Home, label: 'الرئيسية' },
    { id: 'shifts', icon: Calendar, label: 'الورديات' },
    { id: 'my-tasks', icon: Briefcase, label: 'الطلبات', badge: activeTasks.length },
    { id: 'analytics', icon: BarChart2, label: 'التحليلات' },
    { id: 'achievements', icon: Star, label: 'الإنجازات' },
  ]

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex" dir="rtl">

      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 bg-white border-l border-slate-200 w-64 flex-shrink-0 shadow-sm z-40">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <button onClick={() => navigate('landing')} className="text-xl font-black text-primary-700 hover:opacity-80">أمرني</button>
          <button onClick={toggleOnline} disabled={toggling}
            className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${workerProfile?.is_online ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
            {toggling ? <Loader2 size={10} className="animate-spin" /> : workerProfile?.is_online ? <><Wifi size={10} /> متاح</> : <><WifiOff size={10} /> غير متاح</>}
          </button>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {profile?.full_name?.[0] || '؟'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-400">مقدم خدمة</p>
            </div>
          </div>
          {/* Stats mini */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'مكتمل', value: completedTasks.length },
              { label: 'تقييم', value: `${workerProfile?.rating?.toFixed(1) || '0'}⭐` },
              { label: 'نشط', value: activeTasks.length },
            ].map(s => (
              <div key={s.label} className="text-center bg-slate-50 rounded-xl py-2">
                <p className="text-sm font-black text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {[
            { id: 'overview',      emoji: '🏠', label: 'الرئيسية' },
            { id: 'shifts',        emoji: '🕐', label: 'سوق الشفتات' },
            { id: 'my-tasks',      emoji: '📋', label: 'الطلبات',     badge: activeTasks.length },
            { id: 'analytics',     emoji: '📊', label: 'التحليلات الاستباقية' },
            { id: 'achievements',  emoji: '⭐', label: 'الإنجازات والالتزام' },
          ].map(({ id, emoji, label, badge }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === id ? 'bg-primary-700 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              <span className="text-base">{emoji}</span>
              <span className="flex-1 text-right">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${tab === id ? 'bg-white text-primary-700' : 'bg-red-500 text-white'}`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <button onClick={() => navigate('support')} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1.5 transition-colors">مركز المساعدة</button>
          <button onClick={async () => { await signOut(); navigate('landing') }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-600 py-1.5 transition-colors font-medium">
            <LogOut size={12} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Right Column ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* ── Top Header ── */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center gap-4 shadow-sm">
          {/* Mobile logo */}
          <button onClick={() => navigate('landing')} className="lg:hidden text-xl font-black text-primary-700">أمرني</button>
          <div className="hidden lg:block flex-1">
            <h2 className="font-black text-slate-800 text-lg">
              {tab === 'overview' ? 'لوحة العامل' : tab === 'shifts' ? 'سوق الشفتات' : tab === 'my-tasks' ? 'الطلبات' : tab === 'analytics' ? 'التحليلات الاستباقية' : 'الإنجازات والالتزام'}
            </h2>
          </div>
          <div className="flex-1 lg:flex-none hidden lg:block">
            <div className="relative max-w-xs">
              <input placeholder="البحث عن طلبات أو زملاء..." dir="rtl"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 pr-9" />
              <span className="absolute right-3 top-2.5 text-slate-300 text-sm">🔍</span>
            </div>
          </div>
          <div className="mr-auto flex items-center gap-3">
            {/* Online toggle - desktop */}
            <button onClick={toggleOnline} disabled={toggling}
              className={`hidden lg:flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${workerProfile?.is_online ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
              {toggling ? <Loader2 size={12} className="animate-spin" /> : workerProfile?.is_online ? <><Wifi size={12} /> متاح الآن</> : <><WifiOff size={12} /> غير متاح</>}
            </button>
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-black text-sm">
              {profile?.full_name?.[0] || '؟'}
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition-colors text-lg">🔔</button>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto">
          <div className="max-w-5xl mx-auto">

        {/* Commission Modal */}
        {showCommission && pendingTask && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/80 p-0">
            <div className="w-full max-w-sm bg-white rounded-t-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-slate-900 text-center mb-3">شروط قبول الطلب</h2>
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 mb-3">
                <p className="text-sm font-bold">{pendingTask.title}</p>
              </div>
              <p className="text-sm text-slate-600 mb-4">أتعهد بتحويل عمولة <b className="text-primary-600">2%</b> من قيمة الطلب خلال 72 ساعة.</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowCommission(false); setPendingTask(null) }} className="flex-1 border border-slate-200 py-3 rounded-xl text-sm">إلغاء</button>
                <button onClick={confirmAcceptTask} className="flex-1 bg-primary-700 text-white font-bold py-3 rounded-xl text-sm">أوافق وأقبل</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ OVERVIEW ══ */}
        {(tab === 'overview' || !['shifts','my-tasks','analytics','achievements'].includes(tab)) && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-primary-700 mb-1">لوحة العامل</h2>
              <p className="text-slate-500 text-sm">مرحباً، {profile?.full_name?.split(' ')[0]} 👋 — إليك أداءك اليوم</p>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'طلبات مكتملة', value: completedTasks.length, icon: '✅', sub: `+${thisMonth} هذا الشهر` },
                { label: 'إجمالي الأرباح', value: `${totalEarnings.toLocaleString()} ر`, icon: '💰', sub: 'بعد العمولة' },
                { label: 'تقييمي', value: `${workerProfile?.rating?.toFixed(1) || '0.0'} ⭐`, icon: '⭐', sub: `${workerProfile?.total_reviews || 0} تقييم` },
                { label: 'طلبات نشطة', value: activeTasks.length, icon: '🔄', sub: 'جارٍ تنفيذها' },
              ].map(({ label, value, icon, sub }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className="text-2xl font-black text-slate-900">{value}</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Status Toggle */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-bold text-slate-800">حالتك الآن</p>
                <p className="text-xs text-slate-400 mt-0.5">{workerProfile?.is_online ? 'تظهر للعملاء في الفيد' : 'مخفي عن العملاء'}</p>
              </div>
              <button onClick={toggleOnline} disabled={toggling}
                className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all ${workerProfile?.is_online ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {toggling ? <Loader2 size={14} className="animate-spin" /> : workerProfile?.is_online ? <><Wifi size={14} /> متاح</> : <><WifiOff size={14} /> غير متاح</>}
              </button>
            </div>

            {/* Latest tasks */}
            {myTasks.slice(0,3).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <button onClick={() => setTab('my-tasks')} className="text-xs text-primary-600 font-bold">عرض الكل</button>
                  <p className="font-bold text-slate-900 text-sm">آخر الطلبات</p>
                </div>
                {myTasks.slice(0,3).map(t => (
                  <div key={t.id} className="px-4 py-3 border-b border-slate-50 last:border-0 flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[60%]">{t.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SHIFTS (سوق الشفتات) ══ */}
        {tab === 'shifts' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-primary-700 mb-1">سوق الشفتات</h2>
              <p className="text-slate-500 text-sm">استكشف فرص التبديل المتاحة مع زملائك في العمل</p>
            </div>

            {/* Search */}
            <div className="relative">
              <input placeholder="البحث عن زميل أو تاريخ معين..." dir="rtl"
                className="w-full pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <span className="absolute right-3 top-3.5 text-slate-300 text-lg">🔍</span>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 font-medium">📅 التاريخ</button>
              <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 font-medium">⚙️ الفلاتر</button>
            </div>

            {/* Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['الكل','صباحي','مسائي','ليلي','نهاية الأسبوع'].map((f, i) => (
                <button key={f} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${i===0 ? 'bg-primary-700 text-white border-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {f}
                </button>
              ))}
            </div>

            {/* Shift Cards */}
            <div className="space-y-3">
              {SHIFTS.map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                      {s.typeIcon} {s.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-sm">{s.name[0]}</div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 mb-3">
                    <p className="text-sm text-slate-600 flex items-center gap-2">📅 {s.date}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-2">🕐 {s.time}</p>
                  </div>
                  <button className="w-full bg-primary-700 hover:bg-primary-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                    طلب تبديل
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ MY TASKS ══ */}
        {tab === 'my-tasks' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-primary-700 mb-1">طلباتي</h2>
                <p className="text-slate-500 text-sm">الطلبات النشطة والمكتملة</p>
              </div>
              <button onClick={() => setTab('overview')}
                className="bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-sm">الكل</button>
            </div>

            {/* Available Tasks */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded-full">{filteredFeed.length} متاح</span>
                <p className="font-bold text-slate-900 text-sm">الطلبات المتاحة</p>
              </div>
              {filteredFeed.slice(0,5).map(task => (
                <div key={task.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => acceptTask(task)} disabled={accepting === task.id}
                      className="flex-shrink-0 bg-primary-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {accepting === task.id ? <Loader2 size={12} className="animate-spin" /> : 'اقبل'}
                    </button>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-slate-900 text-sm">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{task.city} • {task.category}</p>
                      {task.price_suggested && <p className="text-xs text-primary-600 font-bold mt-0.5">{task.price_suggested} ريال</p>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredFeed.length === 0 && <p className="text-center text-slate-400 text-sm py-8">لا توجد طلبات متاحة الآن</p>}
            </div>

            {/* My Active Tasks */}
            {myTasks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">طلباتي الحالية</p>
                </div>
                {myTasks.map(t => (
                  <div key={t.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2">
                        {t.status === 'in_progress' && (
                          <button onClick={() => setCompletingTask(t)}
                            className="text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg">أنهِ</button>
                        )}
                        {t.status !== 'completed' && t.status !== 'cancelled' && (
                          <button onClick={() => { setSelectedTask(t); setTab('chat') }}
                            className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">💬</button>
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2 mb-0.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                          <p className="font-bold text-slate-900 text-sm">{t.title}</p>
                        </div>
                        <p className="text-xs text-slate-400">{t.city} • {new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completion Modal */}
            {completingTask && (
              <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-end justify-center">
                <div className="bg-white rounded-t-2xl w-full max-w-sm p-5">
                  <h3 className="font-bold text-slate-900 mb-3">إنهاء الطلب</h3>
                  <input type="number" value={priceOffer} onChange={e => setPriceOffer(e.target.value)}
                    placeholder="السعر المقترح (ريال)" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <textarea value={proofNote} onChange={e => setProofNote(e.target.value)}
                    placeholder="ملاحظة للعميل..." rows={2}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <div className="flex gap-2">
                    <button onClick={() => { setCompletingTask(null); setProofUrl(''); setProofNote(''); setPriceOffer('') }}
                      className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm">إلغاء</button>
                    <button onClick={submitCompletion} disabled={uploadingProof || !priceOffer}
                      className="flex-1 bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                      {uploadingProof ? <Loader2 size={14} className="animate-spin inline" /> : 'أرسل للعميل'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ANALYTICS (التحليلات الاستباقية) ══ */}
        {tab === 'analytics' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-primary-700 mb-1">التحليلات الاستباقية</h2>
              <p className="text-slate-500 text-sm">توقعات ضغط العمل للأسبوع القادم بناءً على الذكاء الاصطناعي</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white border-2 border-red-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-red-500 font-bold">+12% عن الأسبوع الماضي</span>
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-3xl font-black text-slate-900">14 ساعة</p>
                <p className="text-xs font-bold text-slate-600 mt-0.5">العجز المتوقع</p>
                <p className="text-xs text-slate-400 mt-1">يتركز في ورديات المساء (قسم اللوجستيات)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-xl">📈</span>
                  <p className="text-xs text-slate-400 mt-1">أيام الذروة</p>
                  <div className="flex gap-1 mt-2">
                    {['أح','ث','ثل'].map((d, i) => (
                      <div key={d} className={`flex-1 text-center p-1.5 rounded-lg text-xs font-bold ${i===1?'bg-primary-700 text-white':i===0?'bg-primary-200 text-primary-800':'bg-slate-100 text-slate-500'}`}>{d}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-xl">👥</span>
                  <p className="text-xs text-slate-400 mt-1">كفاءة التوزيع</p>
                  <p className="text-2xl font-black text-primary-700 mt-1">{myCompleted > 0 ? Math.round((myCompleted / Math.max(myCompleted + activeTasks.length, 1)) * 100) + "%" : "—"}</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                    <div className="bg-primary-600 h-1.5 rounded-full" style={{width: myCompleted > 0 ? Math.round((myCompleted / Math.max(myCompleted + activeTasks.length, 1)) * 100) + "%" : "0%"}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
              <h3 className="font-bold text-primary-700 mb-1 text-sm">خريطة كثافة العمل</h3>
              <p className="text-xs text-slate-400 mb-3">توزيع ضغط العمل للأسبوع القادم</p>
              <div className="min-w-[340px]">
                <div className="grid grid-cols-[50px_repeat(8,1fr)] gap-1 mb-2 text-center">
                  <div/>{['08','10','12','14','16','18','20','22'].map(h=><div key={h} className="text-xs text-slate-400">{h}</div>)}
                </div>
                {HEATMAP_DAYS.map((day, i) => (
                  <div key={day} className="grid grid-cols-[50px_repeat(8,1fr)] gap-1 mb-1">
                    <div className="text-xs text-slate-500 flex items-center">{day}</div>
                    {HEATMAP_DATA[i].slice(0,8).map((v, j) => (
                      <div key={j} className={`h-7 rounded ${heatColor(v)} transition-all hover:opacity-80`}/>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {['منخفض','متوسط','مرتفع','ذروة'].map((l,i) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${['bg-slate-100','bg-primary-200','bg-primary-500','bg-primary-800'][i]}`}/>
                    <span className="text-xs text-slate-400">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Coverage */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-primary-700 mb-3 text-sm">معدل التغطية حسب القسم</h3>
              <div className="space-y-3">
                {[['قسم المبيعات','98','text-primary-600'],['قسم اللوجستيات','65','text-red-500'],['خدمة العملاء','88','text-primary-600']].map(([dept,pct,color])=>(
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs font-bold ${color}`}>{pct}%</span>
                      <span className="text-xs text-slate-600">{dept}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div className={`h-2 rounded-full ${color.includes('red')?'bg-red-500':'bg-primary-600'}`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ ACHIEVEMENTS (الإنجازات) ══ */}
        {tab === 'achievements' && (
          <div className="space-y-5 animate-fade-in">
            {/* Profile Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
              <div className="relative flex-shrink-0">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6"/>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#1e3a8a" strokeWidth="6"
                    strokeDasharray="213.6" strokeDashoffset={String(213.6 - (myRating > 0 ? (myRating/5 * 213.6) : myCompleted > 0 ? 213.6 : 213.6))} strokeLinecap="round"
                    transform="rotate(-90 40 40)"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-primary-700">{myRating > 0 ? (myRating / 5 * 100).toFixed(0) + "%" : myCompleted > 0 ? "100%" : "—"}</span>
                  <span className="text-xs text-slate-400">الالتزام</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-900">أهلاً، {profile?.full_name?.split(' ')[0]}</h2>
                <p className="text-xs text-slate-500 mt-0.5">أنت ضمن أفضل 5% من الموظفين الملتزمين هذا الشهر.</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs bg-primary-700 text-white px-2.5 py-1 rounded-full font-bold">⭐ مستوى: محترف</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">ترتيب: 3#</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <button className="text-xs text-primary-600 font-bold">عرض الكل</button>
                <h3 className="font-bold text-slate-900">الأوسمة والإنجازات</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BADGES.map((b) => (
                  <div key={b.label} className={`flex flex-col items-center p-4 rounded-xl border transition-colors ${b.locked ? 'bg-slate-50 opacity-50 border-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2 ${b.locked ? 'bg-slate-100' : 'bg-primary-50'}`}>
                      {b.locked ? '🔒' : b.icon}
                    </div>
                    <p className="font-bold text-sm text-slate-800 text-center">{b.label}</p>
                    <p className="text-xs text-slate-400 text-center mt-0.5">{b.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">لوحة الشرف</h3>
              <div className="space-y-2">
                {LEADERBOARD.map((e) => (
                  <div key={e.rank} className={`flex items-center gap-3 p-3 rounded-xl ${e.me ? 'bg-primary-700 text-white ring-2 ring-primary-500' : 'bg-slate-50'}`}>
                    <span className={`font-black text-lg w-6 text-center ${e.me ? 'text-white' : 'text-slate-400'}`}>{e.rank}</span>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${e.me ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'}`}>
                      {e.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${e.me ? 'text-white' : 'text-slate-900'}`}>{e.name}{e.me ? ' (أنت)' : ''}</p>
                      <p className={`text-xs ${e.me ? 'text-white/70' : 'text-slate-400'}`}>{e.dept}</p>
                    </div>
                    <span className={`font-black text-sm ${e.me ? 'text-white' : 'text-primary-700'}`}>{e.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commitment Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">سجل الالتزام الأخير</h3>
              <div className="space-y-3 relative before:absolute before:right-[14px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {[
                  { icon: '✅', color: 'bg-green-100', label: 'وردية الصباح — مكتملة', time: 'اليوم، 08:00 - 16:00', points: '+10 نقاط', star: false },
                  { icon: '✅', color: 'bg-green-100', label: 'وردية المساء — مكتملة', time: 'أمس، 16:00 - 00:00', points: '+12 نقطة', star: false },
                  { icon: '⭐', color: 'bg-primary-100', label: 'تم الحصول على وسام "ملتزم بالوقت"', time: 'قبل 3 أيام', points: '', star: true },
                ].map((item, i) => (
                  <div key={i} className="relative pr-8">
                    <div className={`absolute right-0 top-0 w-7 h-7 rounded-full ${item.color} flex items-center justify-center text-sm z-10`}>
                      {item.icon}
                    </div>
                    <div className={`p-3 rounded-xl ${item.star ? 'bg-primary-50 border border-primary-200' : 'bg-slate-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${item.star ? 'text-primary-600' : 'text-green-600'}`}>{item.points}</span>
                        <p className={`font-bold text-sm ${item.star ? 'text-primary-700' : 'text-slate-800'}`}>{item.label}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 text-right">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ CHAT ══ */}
        {tab === 'chat' && selectedTask && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setTab('my-tasks')} className="text-slate-500 hover:text-slate-800">←</button>
              <h2 className="font-black text-primary-700">{selectedTask.title}</h2>
            </div>
            <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
          </div>
        )}
        {tab === 'chat' && !selectedTask && (
          <div className="animate-fade-in text-center py-16">
            <MessageSquare size={40} className="text-slate-200 mx-auto mb-3"/>
            <p className="text-slate-400">اختر طلباً لبدء المحادثة</p>
            <button onClick={() => setTab('my-tasks')} className="mt-3 text-primary-600 text-sm font-bold">اذهب لطلباتي</button>
          </div>
        )}

          </div>{/* max-w-5xl */}
        </main>

      </div>{/* right column */}

      {/* ── Bottom Navigation — Mobile Only ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-lg z-50 flex flex-row-reverse justify-around items-center py-2 px-2">
        {[
          { id: 'overview', icon: '🏠', label: 'الرئيسية' },
          { id: 'shifts', icon: '🕐', label: 'الورديات' },
          { id: 'my-tasks', icon: '📋', label: 'الطلبات', badge: activeTasks.length },
          { id: 'analytics', icon: '📊', label: 'التحليلات' },
          { id: 'achievements', icon: '⭐', label: 'الإنجازات' },
        ].map(({ id, icon, label, badge }) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all relative ${tab === id ? 'text-primary-700' : 'text-slate-400'}`}>
            <span className="text-xl">{icon}</span>
            <span className={`text-xs mt-0.5 font-medium ${tab === id ? 'font-bold text-primary-700' : ''}`}>{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="absolute top-0 left-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
