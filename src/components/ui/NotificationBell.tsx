import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

interface Notif {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const { navigate } = useApp()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // موضع اللوحة يُحسب من مكان الجرس الفعلي ويُقيَّد داخل الشاشة — الجرس يكون يمين
  // أو يسار حسب الصفحة، والتموضع الثابت (right-0) كان يطلّع اللوحة برّا الشاشة.
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null)

  const unread = notifs.filter(n => !n.read).length

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
    setNotifs(data || [])
  }

  useEffect(() => {
    if (!user) return
    load()
    // realtime: إشعار جديد يظهر فوراً
    // اسم قناة فريد لكل نسخة من المكوّن — لأن <NotificationBell/> يُركّب أكثر من مرة
    // (هيدر سطح المكتب + هيدر الجوال). بدون التفرّد يعيد supabase-js نفس القناة المشتركة
    // فيُرمى الخطأ: "cannot add postgres_changes callbacks after subscribe()" ويسقط الصفحة.
    const ch = supabase.channel(`notif_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifs(p => [payload.new as Notif, ...p]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  // إغلاق عند النقر خارجاً — pointerdown يغطي اللمس والماوس بشكل موثوق
  useEffect(() => {
    const handler = (e: Event) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  // منع تمرير الصفحة الخلفية أثناء فتح اللوحة على الجوال فقط (لا يؤثر على سطح المكتب)
  useEffect(() => {
    if (!open) return
    if (!window.matchMedia('(max-width: 640px)').matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    const place = () => {
      const btn = ref.current?.getBoundingClientRect()
      if (!btn) return
      const vw = window.innerWidth, vh = window.innerHeight, m = 12
      const width = Math.min(320, vw - m * 2)
      let left = vw <= 640
        ? (vw - width) / 2
        : (btn.left + btn.width / 2 < vw / 2 ? btn.left : btn.right - width)
      left = Math.max(m, Math.min(left, vw - width - m))
      const top = btn.bottom + 8
      const maxH = Math.max(200, vh - top - m - (vw <= 1024 ? 80 : 0))
      setPos({ top, left, width, maxH })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])

  const markAllRead = async () => {
    if (!user || unread === 0) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs(p => p.map(n => ({ ...n, read: true })))
  }

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `قبل ${mins} د`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `قبل ${hrs} س`
    return `قبل ${Math.floor(hrs / 24)} يوم`
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        aria-label="الإشعارات"
        className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
        <Bell size={17} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && pos && createPortal(<>
        <div className="fixed inset-0 z-[90] sm:hidden" onClick={() => setOpen(false)} aria-hidden />
        <div ref={panelRef} style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] overflow-hidden flex flex-col" dir="rtl">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800 text-sm">الإشعارات</p>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary-500 flex items-center gap-1 hover:text-primary-700">
                  <Check size={12} /> تعليم الكل مقروء
                </button>
              )}
              <button onClick={() => { setOpen(false); navigate('notification-settings') }}
                aria-label="إعدادات الإشعارات"
                className="text-slate-400 hover:text-slate-700 transition-colors">
                <Settings size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: Math.min(384, pos.maxH - 52) }}>
            {notifs.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">لا توجد إشعارات</p>
            ) : notifs.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 ${!n.read ? 'bg-primary-50/50' : ''}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>}
                    <p className="text-xs text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>, document.body)}
    </div>
  )
}
