import { useState, useEffect } from 'react'
import { Briefcase, TrendingUp, Star, Wifi, WifiOff, Clock, CheckCircle, Zap, Loader2, Calendar, User, MessageSquare, Upload, ArrowRight, DollarSign, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task, WorkerProfile } from '../types'
import { Chat } from '../components/chat/Chat'
import { getAvatar } from '../lib/supabase'

type Tab = 'overview' | 'feed' | 'my-tasks' | 'chat' | 'schedule' | 'profile'

const STATUS_LABEL: Record<string, string> = { open: 'مفتوح', in_progress: 'جاري', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع' }
const STATUS_COLOR: Record<string, string> = {
  open: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-zinc-500 bg-zinc-800 border-zinc-700',
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
  const [toggling, setToggling] = useState(false)
  const [pendingTask, setPendingTask] = useState<Task | null>(null)
  const [showCommission, setShowCommission] = useState(false)

  useEffect(() => { if (user) fetchAll() }, [user?.id])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchWorkerProfile(), fetchFeedTasks(), fetchMyTasks()])
    setLoading(false)
  }

  const fetchWorkerProfile = async () => {
    const { data } = await supabase.from('worker_profiles').select('*').eq('user_id', user!.id).maybeSingle()
    if (data) setWorkerProfile(data)
  }

  const fetchFeedTasks = async () => {
    const { data } = await supabase.from('tasks').select('*, profiles(full_name)').eq('status', 'open').order('created_at', { ascending: false }).limit(20)
    setFeedTasks(data || [])
  }

  const fetchMyTasks = async () => {
    const { data } = await supabase.from('tasks').select('*, profiles(full_name)').eq('worker_id', user!.id).order('created_at', { ascending: false })
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
    await supabase.from('tasks').update({ worker_id: user!.id, status: 'in_progress' }).eq('id', pendingTask.id)
    await fetchFeedTasks()
    await fetchMyTasks()
    setAccepting(null)
    setPendingTask(null)
    setTab('my-tasks')
  }

  const completeTask = async (taskId: string, price: number) => {
    await supabase.from('tasks').update({ status: 'completed', price_final: price }).eq('id', taskId)
    await supabase.from('worker_profiles').update({
      total_tasks: (workerProfile?.total_tasks || 0) + 1,
    }).eq('user_id', user!.id)
    await fetchMyTasks()
    await fetchWorkerProfile()
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
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  if (!workerProfile?.is_approved) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center px-4">
      <div className="max-w-sm text-center bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
          <Clock size={28} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-3">طلبك قيد المراجعة</h2>
        <p className="text-zinc-500 text-sm leading-relaxed">فريق أمرني راح يراجع بياناتك ويوافق عليك قريباً. راح تجي لك إشعار فور الموافقة.</p>
      </div>
    </div>
  )

  // Stats
  const completedTasks = myTasks.filter(t => t.status === 'completed')
  const activeTasks = myTasks.filter(t => t.status === 'in_progress')
  const totalEarnings = completedTasks.reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)
  const thisMonth = completedTasks.filter(t => new Date(t.created_at).getMonth() === new Date().getMonth()).length

  // Commission modal
  if (showCommission && pendingTask) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#111] border border-zinc-800 rounded-2xl p-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h2 className="text-lg font-bold text-center mb-2">شروط قبول الطلب</h2>
        <p className="text-zinc-400 text-sm text-center mb-5">قبل ما تقبل الطلب، يرجى الموافقة على الشروط التالية:</p>
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 space-y-2">
          <p className="text-sm text-white font-semibold">الطلب: {pendingTask.title}</p>
          {pendingTask.price_suggested && (
            <p className="text-sm text-amber-400">القيمة المتوقعة: {pendingTask.price_suggested} ريال</p>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            ✅ أوافق على أن <span className="text-amber-400 font-bold">2%</span> من قيمة العمل تُحوَّل تلقائياً لحساب منصة <span className="text-amber-400 font-bold">أمرني</span> كعمولة خدمة، وذلك عند إتمام الطلب بنجاح.
          </p>
          {pendingTask.price_suggested && (
            <p className="text-xs text-zinc-500 mt-2">
              العمولة المتوقعة: {(pendingTask.price_suggested * 0.02).toFixed(2)} ريال
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setShowCommission(false); setPendingTask(null) }}
            className="flex-1 border border-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm hover:border-zinc-600 transition-colors">
            إلغاء
          </button>
          <button onClick={confirmAcceptTask}
            className="flex-1 bg-amber-500 text-black font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 transition-colors">
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
      {/* Top header */}
      <div className="bg-[#0d0d0d] border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={getAvatar(profile?.full_name || '')} className="w-9 h-9 rounded-xl" alt="" />
            <div>
              <p className="font-semibold text-sm">{profile?.full_name}</p>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Star size={10} className="text-amber-400" />
                {workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—'}
                <span className="mx-1">·</span>
                {workerProfile?.city}
              </div>
            </div>
          </div>
          <button onClick={toggleOnline} disabled={toggling}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
              workerProfile?.is_online
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
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
                tab === id ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              <Icon size={13} /> {label}
              {badge !== undefined && badge > 0 && (
                <span className="bg-amber-500 text-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{badge > 9 ? '9+' : badge}</span>
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
                { label: 'إجمالي المكاسب', value: `${totalEarnings.toLocaleString()} ر`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'طلبات مكتملة', value: completedTasks.length, icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
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
                    <Star key={s} size={16} className={s <= Math.round(workerProfile?.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />
                  ))}
                  <span className="text-amber-400 font-bold text-sm mr-1">{workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—'}</span>
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
                <button onClick={() => setTab('my-tasks')} className="text-xs text-amber-400 flex items-center gap-1">الكل <ArrowRight size={12} /></button>
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
                      <span className="text-sm font-bold text-amber-400">{task.price_final || task.price_suggested} ر</span>
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
                  <span key={s} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        {tab === 'feed' && (
          <div className="space-y-3">
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
            ) : feedTasks.map(task => (
              <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-2 py-0.5">جديد</span>
                      <span className="text-xs text-zinc-500">{task.category}</span>
                      <span className="text-xs text-zinc-500">{task.city}</span>
                      {task.use_ai && <span className="text-xs text-purple-400">AI</span>}
                    </div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                  </div>
                  {task.price_suggested && (
                    <span className="text-amber-400 font-bold text-sm flex-shrink-0">{task.price_suggested} ر</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">{new Date(task.created_at).toLocaleDateString('ar-SA')}</span>
                  <button onClick={() => acceptTask(task)} disabled={accepting === task.id}
                    className="bg-amber-500 text-black text-sm font-bold px-5 py-1.5 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-1">
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
                <button onClick={() => setTab('feed')} className="text-amber-400 text-sm mt-2">تصفح الطلبات المتاحة ←</button>
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
                  <span className="text-amber-400 font-bold flex-shrink-0">{task.price_final || task.price_suggested || '—'} ر</span>
                </div>
                <div className="flex gap-2">
                  {task.status === 'in_progress' && (
                    <>
                      <button onClick={() => { setSelectedTask(task); setTab('chat') }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm py-2 rounded-lg transition-colors">
                        <MessageSquare size={14} /> محادثة
                      </button>
                      <button onClick={() => completeTask(task.id, task.price_suggested || 0)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm py-2 rounded-lg border border-emerald-500/20 transition-colors">
                        <CheckCircle size={14} /> أكملت الطلب
                      </button>
                    </>
                  )}
                  {task.status === 'completed' && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-sm py-2 rounded-lg">
                      <CheckCircle size={14} /> مكتمل ✓
                    </div>
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
                {myTasks.filter(t => t.status === 'in_progress').length === 0 ? (
                  <div className="text-center py-16 text-zinc-600">
                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                    <p>ما في محادثات نشطة</p>
                  </div>
                ) : myTasks.filter(t => t.status === 'in_progress').map(task => (
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
                  <div key={day} className={`flex items-center justify-between rounded-xl px-4 py-3 ${s.active ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                    <span className={`text-sm font-medium ${s.active ? 'text-white' : 'text-zinc-500'}`}>{day}</span>
                    {s.active ? <span className="text-xs text-amber-400">{s.from} — {s.to}</span> : <span className="text-xs text-zinc-600">غير متاح</span>}
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
                    <Star size={13} className="text-amber-400 fill-amber-400" />
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
                  <span key={s} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
