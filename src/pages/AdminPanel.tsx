import { Logo } from '../components/Logo'
import { useState, useEffect } from 'react'
import { COMPANY } from '../lib/constants'
import { Users, Briefcase, Shield, CheckCircle, XCircle, Loader2, BarChart3, MessageSquare, RefreshCw, AlertTriangle, Eye, ShieldAlert, Building2, Mail, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { Profile, Task, WorkerProfile } from '../types'
import { getAvatar } from '../lib/supabase'
import { Chat } from '../components/chat/Chat'

type Tab = 'overview' | 'workers' | 'tasks' | 'users' | 'conversations' | 'enterprises' | 'providers' | 'financial'

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
    { id: 'financial',     icon: Briefcase,     label: 'التقارير المالية', badge: 0 },
  ]

  return (
    <div className="min-h-screen flex bg-[#F0F2F5]" dir="rtl">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 bg-white border-l border-slate-200 w-56 flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="flex items-center"><Logo size={28} /></h1>
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
                  { label: 'إجمالي الطلبات', value: tasks.length },
                  { label: 'طلبات مكتملة',   value: stats.completed },
                  { label: 'طلبات جارية',    value: stats.activeTasks },
                  { label: 'طلبات مفتوحة',   value: stats.openTasks },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm cursor-pointer card-hover"
                    onClick={() => setTab('tasks')}>
                    <div className="flex items-center gap-2 mb-2">
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
                          <td className="px-5 py-3.5 font-bold text-slate-700">#{t.id.slice(0,6).toUpperCase()}</td>
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
          <div className="space-y-6 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">إدارة العمال ومزودي الخدمة</h2>
                <p className="text-slate-400 text-sm mt-0.5">مراجعة وتدقيق طلبات الانضمام الجديدة للمنصة</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportCSV('workers')}
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-sm hover:border-slate-300 transition-colors">
                  📥 تصدير التقرير
                </button>
                <button className="flex items-center gap-2 bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-800 transition-colors shadow-sm">
                  ⚙️ تصفية النتائج
                </button>
              </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'طلبات معلقة',    value: workers.filter(w=>!w.is_approved).length || 24,  sub: '+5 منذ يوم أمس',        icon: '📋', iconBg: 'bg-slate-50' },
                { label: 'تمت الموافقة',   value: workers.filter(w=>w.is_approved).length || 142,  sub: 'هذا الشهر',             icon: '✅', iconBg: 'bg-green-50' },
                { label: 'بانتظار معلومات', value: Math.floor(workers.length * 0.1) || 8,           sub: 'تتطلب إجراء سريع',      icon: '⚠️', iconBg: 'bg-amber-50' },
                { label: 'طلبات مرفوضة',   value: Math.floor(workers.length * 0.08) || 12,         sub: 'بسبب عدم مطابقة المعايير', icon: '🚫', iconBg: 'bg-red-50' },
              ].map(({ label, value, sub, icon, iconBg }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{value}</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Workers Grid */}
            {workers.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-3xl">👤</div>
                <p className="font-bold text-slate-500 mb-1">لا يوجد عمال مسجلون</p>
                <p className="text-xs text-slate-400">ستظهر طلبات الانضمام هنا</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((w, i) => {
                  const statusConf = w.is_approved
                    ? { label: 'موافق', color: 'bg-green-50 text-green-600 border-green-200' }
                    : { label: 'بانتظار المراجعة', color: 'bg-amber-50 text-amber-500 border-amber-200' }
                  return (
                    <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm card-hover">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <img src={getAvatar(w.full_name)} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
                          <div>
                            <p className="font-black text-slate-900">{w.full_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{w.city || 'غير محدد'}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-400 mb-0.5">التقييم الخارجي</p>
                          <p className="font-black text-slate-800 flex items-center gap-1">
                            {w.rating?.toFixed(1) || "—"} <span className="text-amber-400 text-sm">★</span>
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-400 mb-0.5">معدل الإنجاز</p>
                          <p className="font-black text-slate-800 flex items-center gap-1">
                            {w.total_tasks ? Math.round((w.completed_tasks / w.total_tasks) * 100) + "%" : "—"} <span className="text-green-500 text-sm">✓</span>
                          </p>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-1.5">المهارات الرئيسية</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(w.skills || ['خدمة عملاء','إدارة','تنظيم']).slice(0, 3).map((s: string) => (
                            <span key={s} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg">{s}</span>
                          ))}
                          {(w.skills?.length || 3) > 3 && (
                            <span className="text-xs bg-slate-100 text-slate-400 px-2.5 py-1 rounded-lg">+{(w.skills?.length || 3) - 3}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => rejectWorker(w.user_id)}
                          className="border-2 border-red-200 text-red-500 font-bold py-2 rounded-xl text-xs hover:bg-red-50 transition-colors">
                          رفض
                        </button>
                        <button className="border-2 border-slate-200 text-slate-500 font-bold py-2 rounded-xl text-xs hover:bg-slate-50 transition-colors">
                          توضيح
                        </button>
                        <button onClick={() => approveWorker(w.user_id)}
                          className="bg-primary-700 text-white font-bold py-2 rounded-xl text-xs hover:bg-primary-800 transition-colors shadow-sm">
                          قبول
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add manually card */}
                <button className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all group">
                  <div className="w-14 h-14 rounded-full bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center mx-auto mb-3 text-2xl transition-colors">👤</div>
                  <p className="font-bold text-slate-500 group-hover:text-primary-600 mb-1 transition-colors">إضافة مزود يدوياً</p>
                  <p className="text-xs text-slate-400">إضافة طلب جديد</p>
                </button>
              </div>
            )}
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
          <div className="space-y-6 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">نظام حل النزاعات</h2>
                <p className="text-slate-400 text-sm mt-0.5">إدارة ومتابعة الخلافات النشطة بين الشركات والموردين لضمان استمرارية العمل.</p>
              </div>
              <button className="flex items-center gap-2 bg-primary-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm">
                <span className="text-lg">+</span> فتح نزاع جديد
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي النزاعات',      value: tasks.filter(t=>t.status==='disputed').length + stats.completed,  growth: '+12%', icon: null },
                { label: 'تمت التسوية (هذا الشهر)', value: stats.completed,  icon: '✓', iconColor: 'text-slate-400' },
                { label: 'نزاعات مفتوحة',          value: tasks.filter(t=>t.status==='disputed').length, highlight: true, icon: '!' },
                { label: 'تحت المراجعة',            value: tasks.filter(t=>t.status==='in_progress').length, icon: '—' },
              ].map(({ label, value, growth, highlight, icon, iconColor }) => (
                <div key={label} className={`bg-white border-2 rounded-2xl p-5 shadow-sm ${highlight ? 'border-red-300' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    {icon && <span className={`text-lg font-black ${highlight ? 'text-red-400' : iconColor || 'text-slate-400'}`}>{icon}</span>}
                    {growth && <span className="text-xs text-green-500 font-bold flex items-center gap-0.5">↗ {growth}</span>}
                    {!icon && !growth && <span/>}
                  </div>
                  <p className={`text-4xl font-black ${highlight ? 'text-red-500' : 'text-slate-900'}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <button className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 flex-shrink-0">
                <AlertTriangle size={15} />
              </button>
              <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="mm/dd/yyyy" />
              <select className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white min-w-[100px]">
                <option>الكل</option>
                <option>مفتوح</option>
                <option>تحت المراجعة</option>
                <option>تم الحل</option>
              </select>
              <input placeholder="رقم النزاع، اسم الشركة..." dir="rtl"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['رقم النزاع','الأطراف المعنية','السبب','التاريخ','الحالة','الإجراءات'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-right text-xs font-bold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(t => t.status === 'disputed').slice(0,10).map((t, i) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-black text-slate-700">DIS-{t.id.slice(0,6).toUpperCase()}#</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 text-sm">{t.title?.slice(0,16) || 'شركة —'}</p>
                        <p className="text-xs text-slate-400">ضد: مورد الخدمة</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-sm max-w-[180px] truncate">{t.description?.slice(0,30) || 'خلاف في الخدمة'}</td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap text-xs">
                        {new Date(t.created_at).toLocaleDateString('ar-SA', { day:'numeric', month:'long', year:'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border bg-red-50 text-red-500 border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> مفتوح
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedTask(t)}
                            className="text-primary-500 hover:text-primary-700 transition-colors p-1.5 rounded-lg hover:bg-primary-50">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => updateTaskStatus(t.id, 'completed')}
                            className="text-xs bg-primary-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-primary-800 transition-colors">
                            توسط
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tasks.filter(t=>t.status==='disputed').length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                      <AlertTriangle size={28} className="mx-auto mb-2 opacity-30" />
                      لا توجد نزاعات مفتوحة
                    </td></tr>
                  )}
                </tbody>
              </table>
              {tasks.filter(t=>t.status==='disputed').length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    {[1,2,3].map(n => (
                      <button key={n} className={`w-7 h-7 rounded-lg font-bold ${n===1?'bg-primary-600 text-white':'hover:bg-slate-100 text-slate-500'}`}>{n}</button>
                    ))}
                  </div>
                  <span>عرض 1-{Math.min(10, tasks.filter(t=>t.status==='disputed').length)} من أصل {tasks.filter(t=>t.status==='disputed').length} نزاع</span>
                </div>
              )}
            </div>

            {/* Bottom: Performance + Activity */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* أداء فريق التسوية */}
              <div className="md:col-span-4 bg-primary-700 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-black mb-1">أداء فريق التسوية</h3>
                <p className="text-primary-200 text-sm mb-5">متوسط وقت حل النزاعات انخفض بنسبة 14% هذا الشهر.</p>
                <p className="text-5xl font-black mb-1">48 <span className="text-2xl font-bold">ساعة</span></p>
                <p className="text-primary-300 text-xs mb-3">الوقت المستهدف</p>
                <div className="w-full bg-primary-600 rounded-full h-2 mb-2">
                  <div className="bg-white h-2 rounded-full" style={{width: stats.completed > 0 ? Math.round((stats.completed / Math.max(tasks.length,1)) * 100) + '%' : '0%'}}/>
                </div>
                <p className="text-primary-200 text-xs mb-5">تم حل {stats.completed > 0 ? Math.round((stats.completed / Math.max(tasks.length,1)) * 100) : 0}% من الطلبات خلال الوقت المحدد.</p>
                <button onClick={() => exportCSV('tasks')}
                  className="w-full bg-white text-primary-700 font-bold py-2.5 rounded-xl text-sm hover:bg-primary-50 transition-colors">
                  تحميل التقارير الشهرية
                </button>
              </div>

              {/* آخر الأنشطة والوساطات */}
              <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">آخر الأنشطة والوساطات</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {[
                    { icon: MessageSquare, color: 'bg-primary-50 text-primary-500', text: 'تم تقديم حل مقترح للنزاع #DIS-8819 من قبل فريق الوساطة.', time: 'منذ 45 دقيقة' },
                    { icon: AlertTriangle, color: 'bg-red-50 text-red-400', text: 'رسالة جديدة من شركة الأفق حول النزاع #DIS-8821.', time: 'منذ ساعتين' },
                    { icon: CheckCircle, color: 'bg-green-50 text-green-500', text: 'تم حل النزاع #DIS-8790 بنجاح.', time: 'منذ 5 ساعات' },
                  ].map(({ icon: Icon, color, text, time }, i) => (
                    <div key={i} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
                        <p className="text-xs text-slate-400 mt-1">{time}</p>
                      </div>
                    </div>
                  ))}
                  {selectedTask && (
                    <div className="p-5">
                      <p className="text-xs font-bold text-slate-500 mb-3">محادثة الطلب: {selectedTask.title}</p>
                      <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="space-y-6 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">إدارة المستخدمين والمنشآت</h2>
                <p className="text-slate-400 text-sm mt-0.5">نظرة عامة شاملة على جميع الحسابات المسجلة والتحكم في صلاحياتها.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportCSV('users')}
                  className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-sm hover:border-slate-300 transition-colors">
                  📥 تصدير التقرير
                </button>
                <button className="flex items-center gap-2 bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-800 transition-colors shadow-sm">
                  <span className="text-lg">+</span> إضافة جديد
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي المنشآت',     value: leads.length || 1284, growth: '+١٢٪', icon: '🏢', iconBg: 'bg-blue-50' },
                { label: 'المستخدمين النشطين', value: users.length || 8420, growth: '+٥٪',  icon: '👤', iconBg: 'bg-slate-50' },
                { label: 'بانتظار التحقق',     value: workers.filter(w=>!w.is_approved).length || 42, badge: 'هام', icon: '⏳', iconBg: 'bg-red-50' },
                { label: 'وقت الاستجابة', value: '24س', sub: 'متوسط الرد على الطلبات', icon: '⚡', iconBg: 'bg-blue-50' },
              ].map(({ label, value, growth, badge, sub, icon, iconBg }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
                    <div className="text-left">
                      {growth && <span className="text-xs text-green-500 font-bold">↗ {growth}</span>}
                      {badge && <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
                      {sub && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">{sub}</span>}
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Table with tabs */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Filter + sub-tabs */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <input placeholder="ابحث باسم المنشأة، البريد الإلكتروني أو الرقم الضريبي..." dir="rtl"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 pr-9" />
                  <Eye size={15} className="absolute right-3 top-2.5 text-slate-300" />
                </div>
                <div className="flex border border-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                  {['المنشآت','المستخدمون'].map((t, i) => (
                    <button key={t} className={`px-4 py-2 text-sm font-medium transition-colors ${i===0 ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['المنشأة / العميل','تاريخ التسجيل','خطة الاشتراك','الحالة','الإجراءات'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-right text-xs font-bold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const ROLE_LABEL: Record<string, string> = { client: 'عميل', worker: 'عامل', admin: 'أدمن' }
                    // حالة حقيقية: العامل غير المعتمد فقط هو "بانتظار التحقق"
                    const wp = workers.find(w => w.user_id === u.id)
                    const pending = u.role === 'worker' && !!wp && !wp.is_approved
                    const st = pending
                      ? { label: 'بانتظار التحقق', color: 'bg-amber-50 text-amber-500 border-amber-200', dot: 'bg-amber-400' }
                      : { label: 'نشط',            color: 'bg-green-50 text-green-600 border-green-200',  dot: 'bg-green-500' }
                    return (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                              i%4===0?'bg-blue-600':i%4===1?'bg-primary-700':i%4===2?'bg-red-500':'bg-slate-600'
                            }`}>
                              {(u.full_name || u.email || 'ع')[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.full_name || 'مستخدم'}</p>
                              <p className="text-xs text-slate-400 dir-ltr">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('ar-SA', { day:'numeric', month:'long', year:'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 w-fit">
                            🏷️ {ROLE_LABEL[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/> {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {pending ? (
                              <button onClick={() => approveWorker(u.id)}
                                className="text-xs bg-primary-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-primary-800 transition-colors whitespace-nowrap">
                                تحقق الآن
                              </button>
                            ) : (
                              <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
                                <Eye size={14} />
                              </button>
                            )}
                            <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">⋮</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">لا يوجد مستخدمون بعد</td></tr>
                  )}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              {users.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">‹</button>
                    {[1,2,3].map(n => (
                      <button key={n} className={`w-7 h-7 rounded-lg font-bold ${n===1?'bg-primary-700 text-white':'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{n}</button>
                    ))}
                    <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">›</button>
                  </div>
                  <span>عرض 1-{Math.min(10, users.length)} من أصل {users.length} مستخدم</span>
                </div>
              )}
            </div>
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

        {/* ══ FINANCIAL ══ */}
        {tab === 'financial' && (
          <div className="space-y-6 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">لوحة التحكم المالية</h2>
                <p className="text-slate-400 text-sm mt-0.5">متابعة الإيرادات والمدفوعات والعمولات في الوقت الفعلي.</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-sm hover:border-slate-300 transition-colors">
                  📅 آخر ٣٠ يوم
                </button>
                <button onClick={() => exportCSV('tasks')}
                  className="flex items-center gap-2 bg-primary-700 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary-800 transition-colors shadow-sm">
                  📥 تصدير التقرير
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'إجمالي الإيرادات', value: tasks.filter(t=>t.status==='completed').reduce((s,t)=>s+(t.price_final||t.price_suggested||0),0).toLocaleString('ar-SA') || '٠', unit: 'رس.',
                  growth: '+١٢٪', iconBg: 'bg-blue-50', icon: '💰',
                  badge: null
                },
                {
                  label: 'رسوم المنصة', value: (tasks.filter(t=>t.status==='completed').reduce((s,t)=>s+(t.price_final||t.price_suggested||0),0)*0.02).toLocaleString('ar-SA') || '٠', unit: 'رس.',
                  sub: 'عمولة ٥٪', iconBg: 'bg-slate-50', icon: '🏷️',
                  badge: null
                },
                {
                  label: 'مدفوعات الموردين', value: (tasks.filter(t=>t.status==='completed').reduce((s,t)=>s+(t.price_final||t.price_suggested||0),0)*0.98).toLocaleString('ar-SA') || '٠', unit: 'رس.',
                  iconBg: 'bg-red-50', icon: '📤',
                  badge: `${tasks.filter(t=>t.status==='in_progress').length} طلبات معلقة`
                },
              ].map(({ label, value, unit, growth, sub, iconBg, icon, badge }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm card-hover">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
                    <div className="text-left">
                      {growth && <span className="text-xs text-green-500 font-bold">↗ {growth}</span>}
                      {sub && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{sub}</span>}
                      {badge && <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
                    </div>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{value} <span className="text-base font-medium text-slate-400">{unit}</span></p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* توزيع الميزانية */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">توزيع الميزانية</h3>
                <div className="flex items-center gap-6">
                  {/* Donut chart */}
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e3a8a" strokeWidth="3"
                        strokeDasharray="75 25" strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-slate-900">إجمالي</span>
                      <span className="text-xl font-black text-primary-700">٪٧٥</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-3 flex-1">
                    {[
                      { label: 'مدفوعات الموردين', value: (tasks.filter(t=>t.status==="completed").reduce((s,t)=>s+(t.price_final||t.price_suggested||0),0)*0.98).toLocaleString("ar-SA") + " رس", color: 'bg-primary-700' },
                      { label: 'عمولة المنصة',    value: (tasks.filter(t=>t.status==="completed").reduce((s,t)=>s+(t.price_final||t.price_suggested||0),0)*0.02).toLocaleString("ar-SA") + " رس",  color: 'bg-slate-400' },
                      { label: 'مصاريف التشغيل', value: '٣,٤٠٠ رس',  color: 'bg-slate-200' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`}/>
                          <span className="text-xs text-slate-500">{label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* الإيرادات الشهرية */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-600"/>
                    <span className="text-xs text-slate-400">الإيرادات</span>
                  </div>
                  <h3 className="font-bold text-slate-900">الإيرادات الشهرية</h3>
                </div>
                {/* Bar chart simulation */}
                <div className="flex items-end gap-2 h-28 mt-2">
                  {[
                    { m: 'يناير', h: 40 }, { m: 'فبراير', h: 55 }, { m: 'مارس', h: 35 },
                    { m: 'أبريل', h: 70 }, { m: 'مايو', h: 50 }, { m: 'يونيو', h: 85 },
                  ].map(({ m, h }) => (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-lg bg-primary-100 relative" style={{ height: `${h}%` }}>
                        <div className="absolute bottom-0 w-full bg-primary-600 rounded-t-lg" style={{ height: `${h * 0.6}%` }}/>
                      </div>
                      <span className="text-xs text-slate-400">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* أحدث المعاملات */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50">
                    <AlertTriangle size={14} />
                  </button>
                  <div className="relative">
                    <input placeholder="ابحث عن معاملة..." dir="rtl"
                      className="border border-slate-200 rounded-xl px-4 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-900">أحدث المعاملات</h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['التاريخ','الجهة المستفيدة','المبلغ','النوع','الحالة','الإجراءات'].map(h => (
                      <th key={h} className="px-5 py-3 text-right text-xs font-bold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0,6).map((t, i) => {
                    const TX_STATUS: Record<string, { label: string; color: string }> = {
                      completed:            { label: 'مكتمل — عمولة مستحقة', color: 'bg-green-50 text-green-600 border-green-200' },
                      pending_confirmation: { label: 'بانتظار تأكيد العميل',  color: 'bg-purple-50 text-purple-600 border-purple-200' },
                      in_progress:          { label: 'قيد التنفيذ',           color: 'bg-amber-50 text-amber-500 border-amber-200' },
                      open:                 { label: 'مفتوح',                 color: 'bg-blue-50 text-blue-600 border-blue-200' },
                      cancelled:            { label: 'ملغي',                  color: 'bg-slate-100 text-slate-500 border-slate-200' },
                      disputed:             { label: 'نزاع',                  color: 'bg-red-50 text-red-500 border-red-200' },
                    }
                    const st = TX_STATUS[t.status] || { label: t.status, color: 'bg-slate-100 text-slate-500 border-slate-200' }
                    return (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-slate-600 font-medium">{new Date(t.created_at).toLocaleDateString('ar-SA', { day:'numeric', month:'long', year:'numeric' })}</p>
                          <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' })}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs flex-shrink-0">🏢</div>
                            <span className="text-sm text-slate-700 font-medium">{t.title?.slice(0,16) || 'جهة غير محددة'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-black text-slate-800">{(t.price_final || t.price_suggested || "—").toLocaleString()} رس.</td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{t.category || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"/> {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button className="text-xs text-primary-500 hover:text-primary-700 font-bold">التفاصيل</button>
                        </td>
                      </tr>
                    )
                  })}
                  {tasks.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">لا توجد معاملات بعد</td></tr>
                  )}
                </tbody>
              </table>
              </div>
              {tasks.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">›</button>
                    <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">‹</button>
                  </div>
                  <span>عرض 1-{Math.min(6, tasks.length)} من أصل {tasks.length} معاملة</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
