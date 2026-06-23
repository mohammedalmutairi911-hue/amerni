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
    
    let ch: any = null
    try {
      ch = supabase.channel('admin-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload: any) => {
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
    } catch (e) {
      console.warn('Realtime not available:', e)
    }
    
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch {}
    
    return () => { try { if (ch) supabase.removeChannel(ch) } catch {} }
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

  const exportCSV = (type: 'users' | 'tasks' | 'workers') => {
    let rows: string[] = []
    if (type === 'users') {
      rows = ['الاسم,الإيميل,الدور,تاريخ التسجيل', ...users.map(u => `${u.full_name},${u.email},${u.role},${new Date(u.created_at).toLocaleDateString('ar-SA')}`)]
    } else if (type === 'tasks') {
      rows = ['العنوان,التصنيف,المدينة,الحالة,التاريخ', ...tasks.map(t => `${t.title},${t.category},${t.city},${t.status},${new Date(t.created_at).toLocaleDateString('ar-SA')}`)]
    } else {
      rows = ['الاسم,المدينة,المهارات,الحالة', ...workers.map(w => [w.full_name, w.city, (w.skills||[]).join('|'), w.is_approved ? 'موافق' : 'منتظر'].join(','))]
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `amerni-${type}-${Date.now()}.csv`; a.click()
  }

  const approveWorker = async (userId: string) => {
    await supabase.rpc('admin_approve_worker', { p_user_id: userId, p_approved: true })
    await fetchAll()
  }

  const rejectWorker = async (userId: string) => {
    await supabase.rpc('admin_approve_worker', { p_user_id: userId, p_approved: false })
    await fetchAll()
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    // الأدمن فقط يقدر يغير status مباشرة — محمي بـ RLS admin check
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
    open: 'text-primary-400 bg-primary-500/10',
    in_progress: 'text-blue-400 bg-blue-500/10',
    completed: 'text-secondary-400 bg-secondary-500/10',
    cancelled: 'text-slate-400 bg-slate-100',
    disputed: 'text-red-400 bg-red-500/10',
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 pt-14 flex items-center justify-center">
      <Loader2 className="animate-spin text-primary-400" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-14" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Shield size={18} className="text-purple-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">لوحة الإدارة</h1>
              <p className="text-xs text-slate-400">أمرني Admin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} disabled={refreshing}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> تحديث
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                📥 تصدير
              </button>
              <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl p-1 hidden group-hover:flex flex-col min-w-[120px] z-10">
                <button onClick={() => exportCSV('users')} className="text-xs px-3 py-2 hover:bg-slate-100 rounded-lg text-right">المستخدمون</button>
                <button onClick={() => exportCSV('tasks')} className="text-xs px-3 py-2 hover:bg-slate-100 rounded-lg text-right">الطلبات</button>
                <button onClick={() => exportCSV('workers')} className="text-xs px-3 py-2 hover:bg-slate-100 rounded-lg text-right">العمال</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all ${
                tab === id ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}>
              <Icon size={14} /> {label}
              {id === 'workers' && stats.pending > 0 && (
                <span className="bg-primary-500 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{stats.pending}</span>
              )}
              {id === 'conversations' && stats.disputed > 0 && (
                <span className="bg-red-500 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{stats.disputed}</span>
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
                { label: 'المستخدمون', value: stats.users, color: 'text-slate-900' },
                { label: 'عمال نشطون', value: stats.workers, color: 'text-secondary-400' },
                { label: 'بانتظار موافقة', value: stats.pending, color: 'text-primary-400' },
                { label: 'طلبات جارية', value: stats.activeTasks, color: 'text-blue-400' },
                { label: 'طلبات مفتوحة', value: stats.openTasks, color: 'text-primary-400' },
                { label: 'طلبات مكتملة', value: stats.completed, color: 'text-secondary-400' },
                { label: 'نزاعات', value: stats.disputed, color: 'text-red-400' },
                { label: 'إجمالي الطلبات', value: tasks.length, color: 'text-slate-900' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className={`text-2xl font-black mb-1 ${color}`}>{value}</div>
                  <div className="text-sm text-slate-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Top cities & categories */}
            {tasks.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold mb-4 text-sm text-slate-500">📍 أكثر المدن نشاطاً</h3>
                  {Object.entries(tasks.reduce((acc: any, t) => { acc[t.city||'غير محدد'] = (acc[t.city||'غير محدد']||0)+1; return acc }, {}))
                    .sort((a:any,b:any) => b[1]-a[1]).slice(0,5).map(([city, count]: any) => (
                    <div key={city} className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-700">{city}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{width: `${Math.round(count/tasks.length*100)}%`}} />
                        </div>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-semibold mb-4 text-sm text-slate-500">📂 أكثر التصنيفات</h3>
                  {Object.entries(tasks.reduce((acc: any, t) => { acc[t.category||'أخرى'] = (acc[t.category||'أخرى']||0)+1; return acc }, {}))
                    .sort((a:any,b:any) => b[1]-a[1]).slice(0,5).map(([cat, count]: any) => (
                    <div key={cat} className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-700">{cat}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary-500 rounded-full" style={{width: `${Math.round(count/tasks.length*100)}%`}} />
                        </div>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending workers alert */}
            {stats.pending > 0 && (
              <div className="bg-primary-950/20 border border-primary-800/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-primary-400" />
                  <h3 className="font-semibold text-primary-300">عمال بانتظار الموافقة ({stats.pending})</h3>
                </div>
                <div className="space-y-2">
                  {workers.filter(w => !w.is_approved).map(w => (
                    <div key={w.id} className="bg-white border border-primary-800/30 rounded-2xl p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={getAvatar(w.full_name)} className="w-12 h-12 rounded-2xl" alt="" />
                          <div>
                            <p className="font-bold text-slate-900">{w.full_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{w.city} · {w.nationality}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => approveWorker(w.user_id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-secondary-500/10 border border-secondary-500/30 text-secondary-400 text-sm font-semibold rounded-xl hover:bg-secondary-500/20 transition-colors">
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
                          <div key={label} className="bg-white rounded-xl p-3">
                            <p className="text-slate-400 mb-1">{label}</p>
                            <p className="text-slate-900 font-medium">{value || '—'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Skills */}
                      {(w.skills || []).length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">المهارات</p>
                          <div className="flex flex-wrap gap-1.5">
                            {w.skills.map(s => (
                              <span key={s} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {w.bio && (
                        <div className="bg-white rounded-xl p-3">
                          <p className="text-xs text-slate-400 mb-1">النبذة</p>
                          <p className="text-sm text-slate-700">{w.bio}</p>
                        </div>
                      )}

                      {/* ID Image */}
                      {w.id_image_url && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">📷 صورة الهوية</p>
                          <a href={w.id_image_url} target="_blank" rel="noreferrer">
                            <img src={w.id_image_url} alt="ID" className="w-full max-h-48 object-contain rounded-xl border border-slate-300 hover:border-primary-500/50 transition-colors" />
                          </a>
                          <p className="text-xs text-slate-400 mt-1">اضغط على الصورة لتكبيرها</p>
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
              <p className="text-center text-slate-400 py-12">ما في عمال مسجلين</p>
            ) : workers.map(w => (
              <div key={w.id} className={`bg-white border rounded-2xl p-5 ${!w.is_approved ? 'border-primary-800/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={getAvatar(w.full_name)} className="w-10 h-10 rounded-xl" alt="" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{w.full_name}</p>
                        {w.is_approved ? (
                          <span className="text-xs text-secondary-400 bg-secondary-500/10 px-2 py-0.5 rounded-full">✓ موافق</span>
                        ) : (
                          <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">⏳ بانتظار</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{w.city} · {w.nationality} · هوية: {w.id_verified ? '✓' : '✗'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(w.skills || []).slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!w.is_approved ? (
                      <>
                        <button onClick={() => approveWorker(w.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-secondary-500/10 border border-secondary-500/30 text-secondary-400 text-xs rounded-lg">
                          <CheckCircle size={12} /> موافقة
                        </button>
                        <button onClick={() => rejectWorker(w.user_id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                          <XCircle size={12} /> رفض
                        </button>
                      </>
                    ) : (
                      <button onClick={() => rejectWorker(w.user_id)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs rounded-lg border border-slate-300">
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
          <div className="space-y-3" dir="rtl">
            {tasks.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm">{task.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {task.city} · {new Date(task.created_at).toLocaleDateString('ar-SA')}
                      {task.price_suggested ? ` · ${task.price_suggested} ريال` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => { setSelectedTask(task); setTab('conversations') }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-lg">
                      <Eye size={11} /> محادثة
                    </button>
                    {task.status === 'disputed' && (
                      <button onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary-500/10 border border-secondary-500/30 text-secondary-400 text-xs rounded-lg">
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
          <div className="grid lg:grid-cols-3 gap-4" dir="rtl">
            {/* قائمة الطلبات - يمين */}
            <div className="lg:col-span-1 space-y-2">
              <p className="text-xs text-slate-400 mb-3">اختر طلباً لمشاهدة المحادثة</p>
              {tasks.filter(t => ['in_progress','disputed','pending_confirmation'].includes(t.status)).map(task => (
                <button key={task.id} onClick={() => setSelectedTask(task)}
                  className={`w-full text-right p-3 rounded-xl border transition-all ${
                    selectedTask?.id === task.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate flex-1">{task.title}</p>
                    {task.status === 'disputed' && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400">{task.status === 'disputed' ? '⚠️ نزاع' : task.status === 'pending_confirmation' ? '⏳ بانتظار تأكيد' : '🔄 جاري'}</p>
                </button>
              ))}
              {tasks.filter(t => ['in_progress','disputed','pending_confirmation'].includes(t.status)).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">ما في محادثات نشطة</p>
              )}
            </div>
            {/* المحادثة - يسار */}
            <div className="lg:col-span-2" dir="rtl">
              {selectedTask ? (
                <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
              ) : (
                <div className="flex items-center justify-center h-80 border border-slate-200 rounded-2xl bg-white text-slate-400">
                  <div className="text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p>اختر محادثة من القائمة</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {['الاسم', 'الدور', 'البريد', 'تاريخ التسجيل'].map(h => (
                    <th key={h} className="text-right text-xs text-slate-400 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-200/50 hover:bg-slate-100/10 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        u.role === 'worker' ? 'bg-primary-500/20 text-primary-400' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {u.role === 'admin' ? 'مدير' : u.role === 'worker' ? 'عامل' : 'عميل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
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
