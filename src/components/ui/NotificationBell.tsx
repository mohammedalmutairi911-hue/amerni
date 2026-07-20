import { useState, useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Notif {
  id: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    const ch = supabase.channel(`notif_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifs(p => [payload.new as Notif, ...p]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  // إغلاق عند النقر خارجاً
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden" dir="rtl">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="font-bold text-slate-800 text-sm">الإشعارات</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-500 flex items-center gap-1 hover:text-primary-700">
                <Check size={12} /> تعليم الكل مقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
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
      )}
    </div>
  )
}
