import { useState, useEffect } from 'react'
import { Users, Briefcase, Shield, CheckCircle, XCircle, Loader2, BarChart3, MessageSquare, RefreshCw, AlertTriangle, Eye, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Profile, Task, WorkerProfile } from '../types'
import { getAvatar } from '../lib/supabase'
import { Chat } from '../components/chat/Chat'

type Tab = 'overview' | 'workers' | 'tasks' | 'users' | 'conversations'

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAll()
    
    // استمع للإشعارات الجديدة realtime
    const ch = supabase.channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          // إشعار المتصفح
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(payload.new.title || 'أمرني', {
                body: payload.new.body || '',
                icon: '/icon-192.png',
                dir: 'rtl',
                lang: 'ar',
              })
            }
          } catch {}
          fetchAll()
        })
      .subscribe()
    
    // اطلب إذن الإشعارات
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch {}
    
    return () => { supabase.removeChannel(ch) }
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: w }, { data: t }, { data: u }] = await Promise.all([
      supabase.from('worker_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false })
    ])
    setWorkers(w || [])
    setTasks(t || [])
    setUsers(u || [])
    setLoading(false)
  }

  const refresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false) }

  const approveWorker = async (userId: string) => {
    const { error } = await supabase.from('worker_profiles').update({ is_approved: true }).eq('user_id', userId)
    console.log('approve error:', error)
    await fetchAll()
  }

  const rejectWorker = async (userId: string) => {
    await supabase.from('worker_profiles').update({ is_approved: false }).eq('user_id', userId)
    await fetchAll()
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(p => p.map(t => t.id === taskId ? { ...t, status: status as any } : t))
  }

  const stats = {
    users: users.length,
    workers: workers.filter(w => w.is_approved).length,
    pending: workers.filter(w => !w.is_approved).length,
    openTasks: tasks.filter(t => t.status === 'open').length,
    activeTasks: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    disputed: tasks.filter(t => t.status === 'disputed').length,
  }

  const TABS = [
    { id: 'overview', icon: BarChart3, label: 'نظرة عامة' },
    { id: 'workers', icon: Shield, label: `العمال (${stats.pending > 0 ? `${stats.pending} بانتظار` : stats.workers})` },
    { id: 'tasks', icon: Briefcase, label: `الطلبات (${tasks.length})` },
    { id: 'conversations', icon: MessageSquare, label: `المحادثات` },
    { id: 'users', icon: Users, label: `المستخدمون (${users.length})` },
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

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <Loader2 className="animate-spin text-amber-400" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080808] pt-14">
      {/* Header */}
      <div className="bg-[#0d0d0d] border-b border-zinc-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Shield size={18} className="text-purple-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">لوحة الإدارة</h1>
              <p className="text-xs text-zinc-500">أمرني Admin</p>
            </div>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 bg-[#0d0d0d] sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              <Icon size={14} /> {label}
              {id === 'workers' && stats.pending > 0 && (
                <span className="bg-amber-500 text-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{stats.pending}</span>
              )}
              {id === 'conversations' && stats.disputed > 0 && (
                <span className="bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{stats.disputed}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'المستخدمون', value: stats.users, color: 'text-white' },
                { label: 'عمال نشطون', value: stats.workers, color: 'text-emerald-400' },
                { label: 'بانتظار موافقة', value: stats.pending, color: 'text-amber-400' },
                { label: 'طلبات جارية', value: stats.activeTasks, color: 'text-blue-400' },
                { label: 'طلبات مفتوحة', value: stats.openTasks, color: 'text-amber-400' },
                { label: 'طلبات مكتملة', value: stats.completed, color: 'text-emerald-400' },
                { label: 'نزاعات', value: stats.disputed, color: 'text-red-400' },
                { label: 'إجمالي الطلبات', value: tasks.length, color: 'text-white' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-5">
                  <div className={`text-2xl font-black mb-1 ${color}`}>{value}</div>
                  <div className="text-sm text-zinc-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Pending workers alert */}
            {stats.pending > 0 && (
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h3 className="font-semibold text-amber-300">عمال بانتظار الموافقة ({stats.pending})</h3>
                </div>
                <div className="space-y-2">
                  {workers.filter(w => !w.is_approved).map(w => (
                    <div key={w.id} className="bg-[#0d0d0d] border border-amber-800/30 rounded-2xl p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={getAvatar(w.full_name)} className="w-12 h-12 rounded-2xl" alt="" />
                          <div>
                            <p className="font-bold text-white">{w.full_name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{w.city} · {w.nationality}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => approveWorker(w.user_id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-xl hover:bg-emerald-500/20 transition-colors">
                            <CheckCircle size={14} /> موافقة
                          </button>
                          <button onClick={() => rejectWorker(w.user_id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl hover:bg-red-500/20 transition-colors">
                            <XCircle size={14} /> رفض
                          </button>
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {[
                          { label: 'الجوال', value: w.phone },
                          { label: 'رقم الهوية', value: w.id_number },
                          { label: 'الجنسية', value: w.nationality },
                          { label: 'التحقق', value: w.id_verified ? '✅ موثق' : '⏳ لم يتحقق' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-zinc-900 rounded-xl p-3">
                            <p className="text-zinc-500 mb-1">{label}</p>
                            <p className="text-white font-medium">{value || '—'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Skills */}
                      {(w.skills || []).length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-2">المهارات</p>
                          <div className="flex flex-wrap gap-1.5">
                            {w.skills.map(s => (
                              <span key={s} className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {w.bio && (
                        <div className="bg-zinc-900 rounded-xl p-3">
                          <p className="text-xs text-zinc-500 mb-1">النبذة</p>
                          <p className="text-sm text-zinc-300">{w.bio}</p>
                        </div>
                      )}

                      {/* ID Image */}
                      {w.id_image_url && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-2">📷 صورة الهوية</p>
                          <a href={w.id_image_url} target="_blank" rel="noreferrer">
                            <img src={w.id_image_url} alt="ID" className="w-full max-h-48 object-contain rounded-xl border border-zinc-700 hover:border-amber-500/50 transition-colors" />
                          </a>
                          <p className="text-xs text-zinc-600 mt-1">اضغط على الصورة لتكبيرها</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workers */}
        {tab === 'workers' && (
          <div className="space-y-3">
            {workers.length === 0 ? (
              <p className="text-center text-zinc-600 py-12">ما في عمال مسجلين</p>
            ) : workers.map(w => (
              <div key={w.id} className={`bg-[#0d0d0d] border rounded-2xl p-5 ${!w.is_approved ? 'border-amber-800/30' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={getAvatar(w.full_name)} className="w-10 h-10 rounded-xl" alt="" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{w.full_name}</p>
                        {w.is_approved ? (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ موافق</span>
                        ) : (
                          <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⏳ بانتظار</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{w.city} · {w.nationality} · هوية: {w.id_verified ? '✓' : '✗'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(w.skills || []).slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!w.is_approved ? (
                      <>
                        <button onClick={() => approveWorker(w.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
                          <CheckCircle size={12} /> موافقة
                        </button>
                        <button onClick={() => rejectWorker(w.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                          <XCircle size={12} /> رفض
                        </button>
                      </>
                    ) : (
                      <button onClick={() => rejectWorker(w.user_id)}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded-lg border border-zinc-700">
                        سحب الموافقة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="bg-[#0d0d0d] border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm">{task.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {task.city} · {new Date(task.created_at).toLocaleDateString('ar-SA')}
                      {task.price_suggested ? ` · ${task.price_suggested} ريال` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => { setSelectedTask(task); setTab('conversations') }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg">
                      <Eye size={11} /> محادثة
                    </button>
                    {task.status === 'disputed' && (
                      <button onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
                        <CheckCircle size={11} /> حل
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button onClick={() => updateTaskStatus(task.id, 'disputed')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                        <AlertTriangle size={11} /> نزاع
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversations */}
        {tab === 'conversations' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-2">
              <p className="text-xs text-zinc-500 mb-3">اختر طلباً لمشاهدة المحادثة</p>
              {tasks.filter(t => t.status === 'in_progress' || t.status === 'disputed').map(task => (
                <button key={task.id} onClick={() => setSelectedTask(task)}
                  className={`w-full text-right p-3 rounded-xl border transition-all ${
                    selectedTask?.id === task.id ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-[#0d0d0d] hover:border-zinc-700'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate flex-1">{task.title}</p>
                    {task.status === 'disputed' && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-500">{task.status === 'disputed' ? 'نزاع' : 'جاري'}</p>
                </button>
              ))}
              {tasks.filter(t => ['in_progress','disputed'].includes(t.status)).length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-8">ما في محادثات نشطة</p>
              )}
            </div>
            <div className="lg:col-span-2">
              {selectedTask ? (
                <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
              ) : (
                <div className="flex items-center justify-center h-80 border border-zinc-800 rounded-2xl bg-[#0d0d0d] text-zinc-600">
                  <div className="text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p>اختر محادثة</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['الاسم', 'الدور', 'البريد', 'تاريخ التسجيل'].map(h => (
                    <th key={h} className="text-right text-xs text-zinc-600 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/10 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        u.role === 'worker' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {u.role === 'admin' ? 'مدير' : u.role === 'worker' ? 'عامل' : 'عميل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
