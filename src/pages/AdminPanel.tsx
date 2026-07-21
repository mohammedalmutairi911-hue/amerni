import { useState, useEffect } from 'react'
import { COMPANY } from '../lib/constants'
import { Users, Briefcase, Shield, CheckCircle, XCircle, Loader2, BarChart3, MessageSquare, RefreshCw, AlertTriangle, Eye, ShieldAlert, Building2, Mail, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { Profile, Task, WorkerProfile } from '../types'
import { getAvatar } from '../lib/supabase'
import { Chat } from '../components/chat/Chat'

type Tab = 'overview' | 'workers' | 'tasks' | 'users' | 'conversations' | 'enterprises' | 'providers'

export function AdminPanel() {
  const { navigate } = useApp()
  const [tab, setTab] = useState<Tab>('overview')
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchErrors, setFetchErrors] = useState<string[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [leadNote, setLeadNote] = useState<Record<string, string>>({})
  const [providers, setProviders] = useState<any[]>([])
  const [overdueLeads, setOverdueLeads] = useState<any[]>([])

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
    const [wRes, tRes, uRes, lRes, pRes, oRes] = await Promise.all([
      supabase.from('worker_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('enterprise_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('enterprise_providers').select('*').order('created_at', { ascending: false }),
      supabase.rpc('get_overdue_enterprise_leads')
    ])
    const errs: string[] = []
    if (wRes.error) { console.error('[Admin] workers:', wRes.error); errs.push('العمال: ' + wRes.error.message) }
    if (tRes.error) { console.error('[Admin] tasks:', tRes.error); errs.push('الطلبات: ' + tRes.error.message) }
    if (uRes.error) { console.error('[Admin] users:', uRes.error); errs.push('المستخدمون: ' + uRes.error.message) }
    setFetchErrors(errs)
    setWorkers(wRes.data || [])
    setTasks(tRes.data || [])
    setUsers(uRes.data || [])
    setLeads(lRes.data || [])
    setProviders(pRes.data || [])
    setOverdueLeads(oRes.data || [])
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

  const approveProvider = async (id: string, approved: boolean) => {
    await supabase.from('enterprise_providers').update({ is_approved: approved }).eq('id', id)
    setProviders(p => p.map(x => x.id === id ? { ...x, is_approved: approved } : x))
  }

  const updateLeadStatus = async (leadId: string, status: string) => {
    await supabase.from('enterprise_leads').update({ status }).eq('id', leadId)
    setLeads(p => p.map(l => l.id === leadId ? { ...l, status } : l))
  }

  const assignProvider = async (leadId: string, providerId: string) => {
    // نربط الطلب بالمزود عبر user_id الخاص به (اللي يقرأه داشبورد المزود)
    const prov = providers.find(p => p.id === providerId)
    if (!prov) return
    await supabase.from('enterprise_leads').update({
      provider_id: prov.user_id,
      matched_provider_id: providerId,
      status: 'matched'
    }).eq('id', leadId)
    setLeads(p => p.map(l => l.id === leadId ? { ...l, provider_id: prov.user_id, matched_provider_id: providerId, status: 'matched' } : l))
    alert('تم ربط الطلب بالمزود: ' + prov.company_name + ' — سيظهر في لوحته فوراً')
  }

  const saveLeadNote = async (leadId: string) => {
    const note = leadNote[leadId] || ''
    await supabase.from('enterprise_leads').update({ notes: note }).eq('id', leadId)
    setLeads(p => p.map(l => l.id === leadId ? { ...l, notes: note } : l))
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
    { id: 'enterprises', icon: Building2, label: `المنشآت (${leads.length})` },
    { id: 'providers', icon: Users, label: `مزودو خدمة (${providers.length})` },
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
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary-500" size={32} />
    </div>
  )

  const NAV_ITEMS = [
    { id: 'overview',      icon: BarChart3,     label: 'نظرة عامة',    badge: 0 },
    { id: 'workers',       icon: Shield,        label: 'العمال',        badge: stats.pending },
    { id: 'tasks',         icon: Briefcase,     label: 'الطلبات',       badge: stats.disputed },
    { id: 'users',         icon: Users,         label: 'المستخدمون',    badge: 0 },
    { id: 'enterprises',   icon: Building2,     label: 'المنشآت',       badge: leads.filter(l=>l.status==='open').length },
    { id: 'conversations', icon: MessageSquare, label: 'المحادثات',     badge: stats.disputed },
    { id: 'providers',     icon: ShieldAlert,   label: 'مزودو الخدمة', badge: providers.filter(p=>!p.is_approved).length },
  ]

  return (
    <div className="min-h-screen flex bg-[#F0F2F5]" dir="rtl">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 bg-white border-l border-slate-200 w-56 flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="text-xl font-black text-primary-700">أمرني</h1>
          <p className="text-xs text-slate-400 mt-0.5">لوحة التحكم الإدارية</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-primary-50 text-primary-700 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              <Icon size={16} className={tab === id ? 'text-primary-600' : 'text-slate-400'} />
              <span className="flex-1 text-right">{label}</span>
              {badge > 0 && (
                <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${tab === id ? 'bg-primary-500 text-white' : 'bg-red-500 text-white'}`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <button onClick={() => navigate('admin-enterprises')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800">
              <Building2 size={16} className="text-slate-400" />
              <span className="flex-1 text-right">إدارة المنشآت</span>
            </button>
          </div>
        </nav>

        {/* Admin Profile */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">م</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">مدير النظام</p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
          </div>
          <button onClick={() => navigate('landing')}
            className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-600 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium">
            <span>→</span> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* ── Top Header ── */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 shadow-sm sticky top-0 z-30">
          <h2 className="font-black text-slate-800 text-lg flex-1">
            {NAV_ITEMS.find(n => n.id === tab)?.label || 'نظرة عامة'}
          </h2>
          {/* Search */}
          <div className="relative hidden md:block">
            <input placeholder="بحث عن وردية أو موظف..." dir="rtl"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-300" />
            <Eye size={15} className="absolute left-3 top-2.5 text-slate-300" />
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={refreshing}
              className="flex items-center gap-1.5 text-sm bg-white text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-colors font-medium">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> تحديث
            </button>
            <button onClick={() => setTab('enterprises' as Tab)}
              className="flex items-center gap-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-xl transition-colors font-bold shadow-sm">
              <Building2 size={14} /> إضافة منشأة
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">

          {fetchErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-red-600 mb-1">⚠️ خطأ في تحميل البيانات:</p>
              {fetchErrors.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
            </div>
          )}

          {/* ══ OVERVIEW ══ */}
          {tab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-black text-slate-900">لوحة الإدارة</h2>
                <p className="text-slate-400 text-sm mt-0.5">نظرة شاملة على أداء المنصة والعمليات الجارية</p>
              </div>

              {/* KPI Row 1 — Workers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'نزاعات مفتوحة',    value: stats.disputed,  icon: AlertTriangle, iconBg: 'bg-red-50',    iconColor: 'text-red-400' },
                  { label: 'بانتظار الموافقة',  value: stats.pending,   icon: Shield,        iconBg: 'bg-amber-50',  iconColor: 'text-amber-400' },
                  { label: 'عمال نشطون',        value: stats.workers,   icon: CheckCircle,   iconBg: 'bg-green-50',  iconColor: 'text-green-500', badge: 'نشط' },
                  { label: 'إجمالي المستخدمين', value: stats.users,     icon: Users,         iconBg: 'bg-blue-50',   iconColor: 'text-blue-500', growth: '+12%' },
                ].map(({ label, value, icon: Icon, iconBg, iconColor, badge, growth }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm card-hover">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                        <Icon size={18} className={iconColor} />
                      </div>
                      <div className="text-left">
                        {badge && <span className="text-xs bg-green-50 text-green-500 border border-green-200 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
                        {growth && <span className="text-xs text-green-500 font-bold">{growth}</span>}
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{value}</p>
                    <p className="text-xs text-slate-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* KPI Row 2 — Tasks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي الطلبات', value: tasks.length,            active: tab === 'tasks' },
                  { label: 'طلبات مكتملة',   value: stats.completed,         },
                  { label: 'طلبات جارية',    value: stats.activeTasks,       },
                  { label: 'طلبات مفتوحة',   value: stats.openTasks,         },
                ].map(({ label, value, active }) => (
                  <div key={label} className={`bg-white border-2 rounded-2xl p-5 shadow-sm cursor-pointer card-hover ${active ? 'border-primary-400' : 'border-slate-200'}`}
                    onClick={() => setTab('tasks')}>
                    <div className="flex items-center gap-2 mb-2">
                      {active && <Briefcase size={14} className="text-primary-400" />}
                      <p className="text-sm text-slate-500 font-medium">{label}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              {/* Bottom: Activity + Financial */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* آخر النشاطات */}
                <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 text-right">آخر النشاطات</h3>
                  <div className="space-y-3">
                    {users.slice(0, 3).map((u, i) => (
                      <div key={u.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i===0?'bg-primary-500':i===1?'bg-slate-600':'bg-red-400'}`}>
                          {u.full_name?.[0] || '؟'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{i===0?'انضمام مستخدم جديد':i===1?'تم تحديث حالة طلب':'تم رفض طلب منشأة'}</p>
                          <p className="text-xs text-slate-400">منذ {i===0?'ساعتين':i===1?'5 ساعات':'8 ساعات'} • {u.full_name || u.email}</p>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-xs text-slate-400 text-center py-4">لا توجد نشاطات</p>}
                  </div>
                  <button className="w-full mt-4 border border-slate-200 text-slate-500 text-xs font-medium py-2 rounded-xl hover:bg-slate-50 transition-colors">
                    مشاهدة السجل الكامل
                  </button>
                </div>

                {/* الملخص المالي */}
                <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <button className="text-xs text-primary-500 hover:underline font-medium">عرض التقارير</button>
                    <h3 className="font-bold text-slate-900">الملخص المالي</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                      { label: 'إجمالي الإيرادات', value: tasks.filter(t=>t.status==='completed').length * 0, unit: 'رس', color: 'text-slate-900' },
                      { label: 'مدفوعات معلقة',    value: tasks.filter(t=>t.status==='in_progress').length * 0, unit: 'رس', color: 'text-slate-900' },
                      { label: 'معدل النجاح',       value: stats.workers > 0 ? Math.round((stats.completed/(tasks.length||1))*100) : 98, unit: '%', color: 'text-green-500' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="border-l border-slate-100 pl-4 last:border-0 text-left">
                        <p className="text-xs text-slate-400 mb-1 text-right">{label}</p>
                        <p className={`text-2xl font-black ${color}`}>{value} <span className="text-sm font-medium">{unit}</span></p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center h-28 text-slate-300">
                    <BarChart3 size={40} className="mb-2 opacity-30" />
                    <p className="text-xs">لا توجد بيانات كافية لعرض الرسم البياني اليوم</p>
                  </div>
                </div>
              </div>

              {/* الطلبات الأخيرة */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">الطلبات الأخيرة</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" dir="rtl">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['رقم الطلب','المنشأة/العميل','التاريخ','الحالة','الإجراء'].map(h => (
                          <th key={h} className="px-5 py-3 text-right text-xs font-bold text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.slice(0,5).map((t, i) => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-700">#{String(400 + i + 1)}</td>
                          <td className="px-5 py-3.5 text-slate-600">{t.title?.slice(0,20) || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString('ar-SA')}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 w-fit ${
                              t.status==='completed'?'bg-green-50 text-green-600 border-green-200':
                              t.status==='in_progress'?'bg-blue-50 text-blue-600 border-blue-200':
                              t.status==='disputed'?'bg-red-50 text-red-500 border-red-200':
                              'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${t.status==='completed'?'bg-green-500':t.status==='in_progress'?'bg-blue-500':t.status==='disputed'?'bg-red-500':'bg-slate-400'}`}/>
                              {t.status==='open'?'مفتوح':t.status==='in_progress'?'جارٍ':t.status==='completed'?'مكتمل':t.status==='disputed'?'نزاع':'—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <button onClick={() => setTab('tasks')} className="text-primary-500 hover:text-primary-700 transition-colors">
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {tasks.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">لا توجد طلبات بعد</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
              {tasks.map(task => (
                <button key={task.id} onClick={() => setSelectedTask(task)}
                  className={`w-full text-right p-3 rounded-xl border transition-all ${
                    selectedTask?.id === task.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate flex-1">{task.title}</p>
                    {task.status === 'disputed' && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400">
                    {task.status === 'disputed' ? '⚠️ نزاع' :
                     task.status === 'pending_confirmation' ? '⏳ بانتظار تأكيد' :
                     task.status === 'in_progress' ? '🔄 جاري' :
                     task.status === 'completed' ? '✅ مكتمل' :
                     task.status === 'open' ? '📬 مفتوح' : task.status}
                  </p>
                </button>
              ))}
              {tasks.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">ما في طلبات بعد</p>
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
                  {['الاسم', 'الدور', 'البريد', 'تاريخ التسجيل', 'إجراء'].map(h => (
                    <th key={h} className="text-right text-xs text-slate-400 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-200/50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                        u.role === 'worker' ? 'bg-primary-100 text-primary-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {u.role === 'admin' ? 'مدير' : u.role === 'worker' ? 'عامل' : 'عميل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <button onClick={async () => {
                          if (!confirm(`حذف ${u.full_name || u.email}؟ هذا الإجراء لا يمكن التراجع عنه.`)) return
                          const { error } = await supabase.rpc('admin_delete_user', { p_user_id: u.id })
                          if (error) {
                            alert('خطأ: ' + error.message)
                          } else {
                            setUsers(prev => prev.filter(x => x.id !== u.id))
                          }
                        }} className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors font-medium">
                          حذف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ENTERPRISES TAB */}
        {tab === 'enterprises' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900">طلبات المنشآت</h2>
              <span className="text-xs text-slate-400">{leads.length} طلب إجمالاً</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
              <span className="text-amber-500 text-lg">💡</span>
              <div>
                <p className="text-sm font-bold text-amber-800">نظام العمولة المؤقت</p>
                <p className="text-xs text-amber-700 leading-relaxed mt-0.5">العمولة الحالية: <strong>١٪ من قيمة العقد</strong> تُحوَّل لـ IBAN: {COMPANY.iban} (بنك البلاد) — ساري حتى إطلاق نظام الاشتراك الشهري</p>
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p>لا يوجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map(lead => (
                  <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-bold text-slate-900">{lead.company_name}</p>
                        <p className="text-sm text-slate-500">{lead.contact_name} — {lead.contact_email}</p>
                        {lead.contact_phone && <p className="text-xs text-slate-400">{lead.contact_phone}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-primary-50 text-primary-600 border border-primary-200 px-2 py-0.5 rounded-full">{lead.category}</span>
                        {lead.company_size && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{lead.company_size} موظف</span>}
                        {lead.budget_range && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{lead.budget_range}</span>}
                        <select
                          value={lead.status}
                          onChange={e => {
                            updateLeadStatus(lead.id, e.target.value)
                            if (e.target.value === 'matched') alert('تذكير: أبلغ مزود الخدمة بعمولة ١٪ من قيمة العقد المستحقة خلال ٧٢ ساعة — IBAN: ' + COMPANY.iban + '')
                          }}
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer outline-none ${
                            lead.status === 'new' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            lead.status === 'reviewing' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            lead.status === 'matched' ? 'bg-green-50 text-green-600 border-green-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                          <option value="new">جديد</option>
                          <option value="reviewing">قيد المراجعة</option>
                          <option value="matched">تمت المطابقة</option>
                          <option value="closed">مغلق</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-xl px-4 py-3">{lead.description}</p>

                    {/* اختيار المزود للمطابقة */}
                    <div className="mb-3 bg-primary-50 border border-primary-200 rounded-xl p-3">
                      <label className="text-xs font-bold text-primary-700 mb-1.5 block">ربط الطلب بمزود خدمة معتمد</label>
                      <div className="flex gap-2">
                        <select
                          defaultValue={lead.matched_provider_id || ''}
                          onChange={e => { if (e.target.value) assignProvider(lead.id, e.target.value) }}
                          className="flex-1 text-xs border border-primary-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                          <option value="">— اختر مزود معتمد —</option>
                          {providers.filter(p => p.is_approved).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.company_name} {p.categories?.includes(lead.category) ? '✓ (متخصص)' : ''}
                            </option>
                          ))}
                        </select>
                        {lead.matched_provider_id && (
                          <span className="text-xs bg-green-100 text-green-600 px-3 py-2 rounded-lg font-bold whitespace-nowrap flex items-center gap-1">
                            <CheckCircle size={12} /> مربوط
                          </span>
                        )}
                      </div>
                      {providers.filter(p => p.is_approved).length === 0 && (
                        <p className="text-xs text-amber-600 mt-1.5">⚠️ لا يوجد مزودون معتمدون بعد — اعتمد مزوداً من تاب "مزودو خدمة"</p>
                      )}
                    </div>

                    <div className="flex gap-2 items-end">
                      <textarea
                        value={leadNote[lead.id] !== undefined ? leadNote[lead.id] : (lead.notes || '')}
                        onChange={e => setLeadNote(p => ({ ...p, [lead.id]: e.target.value }))}
                        placeholder="ملاحظات داخلية..."
                        rows={2}
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none bg-slate-50"
                      />
                      <button
                        onClick={() => saveLeadNote(lead.id)}
                        className="text-xs bg-primary-500 text-white px-3 py-2 rounded-xl hover:bg-primary-600 transition-colors whitespace-nowrap">
                        حفظ
                      </button>
                      <a href={`mailto:${lead.contact_email}?subject=أمرني للمنشآت — طلبك رقم ${lead.id.slice(0,8)}`}
                        className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                        <Mail size={12} /> راسل
                      </a>
                    </div>

                    <p className="text-xs text-slate-400 mt-2">{new Date(lead.created_at).toLocaleString('ar-SA')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROVIDERS TAB */}
        {tab === 'providers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">مزودو الخدمة B2B</h2>
              <span className="text-xs text-slate-400">{providers.length} مزود</span>
            </div>

            {overdueLeads.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-red-700 mb-2">⚠️ طلبات متأخرة أكثر من ٢٤ ساعة ({overdueLeads.length})</p>
                {overdueLeads.map((l: any) => (
                  <div key={l.id} className="text-xs text-red-600 mb-1">
                    {l.company_name} — {l.contact_email} — {new Date(l.created_at).toLocaleString('ar-SA')}
                  </div>
                ))}
              </div>
            )}

            {providers.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>لا يوجد مزودون مسجلون بعد</p>
                <p className="text-xs mt-1">ستظهر الطلبات هنا عند تسجيل مزودي الخدمة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((prov: any) => (
                  <div key={prov.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-bold text-slate-900">{prov.company_name}</p>
                        <p className="text-sm text-slate-500">{prov.contact_name} — {prov.contact_email}</p>
                        {prov.city && <p className="text-xs text-slate-400">{prov.city}</p>}
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${prov.is_approved ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                          {prov.is_approved ? 'معتمد' : 'بانتظار المراجعة'}
                        </span>
                      </div>
                    </div>

                    {prov.categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {prov.categories.map((cat: string) => (
                          <span key={cat} className="text-xs bg-primary-50 text-primary-600 border border-primary-200 px-2 py-0.5 rounded-full">{cat}</span>
                        ))}
                      </div>
                    )}

                    {/* تفاصيل التحقق */}
                    {(() => {
                      let details: any = {}
                      try { details = JSON.parse(prov.description || '{}') } catch {}
                      return (
                        <div className="space-y-2 mb-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {details.provider_type && (
                              <div className="bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-400">النوع: </span>
                                <span className="font-medium">{details.provider_type === 'company' ? '🏢 شركة/مؤسسة' : '👤 فرد مستقل'}</span>
                              </div>
                            )}
                            {details.years_experience && (
                              <div className="bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-400">الخبرة: </span>
                                <span className="font-medium">{details.years_experience} سنوات</span>
                              </div>
                            )}
                            {(details.cr_number || prov.cr_number) && (
                              <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                                <span className="text-blue-500">س.ت: </span>
                                <span className="font-medium font-mono">{details.cr_number || prov.cr_number}</span>
                                {details.cr_expiry && <span className="text-slate-400 mr-1">| ينتهي: {details.cr_expiry}</span>}
                              </div>
                            )}
                            {details.freelance_doc && (
                              <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                                <span className="text-blue-500">وثيقة عمل حر: </span>
                                <span className="font-medium font-mono">{details.freelance_doc}</span>
                              </div>
                            )}
                            {details.vat_number && (
                              <div className="bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-slate-400">الرقم الضريبي: </span>
                                <span className="font-medium font-mono">{details.vat_number}</span>
                              </div>
                            )}
                            {details.certifications && (
                              <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100 col-span-2">
                                <span className="text-green-600">الشهادات: </span>
                                <span className="font-medium">{details.certifications}</span>
                              </div>
                            )}
                            {details.prev_clients && (
                              <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100 col-span-2">
                                <span className="text-green-600">عملاء سابقون: </span>
                                <span className="font-medium">{details.prev_clients}</span>
                              </div>
                            )}
                          </div>
                          {details.bio && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">{details.bio}</p>}
                        </div>
                      )
                    })()}

                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-3">
                      {prov.city && <span>📍 {prov.city}</span>}
                      {prov.linkedin_url && <a href={prov.linkedin_url} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">LinkedIn ↗</a>}
                      {prov.website_url && <a href={prov.website_url} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">الموقع ↗</a>}
                    </div>

                    <div className="flex gap-2">
                      {!prov.is_approved && (
                        <button onClick={() => approveProvider(prov.id, true)}
                          className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-600 transition-colors">
                          ✓ اعتماد
                        </button>
                      )}
                      {prov.is_approved && (
                        <button onClick={() => approveProvider(prov.id, false)}
                          className="text-xs text-amber-600 border border-amber-200 px-3 py-2 rounded-xl hover:bg-amber-50 transition-colors">
                          إلغاء الاعتماد
                        </button>
                      )}
                      <a href={`mailto:${prov.contact_email}`}
                        className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                        <Mail size={12} /> راسل
                      </a>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{new Date(prov.created_at).toLocaleString('ar-SA')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
