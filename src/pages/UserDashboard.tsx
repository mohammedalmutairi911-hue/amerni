import { useState, useEffect, useRef } from 'react'
import { Plus, CheckCircle, Clock, Loader2, MessageSquare, Star, DollarSign, AlertCircle, MapPin, Shield, Zap, ShoppingBag, Truck, Package, MoreHorizontal, Bell, Settings, LogOut, Home, List, Wallet, ChevronRight, TrendingUp, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Task } from '../types'
import { NewTaskPage } from './NewTaskPage'
import { Chat } from '../components/chat/Chat'
import { TaskReceipt } from '../components/TaskReceipt'

const STATUS_LABEL: Record<string, string> = {
  open: 'بانتظار مقدم خدمة', in_progress: 'قيد التنفيذ',
  pending_confirmation: 'بانتظار تأكيدك', completed: 'مكتمل',
  cancelled: 'ملغي', disputed: 'نزاع'
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
  { icon: '✨', label: 'أخرى' },
]

const BLOCKED = [/(\+966|00966|05\d{8})/, /[\w.-]+@[\w.-]+\.\w{2,}/, /wa\.me|whatsapp|واتساب|telegram|t\.me/i]

export function UserDashboard() {
  const { user, profile } = useAuth()
  const { navigate } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [workerName, setWorkerName] = useState('')
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [activeSection, setActiveSection] = useState<'dashboard' | 'orders' | 'wallet'>('dashboard')
  const channelRef = useRef<any>(null)

  useEffect(() => { if (user) fetchTasks() }, [user?.id])

  const fetchTasks = async () => {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*')
      .or(`client_id.eq.${user!.id},user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const openTask = async (task: Task) => {
    setSelectedTask(task); setRatingDone(false); setRating(0); setWorkerName('')
    if (task.worker_id) {
      const { data: wp } = await supabase.from('profiles').select('full_name').eq('id', task.worker_id).maybeSingle()
      if (wp?.full_name) setWorkerName(wp.full_name)
    }
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase.channel(`task-${task.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${task.id}` },
        ({ new: u }) => setSelectedTask(u as Task))
      .subscribe()
    channelRef.current = ch
  }

  const confirmPayment = async () => {
    if (!selectedTask || !user) return
    setConfirmingPayment(true)
    const { error } = await supabase.rpc('confirm_task_completion', { p_task_id: selectedTask.id })
    if (error) {
      alert('خطأ: ' + error.message)
      console.error('confirm error full:', error)
    } else {
      setSelectedTask(p => p ? { ...p, status: 'completed' } : null)
      setShowReceipt(true)
      fetchTasks()
    }
    setConfirmingPayment(false)
  }

  const submitRating = async () => {
    if (!rating || !selectedTask?.worker_id) return
    const { error } = await supabase.rpc('rate_worker', { p_task_id: selectedTask.id, p_stars: rating })
    if (!error) setRatingDone(true)
  }

  const activeTasks = tasks.filter(t => ['in_progress', 'pending_confirmation'].includes(t.status))
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const openTasks = tasks.filter(t => t.status === 'open')
  const totalSpent = completedTasks.reduce((s, t) => s + (t.price_final || t.price_suggested || 0), 0)

  if (showNew) return <NewTaskPage onClose={() => { setShowNew(false); fetchTasks() }} />

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )

  // Task detail view
  if (selectedTask) return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => { setSelectedTask(null); if (channelRef.current) supabase.removeChannel(channelRef.current) }}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium">
          ← رجوع
        </button>

        {/* Task Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="font-bold text-xl text-slate-900 flex-1">{selectedTask.title}</h2>
            <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold flex-shrink-0 ${STATUS_COLOR[selectedTask.status]}`}>
              {STATUS_LABEL[selectedTask.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {selectedTask.category && <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">{selectedTask.category}</span>}
            {selectedTask.city && <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full flex items-center gap-1"><MapPin size={10} /> {selectedTask.city}</span>}
            {selectedTask.price_suggested && <span className="bg-primary-50 text-primary-500 border border-primary-200 px-3 py-1.5 rounded-full font-bold">💰 {selectedTask.price_suggested} ر.س</span>}
          </div>
        </div>

        {/* Status cards */}
        {selectedTask.status === 'open' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-blue-500 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-blue-700">جاري البحث عن مقدم خدمة</p>
                <p className="text-xs text-blue-500 mt-0.5">عادةً خلال 5–15 دقيقة — سنشعرك فور القبول</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['⚡', 'طلبك وصل'], ['🔔', 'إشعار فور القبول'], ['💬', 'محادثة تفتح']].map(([e, t]) => (
                <div key={t} className="bg-white rounded-xl p-2.5 border border-blue-100">
                  <div className="text-lg mb-1">{e}</div>
                  <p className="text-xs text-slate-500">{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTask.status === 'in_progress' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-lg">
                {workerName ? workerName[0] : '👷'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-amber-700">{workerName || 'المقدم'} يعمل على طلبك</p>
                <p className="text-xs text-amber-500 mt-0.5">تواصل معه عبر المحادثة أدناه</p>
              </div>
              <div className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-bold">✓ موثق</div>
            </div>
          </div>
        )}

        {/* فاتورة ما بعد الاستلام */}
        {showReceipt && selectedTask && (
          <div className="mb-4">
            <TaskReceipt
              task={selectedTask}
              workerName={workerName}
              onRate={() => { setShowReceipt(false) }}
              onClose={() => { setSelectedTask(null); setShowReceipt(false) }}
            />
          </div>
        )}

        {/* التفاوض على السعر */}
        {selectedTask.status === 'pending_confirmation' && (selectedTask as any).negotiation_status === 'pending' && (selectedTask as any).worker_price_offer && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
            <p className="font-bold text-amber-700 mb-1">💰 مقدم الخدمة اقترح سعراً</p>
            <p className="text-3xl font-black text-amber-600 my-2">{(selectedTask as any).worker_price_offer} ريال</p>
            {(selectedTask as any).price_offer_note && (
              <p className="text-sm text-amber-600 mb-3 bg-amber-100 rounded-xl p-3">{(selectedTask as any).price_offer_note}</p>
            )}
            <div className="flex gap-3">
              <button onClick={async () => {
                const { error } = await supabase.rpc('reject_price', { p_task_id: selectedTask.id })
                if (!error) setSelectedTask(p => p ? { ...p, negotiation_status: 'rejected' } as any : null)
              }} className="flex-1 border-2 border-red-200 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors">
                ❌ رفض
              </button>
              <button onClick={async () => {
                const { error } = await supabase.rpc('accept_price', { p_task_id: selectedTask.id })
                if (!error) {
                  setSelectedTask(p => p ? { ...p, negotiation_status: 'accepted', price_final: (p as any).worker_price_offer } as any : null)
                }
              }} className="flex-1 bg-secondary-500 text-white font-bold py-3 rounded-xl hover:bg-secondary-600 transition-colors">
                ✅ موافق على السعر
              </button>
            </div>
          </div>
        )}

        {selectedTask.status === 'pending_confirmation' && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-4">
            <p className="font-bold text-purple-700 mb-1">المقدم أكمل الطلب — راجع وأكّد</p>
            <p className="text-sm text-purple-500 mb-4">تأكد من استلامك للخدمة قبل الضغط على تأكيد</p>
            <button onClick={confirmPayment} disabled={confirmingPayment}
              className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {confirmingPayment ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              تأكيد استلام الخدمة
            </button>
          </div>
        )}

        {selectedTask.status === 'completed' && (
          <div className="space-y-4 mb-4">
            {/* Invoice / Summary */}
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-500" />
                </div>
                <div>
                  <p className="font-black text-green-700 text-lg">اكتملت الخدمة بنجاح! 🎉</p>
                  <p className="text-green-600 text-xs">شكراً لاستخدامك آمرني</p>
                </div>
              </div>

              {/* Invoice */}
              <div className="bg-white rounded-xl border border-green-100 p-4 mb-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="font-black text-slate-900 text-sm">آمرني</span>
                  <span className="text-xs text-slate-400">{new Date(selectedTask.updated_at || selectedTask.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-900 font-medium truncate flex-1 ml-4">{selectedTask.title}</span>
                    <span className="text-slate-500 text-xs">الخدمة</span>
                  </div>
                  {selectedTask.category && (
                    <div className="flex justify-between">
                      <span className="text-slate-700">{selectedTask.category}</span>
                      <span className="text-slate-500 text-xs">التصنيف</span>
                    </div>
                  )}
                  {selectedTask.city && (
                    <div className="flex justify-between">
                      <span className="text-slate-700">{selectedTask.city}</span>
                      <span className="text-slate-500 text-xs">المنطقة</span>
                    </div>
                  )}
                  {(selectedTask.price_final || selectedTask.price_suggested) && (
                    <>
                      <div className="border-t border-slate-100 pt-2 mt-2" />
                      <div className="flex justify-between">
                        <span className="font-black text-slate-900 text-base">{selectedTask.price_final || selectedTask.price_suggested} ر.س</span>
                        <span className="text-slate-500 text-xs">إجمالي الخدمة</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{((selectedTask.price_final || selectedTask.price_suggested || 0) * 0.02).toFixed(2)} ر.س</span>
                        <span>عمولة المنصة (2%)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rating */}
              {!ratingDone ? (
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2 text-center">قيّم مقدم الخدمة</p>
                  <div className="flex gap-2 mb-3 justify-center">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star size={30} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <button onClick={submitRating}
                      className="w-full bg-amber-400 text-slate-900 font-bold py-2.5 rounded-xl hover:bg-amber-500 transition-colors text-sm">
                      إرسال التقييم ⭐
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-green-600 font-bold text-sm">✅ شكراً على تقييمك!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTask.status === 'in_progress' && (
          <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 leading-relaxed">في حال وجود مشكلة — فريق آمرني سيراجع ويتواصل خلال 24 ساعة</p>
              <button onClick={async () => {
                if (confirm('رفع نزاع؟ سيراجع الفريق المحادثة ويتواصل معك.')) {
                  await supabase.rpc('raise_dispute', { p_task_id: selectedTask.id })
                  setSelectedTask(p => p ? { ...p, status: 'disputed' } : null)
                }
              }} className="flex-shrink-0 text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                رفع نزاع
              </button>
            </div>
          </div>
        )}

        {/* Chat */}
        {['in_progress', 'pending_confirmation', 'completed'].includes(selectedTask.status) && (
          <Chat taskId={selectedTask.id} taskTitle={selectedTask.title} />
        )}
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" dir="rtl">

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col h-screen fixed right-0 border-l border-slate-200 bg-slate-900 w-64 z-50">
        <div className="p-6 border-b border-slate-800">
          <button onClick={() => navigate('landing')} className="text-xl font-black text-amber-400 hover:opacity-80 transition-opacity">آمرني</button>
        </div>

        {/* Profile */}
        <div className="px-4 py-5 flex flex-col items-center border-b border-slate-800">
          <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white font-black text-2xl mb-2 border-2 border-amber-400">
            {profile?.full_name?.[0] || '؟'}
          </div>
          <p className="text-slate-200 font-bold text-sm">{profile?.full_name || 'مرحباً بك'}</p>
          <p className="text-slate-400 text-xs">عميل آمرني المميز</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'dashboard', icon: Home, label: 'لوحة التحكم' },
            { id: 'orders', icon: List, label: 'طلباتي' },
            { id: 'wallet', icon: Wallet, label: 'المحفظة' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveSection(id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                activeSection === id ? 'bg-amber-400 text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button onClick={() => setShowNew(true)}
            className="w-full bg-white text-slate-900 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors text-sm">
            <Plus size={16} /> طلب خدمة جديدة
          </button>
          <button onClick={() => navigate('landing')}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 transition-colors text-sm">
            <LogOut size={15} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:mr-64 pb-20 lg:pb-0">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 bg-slate-900 border-b border-slate-800">
          <button onClick={() => navigate('landing')} className="text-lg font-black text-amber-400 hover:opacity-80 transition-opacity">آمرني</button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNew(true)} className="w-9 h-9 bg-amber-400 text-slate-900 rounded-xl flex items-center justify-center">
              <Plus size={16} />
            </button>
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
              {profile?.full_name?.[0] || '؟'}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-5xl mx-auto">

          {/* Hero */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">مرحباً بك 👋</p>
              <h1 className="text-3xl font-black text-slate-900 leading-tight">
                {profile?.full_name?.split(' ')[0] || 'ملخص نشاطك'}
              </h1>
              <p className="text-slate-500 mt-1">تتبع طلباتك الحالية، ورصيد محفظتك، واكتشف الخدمات الأكثر طلباً اليوم.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 text-center shadow-sm min-w-[140px]">
              <p className="text-xs text-slate-400 mb-1">إجمالي المصروف</p>
              <p className="text-xl font-black text-slate-900">{totalSpent.toLocaleString()} ر.س</p>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* Left col - Active orders */}
            <div className="md:col-span-8 flex flex-col gap-5">

              {/* Active Orders */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900 text-lg">الطلبات النشطة</h3>
                  <button onClick={() => setActiveSection('orders')} className="text-primary-500 text-sm font-semibold hover:underline">عرض الكل</button>
                </div>

                {activeTasks.length === 0 && openTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Zap size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm mb-4">ما في طلبات نشطة</p>
                    <button onClick={() => setShowNew(true)} className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-colors text-sm">
                      طلب خدمة جديدة
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...activeTasks, ...openTasks].slice(0, 3).map(task => (
                      <div key={task.id} className="bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-500/30 transition-all">
                        <button onClick={() => openTask(task)}
                          className="w-full flex items-center justify-between p-4 text-right">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                              task.status === 'in_progress' ? 'bg-amber-100' :
                              task.status === 'pending_confirmation' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              {task.status === 'in_progress' ? '⚡' : task.status === 'pending_confirmation' ? '✅' : '📦'}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 text-sm">{task.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{STATUS_LABEL[task.status]}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-bold flex-shrink-0 ${STATUS_COLOR[task.status]}`}>
                            {STATUS_LABEL[task.status]}
                          </span>
                        </button>
                        {task.status === 'pending_confirmation' && (
                          <div className="px-4 pb-4">
                            <button onClick={async (e) => {
                              e.stopPropagation()
                              setConfirmingPayment(true)
                              const { data, error } = await supabase.rpc('confirm_task_completion', { p_task_id: task.id })
                              if (error) {
                                alert('خطأ: ' + error.message)
                                console.error('confirm error:', error)
                              } else {
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t))
                                alert('✅ تم تأكيد استلام الخدمة!')
                              }
                              setConfirmingPayment(false)
                            }} disabled={confirmingPayment}
                              className="w-full bg-primary-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                              {confirmingPayment ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                              تأكيد استلام الخدمة
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Services */}
              <div className="grid grid-cols-4 gap-3">
                {QUICK_SERVICES.map(({ icon, label }) => (
                  <button key={label} onClick={() => setShowNew(true)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-primary-500/50 hover:shadow-md transition-all group shadow-sm">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
                    <p className="text-xs font-semibold text-slate-700">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right col - History */}
            <div className="md:col-span-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full">
                <h3 className="font-bold text-slate-900 text-lg mb-5">الطلبات السابقة</h3>
                {completedTasks.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">لا توجد طلبات سابقة بعد</p>
                ) : (
                  <div className="space-y-5">
                    {completedTasks.slice(0, 4).map((t, i) => (
                      <div key={t.id} className="flex gap-3 items-start border-r-2 border-slate-100 pr-4 relative cursor-pointer hover:border-amber-400 transition-colors"
                        onClick={() => openTask(t)}>
                        <div className={`absolute -right-1.5 top-0 w-3 h-3 rounded-full ${i === 0 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-slate-300'}`} />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                          {t.price_final && <p className="text-xs text-slate-400 mt-0.5">المبلغ: {t.price_final} ر.س</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="mt-6 w-full border border-slate-200 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                  تنزيل التقرير الشهري
                </button>
              </div>
            </div>
          </div>

          {/* Promo Banner */}
          <div className="mt-6 rounded-2xl overflow-hidden relative min-h-[200px] flex items-center p-8 bg-gradient-to-l from-slate-900 to-primary-500">
            <div className="relative z-10 max-w-lg">
              <span className="inline-block bg-amber-400 text-slate-900 font-black text-xs px-3 py-1 rounded-full mb-4">عرض خاص لك</span>
              <h2 className="text-2xl font-black text-white mb-2">راحتك هي غايتنا</h2>
              <p className="text-white/80 text-sm mb-5">احصل على خصم ٢٠٪ على أول ٣ طلبات توصيل هذا الشهر باستخدام الكود: AMERNI20</p>
              <button onClick={() => setShowNew(true)} className="bg-white text-slate-900 font-bold px-6 py-2.5 rounded-xl hover:bg-amber-400 transition-colors text-sm">
                استخدم العرض الآن
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 right-0 w-full flex justify-around items-center h-16 bg-slate-900 border-t border-slate-800 z-50">
        {[
          { id: 'dashboard', icon: Home, label: 'الرئيسية' },
          { id: 'orders', icon: List, label: 'الطلبات' },
          { id: 'wallet', icon: Wallet, label: 'المحفظة' },
          { id: 'profile', icon: Star, label: 'الحساب' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => id !== 'profile' && setActiveSection(id as any)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
              activeSection === id ? 'text-amber-400' : 'text-slate-500'
            }`}>
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
