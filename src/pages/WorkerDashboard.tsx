import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Loader2, TrendingUp, Star, Briefcase, Zap, Wifi, WifiOff, MessageSquare, Calendar, User, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task, WorkerProfile, Notification } from '../types'
import { Chat } from '../components/chat/Chat'

type Tab = 'feed' | 'my-tasks' | 'chat' | 'schedule' | 'profile'

export function WorkerDashboard() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<Tab>('feed')
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [feedTasks, setFeedTasks] = useState<Task[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchAll()

    // Realtime
    const ch = supabase.channel('worker-dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (p) => { setNotifications(n => [p.new as Notification, ...n]); setUnread(u => u + 1) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchWorkerProfile(), fetchTasks(), fetchNotifications()])
    setLoading(false)
  }

  const fetchWorkerProfile = async () => {
    const { data } = await supabase.from('worker_profiles').select('*').eq('user_id', user!.id).single()
    if (data) setWorkerProfile(data)
  }

  const fetchTasks = async () => {
    const [{ data: feed }, { data: mine }] = await Promise.all([
      supabase.from('tasks').select('*, profiles(full_name, avatar_url)').eq('status', 'open').order('created_at', { ascending: false }).limit(20),
      supabase.from('tasks').select('*, profiles(full_name, avatar_url)').eq('worker_id', user!.id).order('created_at', { ascending: false })
    ])
    setFeedTasks(feed || [])
    setMyTasks(mine || [])
  }

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.read).length)
  }

  const acceptTask = async (task: Task) => {
    setAccepting(task.id)
    await supabase.from('tasks').update({ worker_id: user!.id, status: 'in_progress' }).eq('id', task.id)
    await fetchTasks()
    setAccepting(null)
    setTab('my-tasks')
  }

  const toggleOnline = async () => {
    if (!workerProfile) return
    setToggling(true)
    const newStatus = workerProfile.is_online ? 'offline' : 'online'
    await supabase.from('worker_profiles').update({ is_online: !workerProfile.is_online, availability_status: newStatus }).eq('user_id', user!.id)
    setWorkerProfile(p => p ? { ...p, is_online: !p.is_online, availability_status: newStatus } : null)
    setToggling(false)
  }

  const completeTask = async (taskId: string) => {
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId)
    await fetchTasks()
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  if (!workerProfile?.is_approved) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center px-4">
      <div className="max-w-sm text-center bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
          <Clock size={24} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-3">طلبك قيد المراجعة</h2>
        <p className="text-zinc-500 text-sm leading-relaxed">
          فريق أمرني راح يراجع بياناتك ويوافق عليك قريباً. راح تجي لك إشعار فور الموافقة.
        </p>
      </div>
    </div>
  )

  const TABS = [
    { id: 'feed', icon: Zap, label: 'طلبات متاحة' },
    { id: 'my-tasks', icon: Briefcase, label: `طلباتي (${myTasks.filter(t => t.status === 'in_progress').length})` },
    { id: 'chat', icon: MessageSquare, label: 'المحادثات' },
    { id: 'schedule', icon: Calendar, label: 'جدولي' },
    { id: 'profile', icon: User, label: 'بروفايلي' },
  ]

  const STATUS_LABEL: Record<string, string> = {
    open: 'مفتوح', in_progress: 'جاري', completed: 'مكتمل', cancelled: 'ملغي', disputed: 'نزاع'
  }
  const STATUS_COLOR: Record<string, string> = {
    open: 'text-amber-400 bg-amber-500/10',
    in_progress: 'text-blue-400 bg-blue-500/10',
    completed: 'text-emerald-400 bg-emerald-500/10',
    cancelled: 'text-zinc-500 bg-zinc-800',
    disputed: 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="min-h-screen bg-[#080808] pt-14">
      {/* Header */}
      <div className="bg-[#0d0d0d] border-b border-zinc-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold">لوحة العامل</h1>
            <p className="text-xs text-zinc-500">{profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button onClick={() => { setTab('profile'); setUnread(0) }} className="relative">
              <Bell size={20} className="text-zinc-400" />
              {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">{unread}</span>}
            </button>
            {/* Online toggle */}
            <button onClick={toggleOnline} disabled={toggling}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                workerProfile?.is_online ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
              {toggling ? <Loader2 size={14} className="animate-spin" /> : workerProfile?.is_online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {workerProfile?.is_online ? 'أنلاين' : 'أوفلاين'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'الطلبات', value: workerProfile?.total_tasks || 0, icon: Briefcase },
            { label: 'التقييم', value: workerProfile?.rating ? workerProfile.rating.toFixed(1) : '—', icon: Star },
            { label: 'جارية', value: myTasks.filter(t => t.status === 'in_progress').length, icon: TrendingUp },
            { label: 'مكتملة', value: myTasks.filter(t => t.status === 'completed').length, icon: CheckCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-zinc-900/50 rounded-xl p-3 text-center">
              <Icon size={16} className="text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold">{value}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-[#0d0d0d] sticky top-14 z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Feed */}
        {tab === 'feed' && (
          <div className="space-y-3">
            {feedTasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <Zap size={32} className="mx-auto mb-3 opacity-30" />
                <p>ما في طلبات متاحة الحين</p>
                <p className="text-sm mt-1">تفعّل الأنلاين عشان توصلك إشعارات</p>
              </div>
            ) : feedTasks.map(task => (
              <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{task.description}</p>
                  </div>
                  {task.price_suggested && (
                    <span className="text-amber-400 font-bold text-sm mr-3 flex-shrink-0">{task.price_suggested} ريال</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="bg-zinc-800 px-2 py-0.5 rounded-md">{task.category || 'عام'}</span>
                    <span>{task.city}</span>
                    {task.use_ai && <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">AI</span>}
                  </div>
                  <button onClick={() => acceptTask(task)} disabled={accepting === task.id}
                    className="bg-amber-500 text-black text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                    {accepting === task.id ? <Loader2 size={13} className="animate-spin" /> : null}
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
              </div>
            ) : myTasks.map(task => (
              <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{task.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{task.description}</p>
                  </div>
                  {task.price_final && <span className="text-amber-400 font-bold mr-3">{task.price_final} ريال</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedTask(task); setTab('chat') }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm py-2 rounded-lg transition-colors">
                    <MessageSquare size={14} /> محادثة
                  </button>
                  {task.status === 'in_progress' && (
                    <button onClick={() => completeTask(task.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm py-2 rounded-lg transition-colors">
                      <CheckCircle size={14} /> أكمل الطلب
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
                <button onClick={() => setSelectedTask(null)} className="text-sm text-zinc-400 hover:text-white mb-4 flex items-center gap-1">
                  ← رجوع
                </button>
                <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-500 text-sm mb-4">اختر طلب عشان تفتح المحادثة</p>
                {myTasks.filter(t => t.status === 'in_progress').map(task => (
                  <button key={task.id} onClick={() => setSelectedTask(task)}
                    className="w-full bg-[#0d0d0d] border border-zinc-800 rounded-xl p-4 text-right hover:border-zinc-700 transition-all">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{task.profiles?.full_name}</p>
                  </button>
                ))}
                {myTasks.filter(t => t.status === 'in_progress').length === 0 && (
                  <div className="text-center py-16 text-zinc-600">
                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                    <p>ما في محادثات نشطة</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Schedule */}
        {tab === 'schedule' && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
            <h2 className="font-bold mb-4">جدول توفرك</h2>
            {workerProfile?.schedule ? (
              <div className="space-y-2">
                {Object.entries(workerProfile.schedule).map(([day, s]: [string, any]) => (
                  <div key={day} className={`flex items-center justify-between rounded-xl px-4 py-3 ${s.active ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                    <span className={`text-sm font-medium ${s.active ? 'text-white' : 'text-zinc-500'}`}>{day}</span>
                    {s.active ? (
                      <span className="text-xs text-amber-400">{s.from} — {s.to}</span>
                    ) : (
                      <span className="text-xs text-zinc-600">غير متاح</span>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-zinc-500 text-sm">ما في جدول محدد</p>}
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
              <h2 className="font-bold mb-4">بياناتي</h2>
              <div className="space-y-3 text-sm">
                {[
                  ['الاسم', profile?.full_name],
                  ['الجوال', workerProfile?.phone],
                  ['المدينة', workerProfile?.city],
                  ['الجنسية', workerProfile?.nationality],
                  ['الهوية', workerProfile?.id_verified ? '✓ موثقة' : '✗ غير موثقة'],
                  ['الحالة', workerProfile?.is_approved ? '✓ موافق عليه' : '⏳ قيد المراجعة'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center border-b border-zinc-800 pb-2 last:border-0">
                    <span className="text-zinc-500">{k}</span>
                    <span className="font-medium">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
              <h2 className="font-bold mb-3">مهاراتي</h2>
              <div className="flex flex-wrap gap-2">
                {(workerProfile?.skills || []).map(s => (
                  <span key={s} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
              <h2 className="font-bold mb-3">الإشعارات</h2>
              {notifications.length === 0 ? (
                <p className="text-zinc-500 text-sm">ما في إشعارات</p>
              ) : notifications.slice(0, 10).map(n => (
                <div key={n.id} className={`py-3 border-b border-zinc-800 last:border-0 ${!n.read ? 'opacity-100' : 'opacity-60'}`}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
